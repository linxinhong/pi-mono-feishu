/**
 * Feishu V2 Outbound - Reactions
 *
 * 表情反应功能
 */

import type * as lark from "@larksuiteoapi/node-sdk";
import type { FeishuEmojiType, Reaction } from "../types.js";

// ============================================================================
// 表情反应类型映射
// ============================================================================

/**
 * 常用表情类型
 */
export const EMOJI_TYPES = {
	// 赞同/确认
	THUMBSUP: "THUMBSUP",
	OK: "OK",
	DONE: "DONE",

	// 感谢/庆祝
	THANKS: "THANKS",
	APPLAUSE: "APPLAUSE",
	FISTBUMP: "FISTBUMP",
	PARTY: "PARTY",

	// 情感
	LOVE: "LOVE",
	SMILE: "SMILE",
	BLUSH: "BLUSH",
	LAUGH: "LAUGH",
	CRY: "CRY",
	ANGRY: "ANGRY",
	SAD: "SAD",
	SURPRISED: "SURPRISED",
	CONFUSED: "CONFUSED",
	EMBARRASSED: "EMBARRASSED",
	SLEEPY: "SLEEPY",

	// 鼓励
	MUSCLE: "MUSCLE",
	FINGERHEART: "FINGERHEART",
	JIAYI: "JIAYI",
	ROCKET: "ROCKET",

	// 取消
	CANCELLED: "CANCELLED",

	// 美食
	YUM: "YUM",

	// 其他
	SHAKE: "SHAKE",
	HEART: "HEART",

	// 节日
	PUMPKIN: "PUMPKIN",
	CHRISTMAS_TREE: "CHRISTMAS_TREE",
	GIFT: "GIFT",
	XMAS: "XMAS",
	SNOWMAN: "SNOWMAN",
	SANTA: "SANTA",
} as const;

// ============================================================================
// 表情反应发送类
// ============================================================================

/**
 * 飞书表情反应管理器
 */
export class FeishuReactions {
	constructor(private client: lark.Client) {}

	/**
	 * 添加表情反应
	 */
	async addReaction(messageId: string, emojiType: FeishuEmojiType): Promise<void> {
		const result = await this.client.im.messageReaction.create({
			path: { message_id: messageId },
			params: { user_id_type: "user_id" },
			data: {
				reaction_type: {
					emoji_type: emojiType,
				},
			},
		});

		if (result.code !== 0) {
			throw new Error(`Failed to add reaction: ${result.msg}`);
		}
	}

	/**
	 * 删除表情反应
	 */
	async removeReaction(messageId: string, reactionId: string): Promise<void> {
		const result = await this.client.im.messageReaction.delete({
			path: {
				message_id: messageId,
				reaction_id: reactionId,
			},
		});

		if (result.code !== 0) {
			throw new Error(`Failed to remove reaction: ${result.msg}`);
		}
	}

	/**
	 * 获取消息的所有表情反应
	 */
	async listReactions(messageId: string): Promise<Reaction[]> {
		const result = await this.client.im.messageReaction.list({
			path: { message_id: messageId },
			params: { user_id_type: "user_id" },
		});

		if (result.code !== 0) {
			throw new Error(`Failed to list reactions: ${result.msg}`);
		}

		// 转换为统一的 Reaction 格式
		const reactions: Reaction[] = [];
		const reactionMap = new Map<string, Reaction>();

		for (const item of result.data?.items || []) {
			const emojiType = item.reaction_type?.emoji_type as FeishuEmojiType;
			if (!emojiType) continue;

			if (!reactionMap.has(emojiType)) {
				reactionMap.set(emojiType, {
					emojiType,
					users: [],
				});
			}

			const reaction = reactionMap.get(emojiType)!;
			if (item.operator?.id) {
				reaction.users.push({
					userId: item.operator.id,
					userName: item.operator.name,
				});
			}
		}

		return Array.from(reactionMap.values());
	}

	/**
	 * 快捷方法：点赞
	 */
	async thumbsUp(messageId: string): Promise<void> {
		await this.addReaction(messageId, "THUMBSUP");
	}

	/**
	 * 快捷方法：确认
	 */
	async ok(messageId: string): Promise<void> {
		await this.addReaction(messageId, "OK");
	}

	/**
	 * 快捷方法：完成
	 */
	async done(messageId: string): Promise<void> {
		await this.addReaction(messageId, "DONE");
	}

	/**
	 * 快捷方法：感谢
	 */
	async thanks(messageId: string): Promise<void> {
		await this.addReaction(messageId, "THANKS");
	}

	/**
	 * 快捷方法：取消
	 */
	async cancelled(messageId: string): Promise<void> {
		await this.addReaction(messageId, "CANCELLED");
	}

	/**
	 * 快捷方法：庆祝
	 */
	async party(messageId: string): Promise<void> {
		await this.addReaction(messageId, "PARTY");
	}

	/**
	 * 快捷方法：火箭（加油）
	 */
	async rocket(messageId: string): Promise<void> {
		await this.addReaction(messageId, "ROCKET");
	}

	/**
	 * 快捷方法：爱心
	 */
	async heart(messageId: string): Promise<void> {
		await this.addReaction(messageId, "HEART");
	}
}
