/**
 * Feishu V2 Outbound - Thread
 *
 * 线程/话题回复功能
 */

import type * as lark from "@larksuiteoapi/node-sdk";
import type { ThreadReplyOptions, CardContent } from "../types.js";

// ============================================================================
// 线程回复发送类
// ============================================================================

/**
 * 飞书线程回复管理器
 */
export class FeishuThread {
	constructor(private client: lark.Client) {}

	/**
	 * 在话题中回复
	 * @param chatId 聊天 ID
	 * @param rootId 根消息 ID
	 * @param text 回复内容
	 */
	async postInThread(chatId: string, rootId: string, text: string): Promise<string> {
		return this.sendThreadMessage({
			chatId,
			rootId,
			content: text,
			msgType: "text",
		});
	}

	/**
	 * 在话题中回复卡片
	 */
	async postCardInThread(chatId: string, rootId: string, card: CardContent | string): Promise<string> {
		const cardContent = typeof card === "string" ? card : JSON.stringify(card);
		return this.sendThreadMessage({
			chatId,
			rootId,
			content: cardContent,
			msgType: "interactive",
		});
	}

	/**
	 * 发送话题消息
	 */
	async sendThreadMessage(options: ThreadReplyOptions): Promise<string> {
		const result = await this.client.im.message.create({
			params: { receive_id_type: "chat_id" },
			data: {
				receive_id: options.chatId,
				msg_type: options.msgType || "text",
				content:
					options.msgType === "text"
						? JSON.stringify({ text: options.content })
						: options.content,
				root_id: options.rootId,
			},
		});

		if (result.code !== 0) {
			throw new Error(`Failed to send thread message: ${result.msg}`);
		}

		return result.data?.message_id || "";
	}

	/**
	 * 更新话题消息
	 */
	async updateThreadMessage(messageId: string, content: string | CardContent): Promise<void> {
		const cardContent = typeof content === "string" ? content : JSON.stringify(content);

		await this.client.im.message.patch({
			path: { message_id: messageId },
			data: { content: cardContent },
		} as any);
	}

	/**
	 * 删除话题消息
	 */
	async deleteThreadMessage(messageId: string): Promise<void> {
		await this.client.im.message.delete({
			path: { message_id: messageId },
		});
	}

	/**
	 * 获取话题中的所有回复
	 */
	async getThreadReplies(
		rootMessageId: string,
		options?: {
			pageSize?: number;
			pageToken?: string;
		},
	): Promise<{ messages: any[]; pageToken?: string }> {
		const result = await this.client.im.message.list({
			params: {
				container_id_type: "thread",
				container_id: rootMessageId,
				page_size: options?.pageSize || 50,
				page_token: options?.pageToken,
			},
		} as any);

		if (result.code !== 0) {
			throw new Error(`Failed to get thread replies: ${result.msg}`);
		}

		return {
			messages: result.data?.items || [],
			pageToken: result.data?.page_token,
		};
	}

	/**
	 * 获取话题根消息
	 */
	async getThreadRoot(messageId: string): Promise<any> {
		// 首先获取消息信息
		const message = await this.client.im.message.get({
			path: { message_id: messageId },
		});

		if (message.code !== 0) {
			throw new Error(`Failed to get message: ${message.msg}`);
		}

		// 如果有 root_id，获取根消息
		if (message.data?.root_id) {
			const root = await this.client.im.message.get({
				path: { message_id: message.data.root_id },
			});

			if (root.code === 0) {
				return root.data;
			}
		}

		return message.data;
	}

	/**
	 * 判断消息是否是话题消息
	 */
	async isThreadMessage(messageId: string): Promise<boolean> {
		const message = await this.client.im.message.get({
			path: { message_id: messageId },
		});

		if (message.code !== 0) {
			return false;
		}

		return !!message.data?.root_id || !!message.data?.thread_id;
	}
}
