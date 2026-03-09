/**
 * Feishu 平台上下文
 */

import type { PlatformContext } from "../../core/platform/context.js";
import type { FeishuAdapter } from "./adapter.js";
import type { LarkClient } from "./client/lark-client.js";
import {
	sendMessage,
	sendCard,
	updateCard,
	sendImage,
	uploadImage,
	uploadFile,
	buildMarkdownCard,
} from "./messaging/outbound/send.js";
import {
	StreamingCardManager,
	buildCardContent,
	splitReasoningText,
} from "./messaging/outbound/card.js";

import type { ToolCallStatus } from "./types.js";

// ============================================================================
// FeishuPlatformContext
// ============================================================================

export interface FeishuContextOptions {
	client: LarkClient;
	chatId: string;
	adapter: FeishuAdapter;
}

export class FeishuPlatformContext implements PlatformContext {
	readonly platform = "feishu";

	private client: LarkClient;
	private chatId: string;
	private adapter: FeishuAdapter;

	constructor(options: FeishuContextOptions) {
		this.client = options.client;
		this.chatId = options.chatId;
		this.adapter = options.adapter;
	}

	async sendText(chatId: string, text: string): Promise<string> {
		const result = await sendMessage(this.client, {
			to: chatId,
			text,
		});
		return result.messageId;
	}

	async updateMessage(messageId: string, content: string): Promise<void> {
		const card = buildMarkdownCard(content);
		await updateCard(this.client, {
			messageId,
			card,
		});
	}

	async deleteMessage(messageId: string): Promise<void> {
		await this.client.sdk.im.message.delete({
			path: { message_id: messageId },
		});
	}

	async uploadFile(filePath: string, chatId: string): Promise<void> {
		// 上传并发送
		const fileKey = await uploadFile(this.client, filePath);
		await this.client.sdk.im.file.create({
			data: {
				file_type: "stream",
				file_key: fileKey,
				file_name: filePath.split("/").pop() || "file",
			},
		});
	}

	async uploadImage(imagePath: string): Promise<string> {
		return uploadImage(this.client, imagePath);
	}

	async sendImage(chatId: string, imageKey: string): Promise<string> {
		const result = await sendImage(this.client, {
			to: chatId,
			imageKey,
		});
		return result.messageId;
	}

	async sendVoiceMessage(chatId: string, filePath: string): Promise<string> {
		// 飞书语音消息需要先上传
		const fs = await import("fs");
		const buffer = fs.readFileSync(filePath);

		const response = await this.client.sdk.im.file.create({
			data: {
				file_type: "stream",
				file_name: "voice.opus",
				file: buffer,
			},
		});

		const fileKey = response?.data?.file_key;
		if (!fileKey) {
			throw new Error("Failed to upload voice file");
		}

		// 发送语音消息
		const sendResponse = await this.client.sdk.im.message.create({
			params: {
				receive_id_type: "chat_id",
			},
			data: {
				receive_id: chatId,
				msg_type: "audio",
				content: JSON.stringify({ file_key: fileKey }),
			},
		});

		return sendResponse?.data?.message_id ?? "";
	}

	async postInThread(
		chatId: string,
		parentMessageId: string,
		text: string
	): Promise<string> {
		const result = await sendMessage(this.client, {
			to: chatId,
			text,
			replyToMessageId: parentMessageId,
			replyInThread: true,
		});
		return result.messageId;
	}

	// ============================================================================
	// 流式卡片支持
	// ============================================================================

	/**
	 * 开始流式卡片（发送思考状态）
	 */
	async startStreamingCard(): Promise<string | undefined> {
		const manager = this.adapter.getCardManager(this.chatId);
		const result = await manager.start(async (card) => {
			return sendCard(this.client, {
				to: this.chatId,
				card,
			});
		});
		return result.messageId;
	}

	/**
	 * 更新流式卡片
	 */
	async updateStreamingCard(
		messageId: string,
		text: string,
		options?: {
			toolCalls?: ToolCallStatus[];
			reasoningText?: string;
		}
	): Promise<void> {
		const manager = this.adapter.getCardManager(this.chatId);
		await manager.update(
			async (card) => {
			await updateCard(this.client, { messageId, card });
			},
			text,
			options?.toolCalls,
			options?.reasoningText
		);
	}

	/**
	 * 完成流式卡片
	 */
	async completeStreamingCard(
		messageId: string,
		text: string,
		options?: {
			toolCalls?: ToolCallStatus[];
			isError?: boolean;
			isAborted?: boolean;
			reasoningText?: string;
			reasoningElapsedMs?: number;
			footer?: { status?: boolean; elapsed?: boolean };
		}
	): Promise<void> {
		const manager = this.adapter.getCardManager(this.chatId);
		await manager.complete(
			async (card) => {
			await updateCard(this.client, { messageId, card });
			},
			text,
			{
				...options,
				footer: options?.footer,
			}
		);
	}

	// ============================================================================
	// 平台特定功能
	// ============================================================================

	/**
	 * 获取平台特定功能
	 */
	getPlatformFeature<T = any>(feature: string): T | undefined {
		switch (feature) {
			case "startStreamingCard":
				return this.startStreamingCard.bind(this) as T;
			case "updateStreamingCard":
				return this.updateStreamingCard.bind(this) as T;
			case "completeStreamingCard":
				return this.completeStreamingCard.bind(this) as T;
			case "buildCard":
				return buildCardContent as T;
			default:
				return undefined;
		}
	}
}
