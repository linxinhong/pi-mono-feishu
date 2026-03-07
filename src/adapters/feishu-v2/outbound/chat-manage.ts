/**
 * Feishu V2 Outbound - Chat Management
 *
 * 群组管理功能
 */

import type * as lark from "@larksuiteoapi/node-sdk";

// ============================================================================
// 群组管理类
// ============================================================================

/**
 * 群组信息
 */
export interface ChatInfo {
	id: string;
	name: string;
	description?: string;
	ownerId?: string;
	memberCount?: number;
}

/**
 * 群组成员
 */
export interface ChatMember {
	id: string;
	name?: string;
	type: "user" | "bot";
}

/**
 * 飞书群组管理器
 */
export class FeishuChatManage {
	constructor(private client: lark.Client) {}

	/**
	 * 获取群组信息
	 */
	async getChat(chatId: string): Promise<ChatInfo> {
		const result = await this.client.im.chat.get({
			path: { chat_id: chatId },
		});

		if (result.code !== 0) {
			throw new Error(`Failed to get chat: ${result.msg}`);
		}

		const chat = result.data;
		return {
			id: (chat as any).chat_id || chatId,
			name: chat.name || chatId,
			description: chat.description,
			ownerId: (chat as any).owner_id,
			memberCount: (chat as any).member_count,
		};
	}

	/**
	 * 更新群组信息
	 */
	async updateChat(
		chatId: string,
		options: {
			name?: string;
			description?: string;
		},
	): Promise<void> {
		const result = await this.client.im.chat.update({
			path: { chat_id: chatId },
			params: { user_id_type: "user_id" },
			data: {
				name: options.name,
				description: options.description,
			} as any,
		});

		if (result.code !== 0) {
			throw new Error(`Failed to update chat: ${result.msg}`);
		}
	}

	/**
	 * 获取群组成员列表
	 */
	async listChatMembers(
		chatId: string,
		options?: {
			pageSize?: number;
			pageToken?: string;
		},
	): Promise<{ members: ChatMember[]; pageToken?: string }> {
		const result = await this.client.im.chatMembers.list({
			path: { chat_id: chatId },
			params: {
				member_id_type: "user_id",
				page_size: options?.pageSize || 100,
				page_token: options?.pageToken,
			},
		});

		if (result.code !== 0) {
			throw new Error(`Failed to list chat members: ${result.msg}`);
		}

		const members: ChatMember[] = (result.data?.items || []).map((item: any) => ({
			id: item.member_id || item.user_id,
			name: item.name,
			type: item.member_type === "bot" ? "bot" : "user",
		}));

		return {
			members,
			pageToken: result.data?.page_token,
		};
	}

	/**
	 * 添加群组成员
	 */
	async addChatMembers(chatId: string, userIds: string[]): Promise<void> {
		const result = await this.client.im.chatMembers.create({
			path: { chat_id: chatId },
			params: { member_id_type: "user_id" },
			data: {
				member_id_type: "user_id",
				member_ids: userIds,
			} as any,
		});

		if (result.code !== 0) {
			throw new Error(`Failed to add chat members: ${result.msg}`);
		}
	}

	/**
	 * 移除群组成员
	 */
	async removeChatMembers(chatId: string, userIds: string[]): Promise<void> {
		const result = await this.client.im.chatMembers.delete({
			path: { chat_id: chatId },
			params: {
				member_id_type: "user_id",
			},
			data: {
				member_id_type: "user_id",
				member_ids: userIds,
			} as any,
		});

		if (result.code !== 0) {
			throw new Error(`Failed to remove chat members: ${result.msg}`);
		}
	}

	/**
	 * 创建群组
	 */
	async createChat(
		options: {
			name: string;
			description?: string;
			userIds?: string[];
		},
	): Promise<string> {
		const result = await this.client.im.chat.create({
			params: { user_id_type: "user_id" },
			data: {
				name: options.name,
				description: options.description,
				user_id_list: options.userIds,
			} as any,
		});

		if (result.code !== 0) {
			throw new Error(`Failed to create chat: ${result.msg}`);
		}

		return (result.data as any)?.chat_id || "";
	}

	/**
	 * 解散群组
	 */
	async disbandChat(chatId: string): Promise<void> {
		const result = await this.client.im.chat.disband({
			path: { chat_id: chatId },
		});

		if (result.code !== 0) {
			throw new Error(`Failed to disband chat: ${result.msg}`);
		}
	}

	/**
	 * 退出群组
	 */
	async leaveChat(chatId: string): Promise<void> {
		const result = await this.client.im.chatMembers.leave({
			path: { chat_id: chatId },
		});

		if (result.code !== 0) {
			throw new Error(`Failed to leave chat: ${result.msg}`);
		}
	}

	/**
	 * 设置群管理员
	 */
	async setChatAdmin(chatId: string, userIds: string[]): Promise<void> {
		const result = await this.client.im.chatAdmin.setAdmin({
			path: { chat_id: chatId },
			params: { user_id_type: "user_id" },
			data: {
				admin_ids: userIds,
			} as any,
		});

		if (result.code !== 0) {
			throw new Error(`Failed to set chat admin: ${result.msg}`);
		}
	}

	/**
	 * 获取群列表
	 */
	async listChats(options?: {
		pageSize?: number;
		pageToken?: string;
	}): Promise<{ chats: ChatInfo[]; pageToken?: string }> {
		const result = await this.client.im.chat.list({
			params: {
				page_size: options?.pageSize || 100,
				page_token: options?.pageToken,
			},
		});

		if (result.code !== 0) {
			throw new Error(`Failed to list chats: ${result.msg}`);
		}

		const chats: ChatInfo[] = (result.data?.items || []).map((chat: any) => ({
			id: chat.chat_id,
			name: chat.name || chat.chat_id,
			description: chat.description,
			ownerId: chat.owner_id,
			memberCount: chat.member_count,
		}));

		return {
			chats,
			pageToken: result.data?.page_token,
		};
	}
}
