/**
 * Feishu V2 Outbound - Thread
 *
 * 飞书线程回复功能
 */

import type * as lark from "@larksuiteoapi/node-sdk";
import type { FeishuMessageType } from "../types.js";

// ============================================================================
// Types
// ============================================================================

/**
 * 线程回复选项
 */
export interface ThreadReplyOptions {
	/** 聊天 ID */
	chatId: string;
	/** 根消息 ID */
	rootId: string;
	/** 消息内容 */
	content: string;
	/** 消息类型 */
	msgType?: FeishuMessageType;
}

/**
 * 线程消息信息
 */
export interface ThreadMessage {
	messageId: string;
	rootId: string;
	parentId?: string;
	content: string;
	msgType: string;
	createTime: number;
	sender: {
		userId: string;
		userName?: string;
	};
}

// ============================================================================
// Feishu Thread
// ============================================================================

/**
 * 飞书线程回复管理器
 */
export class FeishuThread {
	private client: lark.Client;

	constructor(client: lark.Client) {
		this.client = client;
	}

	/**
	 * 在线程中回复
	 */
	async postInThread(
		chatId: string,
		rootId: string,
		content: string,
		msgType: FeishuMessageType = "text",
	): Promise<string> {
		const actualContent = msgType === "text"
			? JSON.stringify({ text: content })
			: content;

		const result = await this.client.im.message.create({
			params: {
				receive_id_type: "chat_id",
			},
			data: {
				receive_id: chatId,
				msg_type: msgType,
				content: actualContent,
				root_id: rootId,
			} as any,
		});

		if (result.code !== 0) {
			throw new Error(`Failed to post in thread: ${result.msg}`);
		}

		return result.data?.message_id || "";
	}

	/**
	 * 在线程中发送文本回复
	 */
	async replyText(chatId: string, rootId: string, text: string): Promise<string> {
		return this.postInThread(chatId, rootId, text, "text");
	}

	/**
	 * 在线程中发送卡片回复
	 */
	async replyCard(chatId: string, rootId: string, cardContent: string): Promise<string> {
		return this.postInThread(chatId, rootId, cardContent, "interactive");
	}

	/**
	 * 在线程中发送图片回复
	 */
	async replyImage(chatId: string, rootId: string, imageKey: string): Promise<string> {
		return this.postInThread(chatId, rootId, JSON.stringify({ image_key: imageKey }), "image");
	}

	/**
	 * 获取线程消息列表
	 */
	async getThreadMessages(
		rootId: string,
		options?: {
			pageSize?: number;
			pageToken?: string;
		},
	): Promise<{ messages: ThreadMessage[]; pageToken?: string; hasMore: boolean }> {
		const result = await (this.client.im.message as any).replies?.list?.({
			path: {
				message_id: rootId,
			},
			params: {
				page_size: options?.pageSize || 50,
				page_token: options?.pageToken,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to get thread messages: ${result?.msg}`);
		}

		return {
			messages: (result.data?.items || []).map((item: any) => ({
				messageId: item.message_id,
				rootId: item.root_id,
				parentId: item.parent_id,
				content: item.content,
				msgType: item.msg_type,
				createTime: parseInt(item.create_time) || 0,
				sender: {
					userId: item.sender?.id || "",
					userName: item.sender?.name,
				},
			})),
			pageToken: result.data?.page_token,
			hasMore: result.data?.has_more || false,
		};
	}

	/**
	 * 获取线程消息数量
	 */
	async getThreadMessageCount(rootId: string): Promise<number> {
		const result = await this.getThreadMessages(rootId, { pageSize: 1 });
		// 注意：这里只是估算，如果需要精确数量需要遍历所有页
		return result.hasMore ? 50 : result.messages.length;
	}

	/**
	 * 判断消息是否有线程回复
	 */
	async hasThread(rootId: string): Promise<boolean> {
		try {
			const result = await this.getThreadMessages(rootId, { pageSize: 1 });
			return result.messages.length > 0;
		} catch {
			return false;
		}
	}

	/**
	 * 批量获取线程消息
	 */
	async getBatchThreadMessages(
		rootIds: string[],
	): Promise<Map<string, ThreadMessage[]>> {
		const resultMap = new Map<string, ThreadMessage[]>();

		await Promise.all(
			rootIds.map(async (rootId) => {
				try {
					const result = await this.getThreadMessages(rootId, { pageSize: 100 });
					resultMap.set(rootId, result.messages);
				} catch (error) {
					resultMap.set(rootId, []);
				}
			}),
		);

		return resultMap;
	}
}
