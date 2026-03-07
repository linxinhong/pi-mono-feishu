/**
 * Feishu V2 Outbound - Send Messages
 *
 * 出站消息发送功能
 */

import type * as lark from "@larksuiteoapi/node-sdk";
import type {
	FeishuMessageType,
	SendMessageOptions,
	UpdateMessageOptions,
	CardContent,
} from "../types.js";
import { buildTextCard } from "../cards.js";

// ============================================================================
// 出站消息发送类
// ============================================================================

/**
 * 飞书出站消息发送器
 */
export class FeishuOutbound {
	constructor(private client: lark.Client) {}

	// ==========================================================================
	// 基础消息发送
	// ==========================================================================

	/**
	 * 发送文本消息
	 */
	async sendText(chatId: string, text: string): Promise<string> {
		return this.sendMessage({
			receiveId: chatId,
			receiveIdType: "chat_id",
			msgType: "text",
			content: JSON.stringify({ text }),
		});
	}

	/**
	 * 发送富文本消息
	 */
	async sendPost(chatId: string, content: any): Promise<string> {
		return this.sendMessage({
			receiveId: chatId,
			receiveIdType: "chat_id",
			msgType: "post",
			content: JSON.stringify(content),
		});
	}

	/**
	 * 发送卡片消息
	 */
	async sendCard(chatId: string, card: CardContent | string): Promise<string> {
		const cardContent = typeof card === "string" ? card : JSON.stringify(card);
		return this.sendMessage({
			receiveId: chatId,
			receiveIdType: "chat_id",
			msgType: "interactive",
			content: cardContent,
		});
	}

	/**
	 * 发送图片消息
	 */
	async sendImage(chatId: string, imageKey: string): Promise<string> {
		return this.sendMessage({
			receiveId: chatId,
			receiveIdType: "chat_id",
			msgType: "image",
			content: JSON.stringify({ image_key: imageKey }),
		});
	}

	/**
	 * 发送文件消息
	 */
	async sendFile(chatId: string, fileKey: string, fileName?: string): Promise<string> {
		return this.sendMessage({
			receiveId: chatId,
			receiveIdType: "chat_id",
			msgType: "file",
			content: JSON.stringify({ file_key: fileKey, file_name: fileName }),
		});
	}

	/**
	 * 发送音频消息
	 */
	async sendAudio(chatId: string, fileKey: string, duration?: number): Promise<string> {
		return this.sendMessage({
			receiveId: chatId,
			receiveIdType: "chat_id",
			msgType: "audio",
			content: JSON.stringify({ file_key: fileKey, duration }),
		});
	}

	/**
	 * 发送媒体消息
	 */
	async sendMedia(chatId: string, fileKey: string, fileName?: string): Promise<string> {
		return this.sendMessage({
			receiveId: chatId,
			receiveIdType: "chat_id",
			msgType: "media",
			content: JSON.stringify({ file_key: fileKey, file_name: fileName }),
		});
	}

	// ==========================================================================
	// 消息更新和删除
	// ==========================================================================

	/**
	 * 更新消息内容
	 */
	async updateMessage(messageId: string, content: string | CardContent): Promise<void> {
		const cardContent = typeof content === "string" ? content : JSON.stringify(content);

		await this.client.im.message.patch({
			path: { message_id: messageId },
			data: { content: cardContent },
		} as any);
	}

	/**
	 * 更新文本消息
	 */
	async updateTextMessage(messageId: string, text: string): Promise<void> {
		const card = buildTextCard(text);
		await this.updateMessage(messageId, JSON.stringify(card));
	}

	/**
	 * 更新卡片消息
	 */
	async updateCardMessage(messageId: string, card: CardContent | string): Promise<void> {
		const cardContent = typeof card === "string" ? card : JSON.stringify(card);
		await this.updateMessage(messageId, cardContent);
	}

	/**
	 * 删除消息
	 */
	async deleteMessage(messageId: string): Promise<void> {
		await this.client.im.message.delete({
			path: { message_id: messageId },
		});
	}

	// ==========================================================================
	// 消息转发
	// ==========================================================================

	/**
	 * 转发消息
	 */
	async forwardMessage(messageId: string, targetChatId: string): Promise<string> {
		const result = await this.client.im.message.forward({
			path: { message_id: messageId },
			data: {
				receive_id: targetChatId,
				receive_id_type: "chat_id",
			},
		});

		if (result.code !== 0) {
			throw new Error(`Failed to forward message: ${result.msg}`);
		}

		return result.data?.message_id || "";
	}

	// ==========================================================================
	// 底层发送方法
	// ==========================================================================

	/**
	 * 通用消息发送方法
	 */
	async sendMessage(options: SendMessageOptions): Promise<string> {
		const result = await this.client.im.message.create({
			params: {
				receive_id_type: options.receiveIdType || "chat_id",
			},
			data: {
				receive_id: options.receiveId,
				msg_type: options.msgType,
				content: typeof options.content === "string" ? options.content : JSON.stringify(options.content),
				root_id: options.rootId,
			},
		});

		if (result.code !== 0) {
			throw new Error(`Failed to send message: ${result.msg}`);
		}

		return result.data?.message_id || "";
	}

	/**
	 * 发送已读回执
	 */
	async sendReadReceipt(chatId: string, messageId: string): Promise<void> {
		await this.client.im.message.readStatus.update({
			data: {
				receive_id: chatId,
				receive_id_type: "chat_id",
				chat_id: chatId,
				message_id: messageId,
			},
		} as any);
	}

	// ==========================================================================
	// 消息动作
	// ==========================================================================

	/**
	 * 确认消息（卡片回调）
	 */
	async confirmMessage(messageId: string): Promise<void> {
		// 卡片确认通常在回调中处理
		// 这里提供一个空实现，具体逻辑根据业务需求
	}

	/**
	 * 撤回消息
	 */
	async recallMessage(messageId: string): Promise<void> {
		await this.deleteMessage(messageId);
	}

	/**
	 * 获取消息内容
	 */
	async getMessage(messageId: string): Promise<any> {
		const result = await this.client.im.message.get({
			path: { message_id: messageId },
		});

		if (result.code !== 0) {
			throw new Error(`Failed to get message: ${result.msg}`);
		}

		return result.data;
	}

	/**
	 * 获取消息列表
	 */
	async getMessages(chatId: string, options?: {
		pageSize?: number;
		pageToken?: string;
		startTime?: string;
		endTime?: string;
	}): Promise<{ messages: any[]; pageToken?: string }> {
		const result = await this.client.im.message.list({
			params: {
				container_id_type: "chat",
				container_id: chatId,
				page_size: options?.pageSize || 50,
				page_token: options?.pageToken,
				start_time: options?.startTime,
				end_time: options?.endTime,
			},
		} as any);

		if (result.code !== 0) {
			throw new Error(`Failed to get messages: ${result.msg}`);
		}

		return {
			messages: result.data?.items || [],
			pageToken: result.data?.page_token,
		};
	}
}
