/**
 * Message Unavailable Guard
 *
 * 消息不可用（已撤回/已删除）状态管理
 * 参考: openclaw-lark/src/core/message-unavailable.ts
 *
 * 目标：
 * 1) 当命中飞书终止错误码（230011/231003）时，按 message_id 标记不可用；
 * 2) 后续针对该 message_id 的 API 调用直接短路，避免持续报错刷屏。
 */

import { LARK_ERROR, isTerminalMessageApiCode, extractLarkApiCode, type TerminalMessageApiCode } from "../constants/errors.js";

// Re-export for convenience
export type { TerminalMessageApiCode } from "../constants/errors.js";

// ============================================================================
// Types
// ============================================================================

export interface MessageUnavailableState {
	/** API 错误码 */
	apiCode: TerminalMessageApiCode;
	/** 标记时间戳 */
	markedAtMs: number;
	/** 操作描述 */
	operation?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** 缓存过期时间：30 分钟 */
const UNAVAILABLE_CACHE_TTL_MS = 30 * 60 * 1000;

/** 缓存清理阈值：超过此大小时触发清理 */
const MAX_CACHE_SIZE_BEFORE_PRUNE = 512;

// ============================================================================
// Cache
// ============================================================================

const unavailableMessageCache = new Map<string, MessageUnavailableState>();

/**
 * 清理过期缓存条目
 */
function pruneExpired(nowMs = Date.now()): void {
	for (const [messageId, state] of unavailableMessageCache) {
		if (nowMs - state.markedAtMs > UNAVAILABLE_CACHE_TTL_MS) {
			unavailableMessageCache.delete(messageId);
		}
	}
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * 规范化 message_id
 * 处理合成 ID（如 "om_xxx:auth-complete"）
 */
export function normalizeMessageId(messageId: string | undefined): string | undefined {
	if (!messageId) return undefined;

	// 移除合成 ID 的后缀（如 ":auth-complete"）
	const colonIndex = messageId.indexOf(":");
	if (colonIndex > 0) {
		return messageId.substring(0, colonIndex);
	}
	return messageId;
}

/**
 * 标记消息为不可用
 */
export function markMessageUnavailable(params: {
	messageId: string;
	apiCode: TerminalMessageApiCode;
	operation?: string;
}): void {
	const normalizedId = normalizeMessageId(params.messageId);
	if (!normalizedId) return;

	// 如果缓存过大，先清理过期条目
	if (unavailableMessageCache.size >= MAX_CACHE_SIZE_BEFORE_PRUNE) {
		pruneExpired();
	}

	unavailableMessageCache.set(normalizedId, {
		apiCode: params.apiCode,
		operation: params.operation,
		markedAtMs: Date.now(),
	});
}

/**
 * 从错误中标记消息为不可用
 * @returns 如果是终止错误码，返回该错误码；否则返回 undefined
 */
export function markMessageUnavailableFromError(params: {
	messageId: string | undefined;
	error: unknown;
	operation?: string;
}): TerminalMessageApiCode | undefined {
	const normalizedId = normalizeMessageId(params.messageId);
	if (!normalizedId) return undefined;

	const code = extractLarkApiCode(params.error);
	if (!isTerminalMessageApiCode(code)) return undefined;

	markMessageUnavailable({
		messageId: normalizedId,
		apiCode: code,
		operation: params.operation,
	});
	return code;
}

/**
 * 获取消息不可用状态
 */
export function getMessageUnavailableState(
	messageId: string | undefined,
): MessageUnavailableState | undefined {
	const normalizedId = normalizeMessageId(messageId);
	if (!normalizedId) return undefined;

	const state = unavailableMessageCache.get(normalizedId);
	if (!state) return undefined;

	// 检查是否过期
	if (Date.now() - state.markedAtMs > UNAVAILABLE_CACHE_TTL_MS) {
		unavailableMessageCache.delete(normalizedId);
		return undefined;
	}

	return state;
}

/**
 * 检查消息是否不可用
 */
export function isMessageUnavailable(messageId: string | undefined): boolean {
	return !!getMessageUnavailableState(messageId);
}

/**
 * 断言消息可用，如果不可用则抛出错误
 */
export function assertMessageAvailable(messageId: string | undefined, operation?: string): void {
	const normalizedId = normalizeMessageId(messageId);
	if (!normalizedId) return;

	const state = getMessageUnavailableState(normalizedId);
	if (!state) return;

	throw new MessageUnavailableError({
		messageId: normalizedId,
		apiCode: state.apiCode,
		operation: operation ?? state.operation,
	});
}

// ============================================================================
// Error Class
// ============================================================================

export class MessageUnavailableError extends Error {
	readonly messageId: string;
	readonly apiCode: TerminalMessageApiCode;
	readonly operation?: string;

	constructor(params: { messageId: string; apiCode: TerminalMessageApiCode; operation?: string }) {
		const operationText = params.operation ? `, op=${params.operation}` : "";
		super(
			`[feishu-message-unavailable] message ${params.messageId} unavailable (code=${params.apiCode}${operationText})`,
		);
		this.name = "MessageUnavailableError";
		this.messageId = params.messageId;
		this.apiCode = params.apiCode;
		this.operation = params.operation;
	}
}

/**
 * 检查错误是否是 MessageUnavailableError
 */
export function isMessageUnavailableError(error: unknown): error is MessageUnavailableError {
	return (
		error instanceof MessageUnavailableError ||
		(typeof error === "object" &&
			error !== null &&
			(error as { name?: string }).name === "MessageUnavailableError")
	);
}

// ============================================================================
// Guard Wrapper
// ============================================================================

/**
 * 针对 message_id 的统一保护：
 * - 调用前检查是否已标记不可用；
 * - 调用报错后识别 230011/231003 并标记；
 * - 命中时抛出 MessageUnavailableError 供上游快速终止流程。
 */
export async function runWithMessageUnavailableGuard<T>(params: {
	messageId: string | undefined;
	operation: string;
	fn: () => Promise<T>;
}): Promise<T> {
	const normalizedId = normalizeMessageId(params.messageId);

	// 如果没有 messageId，直接执行
	if (!normalizedId) {
		return params.fn();
	}

	// 调用前检查
	assertMessageAvailable(normalizedId, params.operation);

	try {
		return await params.fn();
	} catch (error) {
		// 尝试从错误中标记消息不可用
		const code = markMessageUnavailableFromError({
			messageId: normalizedId,
			error,
			operation: params.operation,
		});

		if (code) {
			// 如果是终止错误，转换为 MessageUnavailableError 抛出
			throw new MessageUnavailableError({
				messageId: normalizedId,
				apiCode: code,
				operation: params.operation,
			});
		}

		// 其他错误，原样抛出
		throw error;
	}
}

/**
 * 同步版本的 message unavailable guard
 * 仅做前置检查，不处理后续错误
 */
export function withMessageUnavailableCheck<T>(params: {
	messageId: string | undefined;
	operation: string;
	fn: () => T;
}): T {
	const normalizedId = normalizeMessageId(params.messageId);

	if (normalizedId) {
		assertMessageAvailable(normalizedId, params.operation);
	}

	return params.fn();
}
