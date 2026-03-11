/**
 * Permission URL Extraction Utilities
 *
 * 从飞书 API 错误消息中提取授权 URL
 */

/**
 * 提取授权 URL 并优化（只保留最高优先级权限）
 */
export function extractPermissionGrantUrl(msg: string): string {
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
 * 提取权限列表
 */
export function extractPermissionScopes(msg: string): string {
	const scopeMatch = msg.match(/\[([^\]]+)\]/);
	return scopeMatch?.[1] ?? "unknown";
}

/**
 * 权限优先级（数字越小优先级越高）
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
 * 提取最高优先级的权限
 */
function extractHighestPriorityScope(scopeList: string): string {
	return scopeList
		.split(",")
		.sort((a, b) => getPermissionPriority(a) - getPermissionPriority(b))[0] ?? "";
}
