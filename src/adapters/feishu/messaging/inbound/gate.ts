/**
 * 飞书消息权限检查
 *
 * 根据配置的策略决定是否响应消息
 */

import type {
	MessageContext,
	MentionInfo,
	DMPolicy,
	GroupPolicy,
} from "../../types.js";
import { mentionedBot, getNonBotMentions } from "./parse.js";

// ============================================================================
// 类型
// ============================================================================

export interface GateResult {
	/** 是否允许处理 */
	allowed: boolean;
	/** 拒绝原因 */
	reason?: string;
}

export interface GateConfig {
	/** 直聊策略 */
	dmPolicy?: DMPolicy;
	/** 群聊策略 */
	groupPolicy?: GroupPolicy;
	/** Bot Open ID */
	botOpenId?: string;
}

// ============================================================================
// 权限检查
// ============================================================================

/**
 * 检查是否应该响应消息
 */
export function checkMessageGate(
	ctx: MessageContext,
	config: GateConfig
): GateResult {
	const { dmPolicy = "pairing", groupPolicy = "mention", botOpenId } = config;

	// 直聊消息
	if (ctx.chatType === "p2p") {
		return checkDMMessage(ctx, dmPolicy);
	}

	// 群聊消息
	if (ctx.chatType === "group" || ctx.chatType === "topic") {
		return checkGroupMessage(ctx, groupPolicy, botOpenId);
	}

	return { allowed: false, reason: `Unknown chat type: ${ctx.chatType}` };
}

/**
 * 检查直聊消息
 */
function checkDMMessage(ctx: MessageContext, policy: DMPolicy): GateResult {
	switch (policy) {
		case "all":
			// 响应所有消息
			return { allowed: true };

		case "pairing":
			// 配对模式：响应所有直聊消息
			return { allowed: true };

		case "mention":
			// 需要 @机器人
			if (mentionedBot(ctx.mentions)) {
				return { allowed: true };
			}
			return { allowed: false, reason: "Bot not mentioned in DM" };

		default:
			return { allowed: true };
	}
}

/**
 * 检查群聊消息
 */
function checkGroupMessage(
	ctx: MessageContext,
	policy: GroupPolicy,
	botOpenId?: string
): GateResult {
	switch (policy) {
		case "all":
			// 响应所有消息
			return { allowed: true };

		case "mention":
			// 需要 @机器人
			if (mentionedBot(ctx.mentions)) {
				return { allowed: true };
			}
			return { allowed: false, reason: "Bot not mentioned in group" };

		default:
			// 默认需要 @
			if (mentionedBot(ctx.mentions)) {
				return { allowed: true };
			}
			return { allowed: false, reason: "Bot not mentioned" };
	}
}

// ============================================================================
// 提及处理
// ============================================================================

/**
 * 获取应该 @ 的目标列表（排除机器人）
 */
export function getMentionTargets(
	mentions: MentionInfo[],
	botOpenId?: string
): string[] {
	const nonBotMentions = getNonBotMentions(mentions);
	return nonBotMentions.map((m) => m.openId);
}

/**
 * 构建飞书 @ 格式
 */
export function buildFeishuMention(openId: string): string {
	return `<at user_id="${openId}"></at>`;
}

/**
 * 构建多个 @
 */
export function buildFeishuMentions(openIds: string[]): string {
	return openIds.map(buildFeishuMention).join(" ");
}
