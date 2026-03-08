/**
 * Feishu V2 Outbound - Chat Manage
 *
 * 飞书群组管理功能
 */

import type * as lark from "@larksuiteoapi/node-sdk";

// ============================================================================
// Types
// ============================================================================

/**
 * 群组信息
 */
export interface ChatInfo {
	chatId: string;
	name: string;
	description?: string;
	ownerId?: string;
	createTime?: number;
	memberCount?: number;
	chatType?: "p2p" | "group";
}

/**
 * 群组成员
 */
export interface ChatMember {
	userId: string;
	userName?: string;
	joinTime?: number;
	role?: "owner" | "admin" | "member";
}

// ============================================================================
// Feishu Chat Manage
// ============================================================================

/**
 * 飞书群组管理器
 */
export class FeishuChatManage {
	private client: lark.Client;

	constructor(client: lark.Client) {
		this.client = client;
	}

	/**
	 * 获取群组信息
	 */
	async getChatInfo(chatId: string): Promise<ChatInfo> {
		const result = await this.client.im.chat.get({
			path: {
				chat_id: chatId,
			},
		});

		if (result.code !== 0) {
			throw new Error(`Failed to get chat info: ${result.msg}`);
		}

		const chatData = result.data as any;
		return {
			chatId: chatData?.chat_id || chatId,
			name: chatData?.name || "",
			description: chatData?.description,
			ownerId: chatData?.owner_user_id,
			createTime: chatData?.create_time,
			memberCount: chatData?.member_count,
			chatType: chatData?.chat_mode === "single" ? "p2p" : "group",
		};
	}

	/**
	 * 获取群组列表
	 */
	async listChats(options?: {
		pageSize?: number;
		pageToken?: string;
	}): Promise<{ chats: ChatInfo[]; pageToken?: string; hasMore: boolean }> {
		const result = await this.client.im.chat.list({
			params: {
				page_size: options?.pageSize || 100,
				page_token: options?.pageToken,
			},
		});

		if (result.code !== 0) {
			throw new Error(`Failed to list chats: ${result.msg}`);
		}

		return {
			chats: (result.data?.items || []).map((item: any) => ({
				chatId: item.chat_id,
				name: item.name || "",
				description: item.description,
				ownerId: item.owner_user_id,
				createTime: item.create_time,
				memberCount: item.member_count,
				chatType: item.chat_mode === "single" ? "p2p" : "group",
			})),
			pageToken: result.data?.page_token,
			hasMore: result.data?.has_more || false,
		};
	}

	/**
	 * 创建群组
	 */
	async createChat(options: {
		name: string;
		description?: string;
		userIds?: string[];
	}): Promise<ChatInfo> {
		const result = await this.client.im.chat.create({
			data: {
				name: options.name,
				description: options.description,
				user_id_list: options.userIds || [],
			} as any,
		});

		if (result.code !== 0) {
			throw new Error(`Failed to create chat: ${result.msg}`);
		}

		const chatData = result.data as any;
		return {
			chatId: chatData?.chat_id || "",
			name: chatData?.name || options.name,
			description: chatData?.description,
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
		const result = await (this.client.im.chat as any).patch({
			path: {
				chat_id: chatId,
			},
			data: {
				name: options.name,
				description: options.description,
			},
		});

		if (result.code !== 0) {
			throw new Error(`Failed to update chat: ${result.msg}`);
		}
	}

	/**
	 * 解散群组
	 */
	async disbandChat(chatId: string): Promise<void> {
		const result = await this.client.im.chat.delete({
			path: {
				chat_id: chatId,
			},
		});

		if (result.code !== 0) {
			throw new Error(`Failed to disband chat: ${result.msg}`);
		}
	}

	/**
	 * 获取群组成员列表
	 */
	async getChatMembers(
		chatId: string,
		options?: {
			pageSize?: number;
			pageToken?: string;
		},
	): Promise<{ members: ChatMember[]; pageToken?: string; hasMore: boolean }> {
		const result = await (this.client.im.chatMembers as any).list({
			path: {
				chat_id: chatId,
			},
			params: {
				page_size: options?.pageSize || 100,
				page_token: options?.pageToken,
				member_id_type: "user_id",
			},
		});

		if (result.code !== 0) {
			throw new Error(`Failed to get chat members: ${result.msg}`);
		}

		return {
			members: (result.data?.items || []).map((item: any) => ({
				userId: item.member_id || "",
				userName: item.name,
				joinTime: item.join_time,
				role: item.owner ? "owner" : item.admin ? "admin" : "member",
			})),
			pageToken: result.data?.page_token,
			hasMore: result.data?.has_more || false,
		};
	}

	/**
	 * 添加群组成员
	 */
	async addChatMembers(chatId: string, userIds: string[]): Promise<void> {
		const result = await this.client.im.chatMembers.create({
			path: {
				chat_id: chatId,
			},
			data: {
				id_list: userIds,
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
			path: {
				chat_id: chatId,
			},
			data: {
				id_list: userIds,
			} as any,
		});

		if (result.code !== 0) {
			throw new Error(`Failed to remove chat members: ${result.msg}`);
		}
	}

	/**
	 * 设置群管理员
	 */
	async setChatAdmin(chatId: string, userIds: string[]): Promise<void> {
		const result = await (this.client.im.chat as any).setAdmin?.({
			path: {
				chat_id: chatId,
			},
			data: {
				user_id_list: userIds,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to set chat admin: ${result?.msg}`);
		}
	}

	/**
	 * 机器人加入群组
	 */
	async botJoinChat(chatId: string): Promise<void> {
		const result = await (this.client.im.chat as any).join?.({
			path: {
				chat_id: chatId,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to join chat: ${result?.msg}`);
		}
	}

	/**
	 * 机器人退出群组
	 */
	async botLeaveChat(chatId: string): Promise<void> {
		const result = await (this.client.im.chat as any).leave?.({
			path: {
				chat_id: chatId,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to leave chat: ${result?.msg}`);
		}
	}
}
