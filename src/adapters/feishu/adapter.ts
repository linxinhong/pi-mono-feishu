/**
 * Feishu 平台适配器
 */

import type { PlatformAdapter } from "../../core/platform/adapter.js";
import type {
	UniversalMessage,
	UserInfo,
	ChannelInfo,
} from "../../core/platform/message.js";
import type { PlatformContext } from "../../core/platform/context.js";
import type {
	FeishuAdapterConfig,
	FeishuAccountConfig,
	FeishuMessageEvent,
	MessageContext,
} from "./types.js";
import { LarkClient } from "./client/lark-client.js";
import { getLarkAccount, getEnabledLarkAccounts } from "./client/accounts.js";
import { MessageHandler, createMessageHandler } from "./messaging/inbound/handler.js";
import { FeishuMonitor, createFeishuMonitor } from "./channel/monitor.js";
import { sendMessage, sendCard, updateCard } from "./messaging/outbound/send.js";
import { StreamingCardManager } from "./messaging/outbound/card.js";
import { FeishuPlatformContext } from "./context.js";

// ============================================================================
// FeishuAdapter
// ============================================================================

export class FeishuAdapter implements PlatformAdapter {
	readonly platform = "feishu";

	private config!: FeishuAdapterConfig;
	private clients: Map<string, LarkClient> = new Map();
	private messageHandlers: Map<string, MessageHandler> = new Map();
	private monitors: Map<string, FeishuMonitor> = new Map();
	private cardManagers: Map<string, StreamingCardManager> = new Map();
	private abortController?: AbortController;
	private messageCallback?: (message: UniversalMessage) => void;
	private runningChannels: Map<string, () => void> = new Map();

	async initialize(config: Record<string, any>): Promise<void> {
		this.config = config as FeishuAdapterConfig;
	}

	async start(): Promise<void> {
		const accounts = getEnabledLarkAccounts(this.config);
		if (accounts.length === 0) {
			console.warn("[FeishuAdapter] No enabled accounts found");
			return
		}

		this.abortController = new AbortController()

		for (const account of accounts) {
			await this.startAccount(account)
		}
	}

	private async startAccount(account: FeishuAccountConfig): Promise<void> {
		const larkAccount = getLarkAccount(this.config, account.accountId)
		const client = LarkClient.fromAccount(larkAccount)

		// 探测 Bot 身份
		const probeResult = await client.probe()
		if (!probeResult.ok) {
			console.error(
				`[FeishuAdapter] Failed to probe bot identity for ${account.accountId}: ${probeResult.error}`
			)
			return
		}

		console.log(
			`[FeishuAdapter] Bot identity: ${probeResult.botName} (${probeResult.botOpenId})`
		)

		this.clients.set(account.accountId, client)

		// 创建消息处理器
		const handler = createMessageHandler({
			botOpenId: client.botOpenId,
			dmPolicy: account.dmPolicy,
			groupPolicy: account.groupPolicy,
		})
		this.messageHandlers.set(account.accountId, handler)

		// 创建并启动监控器
		const monitor = createFeishuMonitor({
			client,
			abortSignal: this.abortController?.signal,
			callbacks: {
				onMessage: async (event: FeishuMessageEvent) => {
					await this.handleMessage(account.accountId, event)
				},
				onConnectionChange: (connected: boolean) => {
					console.log(
						`[FeishuAdapter] Account ${account.accountId} connection: ${connected ? "connected" : "disconnected"}`
					)
				},
				onError: (error: Error) => {
					console.error(
						`[FeishuAdapter] Account ${account.accountId} error:`,
						error
					)
				},
			},
		})

		this.monitors.set(account.accountId, monitor)
		await monitor.start()
	}

	private async handleMessage(
		accountId: string,
		event: FeishuMessageEvent
	): Promise<void> {
		const handler = this.messageHandlers.get(accountId)
		if (!handler) return

		await handler.handle(event, async (message: UniversalMessage) => {
			if (this.messageCallback) {
				this.messageCallback(message)
			}
		})
	}

	async stop(): Promise<void> {
		this.abortController?.abort()

		for (const monitor of this.monitors.values()) {
			monitor.stop()
		}
		this.monitors.clear()

		for (const client of this.clients.values()) {
			client.disconnect()
		}
		this.clients.clear()

		for (const handler of this.messageHandlers.values()) {
			handler.dispose()
		}
		this.messageHandlers.clear()

		this.runningChannels.clear()
	}

	async sendMessage(response: { chatId: string; text: string }): Promise<string | undefined> {
		const client = this.getFirstClient()
		if (!client) return undefined

		return await sendMessage(client.getClient(), response)
	}

	async updateMessage(messageId: string, content: string): Promise<void> {
		const client = this.getFirstClient()
		if (!client) return

		await updateCard(client.getClient(), messageId, JSON.parse(content))
	}

	async deleteMessage(_messageId: string): Promise<void> {
		// 飞书不支持删除消息
	}

	async uploadFile(_filePath: string, _chatId: string): Promise<void> {
		// TODO: 实现文件上传
	}

	async uploadImage(_imagePath: string): Promise<string | undefined> {
		return undefined
	}

	async sendImage(_chatId: string, _imageKey: string): Promise<string | undefined> {
		return undefined
	}

	async sendVoiceMessage(_chatId: string, _filePath: string): Promise<string | undefined> {
		return undefined
	}

	async postInThread(_chatId: string, _parentMessageId: string, _text: string): Promise<string | undefined> {
		return undefined
	}

	onMessage(callback: (message: UniversalMessage) => void): void {
		this.messageCallback = callback
	}

	// ============================================================================
	// PlatformAdapter 接口实现
	// ============================================================================

	async getUserInfo(userId: string): Promise<UserInfo | undefined> {
		const client = this.getFirstClient()
		if (!client) return undefined

		try {
			const result = await client.getClient().contact.user.get({
				path: { user_id: userId },
				params: { user_id_type: "open_id" }
			})

			if (result.data?.user) {
				return {
					id: userId,
					userName: result.data.user.name ?? userId,
					displayName: result.data.user.name ?? userId,
				}
			}
		} catch {
			return undefined
		}
	}

	async getChannelInfo(channelId: string): Promise<ChannelInfo | undefined> {
		const client = this.getFirstClient()
		if (!client) return undefined

		try {
			const result = await client.getClient().im.chat.get({
				path: { chat_id: channelId }
			})

			if (result.data?.chat) {
				return {
					id: channelId,
					name: result.data.chat.name ?? channelId,
				}
			}
		} catch {
			return undefined
		}
	}

	async createChannelContext(chatId: string): Promise<PlatformContext> {
		const client = this.getFirstClient()
		if (!client) {
			throw new Error("No client available")
		}

		return new FeishuPlatformContext({
			client,
			chatId,
			adapter: this,
		})
	}

	private getFirstClient(): LarkClient | undefined {
		return this.clients.values().next().value
	}

	// ============================================================================
	// 流式卡片支持
	// ============================================================================

	/**
	 * 开始流式卡片
	 */
	async startStreamingCard(chatId: string): Promise<string | undefined> {
		const manager = this.getCardManager(chatId)
		const result = await manager.start(async (card) => {
			return await sendCard(this.getFirstClient()!.getClient(), chatId, card)
		})
		return result.messageId
	}

	/**
	 * 更新流式卡片
	 */
	async updateStreamingCard(
		messageId: string,
		text: string,
		options?: {
			toolCalls?: { name: string; status: string }[]
			reasoningText?: string
		}
	): Promise<void> {
		const manager = this.getCardManager("")
		await manager.update(
			async (card) => {
				await updateCard(this.getFirstClient()!.getClient(), messageId, card)
			},
			text,
			{
				toolCalls: options?.toolCalls,
				reasoningText: options?.reasoningText,
			}
		)
	}

	/**
	 * 完成流式卡片
	 */
	async completeStreamingCard(
		messageId: string,
		text: string,
		options?: {
			toolCalls?: { name: string; status: string }[]
			isError?: boolean
			isAborted?: boolean
			reasoningText?: string
			reasoningElapsedMs?: number
			footer?: { status?: boolean; elapsed?: boolean }
		}
	): Promise<void> {
		const manager = this.getCardManager("")
		await manager.complete(
			async (card) => {
				await updateCard(this.getFirstClient()!.getClient(), messageId, card)
			},
			text,
			{
				toolCalls: options?.toolCalls,
				isError: options?.isError,
				isAborted: options?.isAborted,
				reasoningText: options?.reasoningText,
				reasoningElapsedMs: options?.reasoningElapsedMs,
				footer: options?.footer,
			}
		)
	}

	private getCardManager(chatId: string): StreamingCardManager {
		let manager = this.cardManagers.get(chatId)
		if (!manager) {
			manager = new StreamingCardManager()
			this.cardManagers.set(chatId, manager)
		}
		return manager
	}
}
