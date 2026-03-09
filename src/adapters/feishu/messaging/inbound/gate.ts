/**
 * 鶈息权限检查
 */

import type { MessageContext, DMPolicy, GroupPolicy } from "../../types.js";
import { mentionedBot } from "./parse.js";

// ============================================================================
// 类型
// ============================================================================

export interface GateResult {
	allowed: boolean;
	reason?: string;
}

export interface GateConfig {
	dmPolicy?: DMPolicy;
	groupPolicy?: GroupPolicy;
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

	if (ctx.chatType === "p2p") {
		return checkDMMessage(ctx, dmPolicy);
	}

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
			return { allowed: true };
		case "pairing":
			return { allowed: true };
		case "mention":
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
			return { allowed: true };
		case "mention":
			if (mentionedBot(ctx.mentions)) {
				return { allowed: true };
			}
			return { allowed: false, reason: "Bot not mentioned in group" };
		default:
			if (mentionedBot(ctx.mentions)) {
				return { allowed: true };
			}
			return { allowed: false, reason: "Bot not mentioned" };
	}
}
