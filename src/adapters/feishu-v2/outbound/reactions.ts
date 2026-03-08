/**
 * Feishu V2 Outbound - Reactions
 *
 * 飞书表情反应功能
 */

import type * as lark from "@larksuiteoapi/node-sdk";
import type { FeishuEmojiType } from "../types.js";

// ============================================================================
// Types
// ============================================================================

/**
 * 表情反应信息
 */
export interface EmojiReaction {
	emojiType: FeishuEmojiType;
	reactionId: string;
	createTime: number;
	user: {
		userId: string;
		userName?: string;
	};
}

/**
 * 支持的表情类型列表
 */
export const EMOJI_TYPES: FeishuEmojiType[] = [
	"THUMBSUP",
	"OK",
	"THANKS",
	"MUSCLE",
	"FINGERHEART",
	"APPLAUSE",
	"FISTBUMP",
	"JIAYI",
	"DONE",
	"SMILE",
	"BLUSH",
	"CANCELLED",
	"CONFUSED",
	"LOVE",
	"LAUGH",
	"CRY",
	"ANGRY",
	"SURPRISED",
	"SAD",
	"EMBARRASSED",
	"SLEEPY",
	"YUM",
	"ROCKET",
	"PARTY",
	"SHAKE",
	"HEART",
	"PUMPKIN",
	"CHRISTMAS_TREE",
	"GIFT",
	"XMAS",
	"SNOWMAN",
	"SANTA",
];

// ============================================================================
// Feishu Reactions
// ============================================================================

/**
 * 飞书表情反应管理器
 */
export class FeishuReactions {
	private client: lark.Client;

	constructor(client: lark.Client) {
		this.client = client;
	}

	/**
	 * 添加表情反应
	 */
	async addReaction(messageId: string, emojiType: FeishuEmojiType): Promise<string> {
		const result = await (this.client.im.message as any).reactions?.create?.({
			path: {
				message_id: messageId,
			},
			data: {
				reaction_type: emojiType,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to add reaction: ${result?.msg}`);
		}

		return result.data?.reaction?.reaction_id || "";
	}

	/**
	 * 删除表情反应
	 */
	async removeReaction(messageId: string, reactionId: string): Promise<void> {
		const result = await (this.client.im.message as any).reactions?.delete?.({
			path: {
				message_id: messageId,
				reaction_id: reactionId,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to remove reaction: ${result?.msg}`);
		}
	}

	/**
	 * 获取消息的表情反应列表
	 */
	async getReactions(messageId: string): Promise<EmojiReaction[]> {
		const result = await (this.client.im.message as any).reactions?.list?.({
			path: {
				message_id: messageId,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to get reactions: ${result?.msg}`);
		}

		return (result.data?.items || []).map((item: any) => ({
			emojiType: item.reaction_type,
			reactionId: item.reaction_id,
			createTime: item.create_time,
			user: {
				userId: item.operator?.user_id || "",
				userName: item.operator?.name,
			},
		}));
	}

	/**
	 * 快速添加点赞反应
	 */
	async thumbsUp(messageId: string): Promise<string> {
		return this.addReaction(messageId, "THUMBSUP");
	}

	/**
	 * 快速添加 OK 反应
	 */
	async ok(messageId: string): Promise<string> {
		return this.addReaction(messageId, "OK");
	}

	/**
	 * 快速添加感谢反应
	 */
	async thanks(messageId: string): Promise<string> {
		return this.addReaction(messageId, "THANKS");
	}

	/**
	 * 快速添加完成反应
	 */
	async done(messageId: string): Promise<string> {
		return this.addReaction(messageId, "DONE");
	}

	/**
	 * 快速添加爱心反应
	 */
	async heart(messageId: string): Promise<string> {
		return this.addReaction(messageId, "HEART");
	}

	/**
	 * 快速添加火箭反应（表示快速/优秀）
	 */
	async rocket(messageId: string): Promise<string> {
		return this.addReaction(messageId, "ROCKET");
	}

	/**
	 * 批量添加表情反应
	 */
	async addReactions(messageId: string, emojiTypes: FeishuEmojiType[]): Promise<string[]> {
		const results: string[] = [];
		for (const emojiType of emojiTypes) {
			try {
				const reactionId = await this.addReaction(messageId, emojiType);
				results.push(reactionId);
			} catch (error) {
				console.error(`Failed to add reaction ${emojiType}:`, error);
			}
		}
		return results;
	}
}
