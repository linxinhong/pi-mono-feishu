/**
 * Permission Error Detection
 *
 * 权限错误检测 - 从飞书 API 错误中提取权限信息
 */

// ============================================================================
// Types
// ============================================================================

/**
 * 权限错误信息
 */
export interface PermissionError {
	/** 飞书错误码 */
	code: number;
	/** 错误消息 */
	message: string;
	/** 权限授权链接 */
	grantUrl: string;
	/** 需要的权限范围 */
	scopes: string;
}

// ============================================================================
// Permission URL Extraction
// ============================================================================

/**
 * 获取权限优先级（用于排序）
 * - read: 1 (最高)
 * - write: 2
 * - other: 3 (最低)
 */
function getPermissionPriority(scope: string): number {
	const lowerScope = scope.toLowerCase();
	const hasRead = lowerScope.includes("read");
	const hasWrite = lowerScope.includes("write");
	if (hasRead && !hasWrite) return 1;
	if (hasWrite && !hasRead) return 2;
	return 3;
}

/**
 * 提取最高优先级的权限范围
 */
function extractHighestPriorityScope(scopeList: string): string {
	return (
		scopeList
			.split(",")
			.sort((a, b) => getPermissionPriority(a) - getPermissionPriority(b))[0] ?? ""
	);
}

/**
 * 从飞书错误消息中提取权限授权 URL
 */
function extractPermissionGrantUrl(msg: string): string {
	const urlMatch = msg.match(/https:\/\/[^\s]+\/app\/[^\s]+/);
	if (!urlMatch?.[0]) {
		return "";
	}
	try {
		const url = new URL(urlMatch[0]);
		const scopeListParam = url.searchParams.get("q") ?? "";
		const firstScope = extractHighestPriorityScope(scopeListParam);
		if (firstScope) {
			url.searchParams.set("q", firstScope);
		}
		return url.href;
	} catch {
		return urlMatch[0];
	}
}

/**
 * 从飞书错误消息中提取权限范围
 */
function extractPermissionScopes(msg: string): string {
	const scopeMatch = msg.match(/\[([^\]]+)\]/);
	return scopeMatch?.[1] ?? "unknown";
}

// ============================================================================
// Permission Error Extraction
// ============================================================================

/**
 * 从飞书错误对象中提取权限错误信息
 */
function extractFromFeishuError(feishuErr: any): PermissionError | null {
	const msg = feishuErr.msg ?? "";
	const grantUrl = extractPermissionGrantUrl(msg);
	if (!grantUrl) return null;

	return {
		code: feishuErr.code,
		message: msg,
		grantUrl,
		scopes: extractPermissionScopes(msg),
	};
}

/**
 * 从飞书 API 错误中提取权限错误信息
 *
 * 支持多种错误结构：
 * 1. 嵌套数组结构 [[axiosErr, feishuErr]] - SDK 合并错误
 * 2. SDK 合并字段 - 直接在错误对象上有 code 和 msg
 * 3. 标准 Axios 错误 - err.response.data
 *
 * @param err - 错误对象
 * @returns 权限错误信息，如果不是权限错误则返回 null
 */
export function extractPermissionError(err: unknown): PermissionError | null {
	if (!err || typeof err !== "object") {
		return null;
	}

	// 路径 1: 嵌套数组结构 [[axiosErr, feishuErr]]
	// 这种结构来自飞书 SDK 将多个错误合并返回
	if (Array.isArray(err)) {
		for (const item of err) {
			if (Array.isArray(item)) {
				// 嵌套数组 [[...]]
				for (const subItem of item) {
					if (subItem && typeof subItem === "object" && subItem.code === 99991672) {
						const result = extractFromFeishuError(subItem);
						if (result) return result;
					}
				}
			} else if (item && typeof item === "object" && item.code === 99991672) {
				// 扁平数组 [...]
				const result = extractFromFeishuError(item);
				if (result) return result;
			}
		}
	}

	// 路径 2: SDK 合并字段（直接在错误对象上）
	// 飞书 SDK 有时会把错误信息直接放在顶层
	const anyErr = err as any;
	if (typeof anyErr.code === "number" && anyErr.msg) {
		if (anyErr.code === 99991672) {
			const result = extractFromFeishuError(anyErr);
			if (result) return result;
		}
	}

	// 路径 3: 标准 Axios 错误（err.response.data）
	const data = anyErr.response?.data;
	if (data && typeof data === "object") {
		if (data.code === 99991672) {
			const result = extractFromFeishuError(data);
			if (result) return result;
		}
	}

	return null;
}

// ============================================================================
// Cooldown Tracking
// ============================================================================

/** 权限错误通知冷却时间（5 分钟） */
export const PERMISSION_ERROR_COOLDOWN_MS = 5 * 60 * 1000;

/** 权限错误通知时间记录 */
export const permissionErrorNotifiedAt = new Map<string, number>();

/**
 * 检查是否应该发送权限错误通知（考虑冷却时间）
 */
export function shouldNotifyPermissionError(key: string): boolean {
	const now = Date.now();
	const lastNotified = permissionErrorNotifiedAt.get(key);
	if (lastNotified && now - lastNotified < PERMISSION_ERROR_COOLDOWN_MS) {
		return false;
	}
	permissionErrorNotifiedAt.set(key, now);
	return true;
}
