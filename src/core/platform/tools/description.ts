/**
 * Platform Tools Description
 *
 * 工具描述生成工具
 */

// ============================================================================
// Platform Display Names
// ============================================================================

/**
 * 平台显示名称映射
 */
const PLATFORM_DISPLAY_NAMES: Record<string, string> = {
	feishu: "飞书",
	discord: "Discord",
	slack: "Slack",
	wechat: "微信",
	telegram: "Telegram",
};

/**
 * 平台图标映射
 */
const PLATFORM_ICONS: Record<string, string> = {
	feishu: "📱",
	discord: "💬",
	slack: "💼",
	wechat: "💚",
	telegram: "✈️",
};

// ============================================================================
// Description Functions
// ============================================================================

/**
 * 创建平台工具描述
 *
 * 格式: "[{平台名}] {基础描述}"
 * 示例: "[飞书] 获取任务列表"
 *
 * @param platform 平台标识
 * @param baseDescription 基础描述
 * @param options 可选配置
 * @returns 完整的平台工具描述
 */
export function createPlatformDescription(
	platform: string,
	baseDescription: string,
	options?: {
		category?: string;
		examples?: string[];
	},
): string {
	const displayName = PLATFORM_DISPLAY_NAMES[platform] || platform;
	let description = `[${displayName}] ${baseDescription}`;

	if (options?.examples && options.examples.length > 0) {
		description += `\n\n示例:\n${options.examples.map((e) => `- ${e}`).join("\n")}`;
	}

	return description;
}

/**
 * 获取平台显示名称
 *
 * @param platform 平台标识
 * @returns 平台显示名称
 */
export function getPlatformDisplayName(platform: string): string {
	return PLATFORM_DISPLAY_NAMES[platform] || platform;
}

/**
 * 获取平台图标
 *
 * @param platform 平台标识
 * @returns 平台图标
 */
export function getPlatformIcon(platform: string): string {
	return PLATFORM_ICONS[platform] || "🔧";
}

/**
 * 创建工具标签
 *
 * 格式: "{图标} {平台名} - {标签}"
 * 示例: "📱 飞书 - 任务列表"
 *
 * @param platform 平台标识
 * @param label 工具标签
 * @returns 完整的工具标签
 */
export function createToolLabel(platform: string, label: string): string {
	const icon = getPlatformIcon(platform);
	const displayName = getPlatformDisplayName(platform);
	return `${icon} ${displayName} - ${label}`;
}
