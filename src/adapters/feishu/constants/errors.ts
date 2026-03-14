/**
 * Lark/Feishu Error Constants
 *
 * 飞书 API 错误码常量定义
 * 参考: openclaw-lark/src/core/auth-errors.ts
 */

// ============================================================================
// Error Codes
// ============================================================================

/**
 * 飞书 API 错误码
 */
export const LARK_ERROR = {
	/** 应用 scope 不足（租户维度） */
	APP_SCOPE_MISSING: 99991672,
	/** 用户 token scope 不足 */
	USER_SCOPE_INSUFFICIENT: 99991679,
	/** access_token 无效 */
	TOKEN_INVALID: 99991668,
	/** access_token 已过期 */
	TOKEN_EXPIRED: 99991669,
	/** refresh_token 无效 */
	REFRESH_TOKEN_INVALID: 20003,
	/** refresh_token 已过期 */
	REFRESH_TOKEN_EXPIRED: 20004,
	/** 消息已被撤回 */
	MESSAGE_RECALLED: 230011,
	/** 消息已被删除 */
	MESSAGE_DELETED: 231003,
	/** 速率限制 */
	RATE_LIMITED: 230020,
} as const;

/**
 * 消息终止错误码集合
 * 当消息被撤回或删除时，后续 API 调用应该被终止
 */
export const MESSAGE_TERMINAL_CODES: ReadonlySet<number> = new Set([
	LARK_ERROR.MESSAGE_RECALLED,
	LARK_ERROR.MESSAGE_DELETED,
]);

/**
 * 授权相关错误码集合
 */
export const AUTH_ERROR_CODES: ReadonlySet<number> = new Set([
	LARK_ERROR.APP_SCOPE_MISSING,
	LARK_ERROR.USER_SCOPE_INSUFFICIENT,
	LARK_ERROR.TOKEN_INVALID,
	LARK_ERROR.TOKEN_EXPIRED,
	LARK_ERROR.REFRESH_TOKEN_INVALID,
	LARK_ERROR.REFRESH_TOKEN_EXPIRED,
]);

// ============================================================================
// Type Guards
// ============================================================================

/**
 * 终止消息 API 错误码类型
 */
export type TerminalMessageApiCode =
	| typeof LARK_ERROR.MESSAGE_RECALLED
	| typeof LARK_ERROR.MESSAGE_DELETED;

/**
 * 检查错误码是否是消息终止错误
 */
export function isTerminalMessageApiCode(code: unknown): code is TerminalMessageApiCode {
	return typeof code === "number" && MESSAGE_TERMINAL_CODES.has(code);
}

/**
 * 检查错误码是否是授权错误
 */
export function isAuthErrorCode(code: unknown): code is number {
	return typeof code === "number" && AUTH_ERROR_CODES.has(code);
}

/**
 * 检查错误码是否是速率限制错误
 */
export function isRateLimitError(code: unknown): boolean {
	return code === LARK_ERROR.RATE_LIMITED;
}

// ============================================================================
// Error Extraction
// ============================================================================

/**
 * 从飞书 API 错误中提取错误码
 * 支持多种错误格式：
 * - error.code
 * - error.response.data.code
 * - error.data.code
 */
export function extractLarkApiCode(error: unknown): number | undefined {
	if (!error || typeof error !== "object") {
		return undefined;
	}

	const err = error as Record<string, unknown>;

	// 直接检查 error.code
	if (typeof err.code === "number") {
		return err.code;
	}

	// 检查 error.response.data.code
	const response = err.response as Record<string, unknown> | undefined;
	if (response) {
		const data = response.data as Record<string, unknown> | undefined;
		if (data && typeof data.code === "number") {
			return data.code;
		}
	}

	// 检查 error.data.code
	const data = err.data as Record<string, unknown> | undefined;
	if (data && typeof data.code === "number") {
		return data.code;
	}

	return undefined;
}

/**
 * 从飞书 API 错误中提取错误信息
 */
export function extractLarkErrorMessage(error: unknown): string | undefined {
	if (!error || typeof error !== "object") {
		return undefined;
	}

	const err = error as Record<string, unknown>;

	// 直接检查 error.msg
	if (typeof err.msg === "string") {
		return err.msg;
	}

	// 检查 error.message
	if (typeof err.message === "string") {
		return err.message;
	}

	// 检查 error.response.data.msg
	const response = err.response as Record<string, unknown> | undefined;
	if (response) {
		const data = response.data as Record<string, unknown> | undefined;
		if (data) {
			if (typeof data.msg === "string") {
				return data.msg;
			}
			if (typeof data.message === "string") {
				return data.message;
			}
		}
	}

	return undefined;
}
