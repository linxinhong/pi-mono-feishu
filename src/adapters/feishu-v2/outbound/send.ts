/**
 * Feishu V2 Outbound - Send
 *
 * 飞书消息发送功能
 */

import type * as lark from "@larksuiteoapi/node-sdk";
import type { FeishuMessageType, CardContent } from "../types.js";

// ============================================================================
// Types
// ============================================================================

/**
 * 发送消息选项
 */
export interface SendMessageOptions {
	/** 接收者 ID */
	receiveId: string;
	/** 接收者类型 */
	receiveIdType?: "open_id" | "user_id" | "union_id" | "email" | "chat_id";
	/** 消息类型 */
	msgType: FeishuMessageType;
	/** 消息内容 */
	content: string | CardContent;
	/** 根消息 ID（话题回复） */
	rootId?: string;
}

// ============================================================================
// Feishu Outbound
// ============================================================================

/**
 * 飞书出站消息发送器
 */
export class FeishuOutbound {
	private client: lark.Client;

	constructor(client: lark.Client) {
		this.client = client;
	}

	/**
	 * 发送消息
	 */
	async sendMessage(options: SendMessageOptions): Promise<string> {
		const content = typeof options.content === "string"
			? options.content
			: JSON.stringify(options.content);

		const result = await this.client.im.message.create({
			params: {
				receive_id_type: options.receiveIdType || "chat_id",
			},
			data: {
				receive_id: options.receiveId,
				msg_type: options.msgType,
				content,
				...(options.rootId && { root_id: options.rootId }),
			} as any,
		});

		if (result.code !== 0) {
			throw new Error(`Failed to send message: ${result.msg}`);
		}

		return result.data?.message_id || "";
	}

	/**
	 * 发送文本消息
	 */
	async sendText(receiveId: string, text: string, rootId?: string): Promise<string> {
		return this.sendMessage({
			receiveId,
			msgType: "text",
			content: JSON.stringify({ text }),
			rootId,
		});
	}

	/**
	 * 发送卡片消息
	 */
	async sendCard(receiveId: string, content: string, rootId?: string): Promise<string> {
		return this.sendMessage({
			receiveId,
			msgType: "interactive",
			content,
			rootId,
		});
	}

	/**
	 * 发送图片消息
	 */
	async sendImage(receiveId: string, imageKey: string): Promise<string> {
		return this.sendMessage({
			receiveId,
			msgType: "image",
			content: JSON.stringify({ image_key: imageKey }),
		});
	}

	/**
	 * 发送文件消息
	 */
	async sendFile(receiveId: string, fileKey: string, fileName?: string): Promise<string> {
		return this.sendMessage({
			receiveId,
			msgType: "file",
			content: JSON.stringify({
				file_key: fileKey,
				file_name: fileName,
			}),
		});
	}

	/**
	 * 发送音频消息
	 */
	async sendAudio(receiveId: string, fileKey: string): Promise<string> {
		return this.sendMessage({
			receiveId,
			msgType: "audio",
			content: JSON.stringify({ file_key: fileKey }),
		});
	}

	/**
	 * 发送富文本消息
	 */
	async sendPost(
		receiveId: string,
		content: {
			title?: string;
			blocks: Array<{
				tag: string;
				text?: string;
				children?: Array<{ tag: string; text?: string; user_id?: string }>;
			}>;
		},
	): Promise<string> {
		const postContent = {
			content: content.blocks.map((block) => ({
				tag: block.tag,
				children: block.children || (block.text ? [{ tag: "text", text: block.text }] : []),
			})),
			title: content.title,
		};

		return this.sendMessage({
			receiveId,
			msgType: "post",
			content: JSON.stringify(postContent),
		});
	}

	/**
	 * 更新消息
	 */
	async updateMessage(messageId: string, content: string): Promise<void> {
		const result = await this.client.im.message.patch({
			path: {
				message_id: messageId,
			},
			data: {
				content,
			},
		});

		if (result.code !== 0) {
			throw new Error(`Failed to update message: ${result.msg}`);
		}
	}

	/**
	 * 更新文本消息
	 */
	async updateTextMessage(messageId: string, text: string): Promise<void> {
		return this.updateMessage(messageId, JSON.stringify({ text }));
	}

	/**
	 * 删除消息
	 */
	async deleteMessage(messageId: string): Promise<void> {
		const result = await this.client.im.message.delete({
			path: {
				message_id: messageId,
			},
		});

		if (result.code !== 0) {
			throw new Error(`Failed to delete message: ${result.msg}`);
		}
	}

	/**
	 * 获取消息详情
	 */
	async getMessage(messageId: string): Promise<any> {
		const result = await this.client.im.message.get({
			path: {
				message_id: messageId,
			},
		});

		if (result.code !== 0) {
			throw new Error(`Failed to get message: ${result.msg}`);
		}

		return result.data;
	}

	/**
	 * 撤回消息
	 */
	async recallMessage(messageId: string): Promise<void> {
		const result = await (this.client.im.message as any).delete?.({
			path: {
				message_id: messageId,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to recall message: ${result?.msg}`);
		}
	}
}
