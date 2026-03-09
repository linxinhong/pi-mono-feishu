/**
 * Feishu 平台适配器
 */

import type { PlatformAdapter } from "../../core/platform/adapter.js";
import type {
	UniversalMessage,
	UniversalResponse,
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
import {
	sendMessage,
	sendCard,
	updateCard,
	sendImage,
	uploadImage,
	buildMarkdownCard,
} from "./messaging/outbound/send.js";
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
			return;
		}

		this.abortController = new AbortController();

		for (const account of accounts) {
			await this.startAccount(account);
		}
	}

	private async startAccount(account: FeishuAccountConfig): Promise<void> {
		const larkAccount = getLarkAccount(this.config, account.accountId);
		const client = LarkClient.fromAccount(larkAccount);

		// 探测 Bot 身份
		const probeResult = await client.probe();
		if (!probeResult.ok) {
			console.error(
				`[FeishuAdapter] Failed to probe bot identity for ${account.accountId}: ${probeResult.error}`
			);
			return;
		}

		console.log(
			`[FeishuAdapter] Bot identity: ${probeResult.botName} (${probeResult.botOpenId})`
		);

		this.clients.set(account.accountId, client);

		// 创建消息处理器
		const handler = createMessageHandler({
			botOpenId: client.botOpenId,
			dmPolicy: account.dmPolicy,
			groupPolicy: account.groupPolicy,
		});
		this.messageHandlers.set(account.accountId, handler);

		// 创建并启动监控器
		const monitor = createFeishuMonitor({
			client,
			abortSignal: this.abortController?.signal,
			callbacks: {
				onMessage: async (event: FeishuMessageEvent) => {
					await this.handleMessage(account.accountId, event);
				},
				onConnectionChange: (connected: boolean) => {
					console.log(
						`[FeishuAdapter] Account ${account.accountId} connection: ${connected ? "connected" : "disconnected"}`
					);
				},
				onError: (error: Error) => {
					console.error(
						`[FeishuAdapter] Account ${account.accountId} error:`,
						error
					);
				},
			},
		});

		this.monitors.set(account.accountId, monitor);
		await monitor.start();
	}

	private async handleMessage(
		accountId: string,
		event: FeishuMessageEvent
	): Promise<void> {
		const handler = this.messageHandlers.get(accountId);
		if (!handler) return;

		await handler.handle(event, async (message: UniversalMessage) => {
			if (this.messageCallback) {
				this.messageCallback(message);
			}
		});
	}

	async stop(): Promise<void> {
		this.abortController?.abort();

		for (const monitor of this.monitors.values()) {
			monitor.stop();
		}
		this.monitors.clear();

		for (const client of this.clients.values()) {
			client.disconnect();
		}
		this.clients.clear();

		for (const handler of this.messageHandlers.values()) {
			handler.dispose();
		}
		this.messageHandlers.clear();

		this.runningChannels.clear();
	}

	async sendMessage(response: UniversalResponse): Promise<void> {
		const client = this.getFirstClient();
		if (!client) return;

		if (response.type === "card") {
			await sendCard(client, {
				to: response.messageId || "",
				card: response.content as any,
			});
		} else if (response.type === "image" && response.imageKey) {
			await sendImage(client, {
				to: response.messageId || "",
				imageKey: response.imageKey,
			});
		} else {
			await sendMessage(client, {
				to: response.messageId || "",
				text: response.content as string,
			});
		}
	}

	async updateMessage(messageId: string, response: UniversalResponse): Promise<void> {
		const client = this.getFirstClient();
		if (!client) return;

		if (response.type === "card") {
			await updateCard(client, {
				messageId,
				card: response.content as any,
			});
		} else {
			// 文本消息更新
			const card = buildMarkdownCard(response.content as string);
			await updateCard(client, {
				messageId,
				card,
			});
		}
	}

	async deleteMessage(messageId: string): Promise<void> {
		const client = this.getFirstClient();
		if (!client) return;

		await client.sdk.im.message.delete({
			path: { message_id: messageId },
		});
	}

	async uploadFile(filePath: string): Promise<string> {
		const client = this.getFirstClient();
		if (!client) throw new Error("No LarkClient available");

		const { uploadFile } = await import("./messaging/outbound/send.js");
		return uploadFile(client, filePath);
	}

	async uploadImage(imagePath: string): Promise<string> {
		const client = this.getFirstClient();
		if (!client) throw new Error("No LarkClient available");

		return uploadImage(client, imagePath);
	}

	async getUserInfo(userId: string): Promise<UserInfo | undefined> {
		const client = this.getFirstClient();
		if (!client) return undefined;

		try {
			const response = await client.sdk.contact.user.batchGet({
				data: {
					user_id_type: "open_id",
					user_ids: [userId],
				},
			});

			const user = response?.data?.items?.[0];
			if (!user) return undefined;

			return {
				id: user.open_id ?? userId,
				userName: user.name ?? userId,
				displayName: user.name ?? userId,
				avatar: user.avatar?.avatar_origin ?? undefined,
			};
		} catch {
			return undefined;
		}
	}

	async getAllUsers(): Promise<UserInfo[]> {
		// 飞书 API 需要分页，这里简化处理
		return [];
	}

	async getChannelInfo(channelId: string): Promise<ChannelInfo | undefined> {
		const client = this.getFirstClient();
		if (!client) return undefined;

		try {
			const response = await client.sdk.im.chat.get({
				path: { chat_id: channelId },
			});

			return {
				id: channelId,
				name: response?.data?.name ?? channelId,
			};
		} catch {
			return undefined;
		}
	}

	async getAllChannels(): Promise<ChannelInfo[]> {
		// 需要分页处理，简化返回
		return [];
	}

	onMessage(handler: (message: UniversalMessage) => void): void {
		this.messageCallback = handler;
	}

	createPlatformContext(chatId: string): PlatformContext {
		const client = this.getFirstClient();
		return new FeishuPlatformContext({
			client,
			chatId,
			adapter: this,
		});
	}

	isRunning(channelId: string): boolean {
		return this.runningChannels.has(channelId);
	}

	setRunning(channelId: string, abort: () => void): void {
		this.runningChannels.set(channelId, abort);
	}

	clearRunning(channelId: string): void {
		this.runningChannels.delete(channelId);
	}

	abortChannel(channelId: string): void {
		const abort = this.runningChannels.get(channelId);
		if (abort) {
			abort();
			this.runningChannels.delete(channelId);
		}
	}

	getDefaultModel(): string | undefined {
		return this.config.model;
	}

	// ============================================================================
	// 公共方法（供 PlatformContext 使用）
	// ============================================================================

	/**
	 * 获取或创建卡片管理器
	 */
	getCardManager(chatId: string): StreamingCardManager {
		let manager = this.cardManagers.get(chatId);
		if (!manager) {
			manager = new StreamingCardManager();
			this.cardManagers.set(chatId, manager);
		}
		return manager;
	}

	/**
	 * 获取第一个可用的客户端
	 */
	private getFirstClient(): LarkClient | undefined {
		return this.clients.values().next().value;
	}

	/**
	 * 根据 chatId 获取客户端（简化： 返回第一个）
	 */
	getClient(chatId: string): LarkClient | undefined {
		return this.getFirstClient();
	}
}
