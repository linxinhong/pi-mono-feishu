/**
 * Platform Tools Naming
 *
 * 工具命名规范和常量
 */

import type { PlatformToolMeta } from "./types.js";

// ============================================================================
// Tool Name Constants
// ============================================================================

/**
 * 飞书工具名称常量
 */
export const FEISHU_TOOL_NAMES = {
	// Task tools
	TASK_LIST: "feishu_task_list",
	TASK_GET: "feishu_task_get",
	TASK_CREATE: "feishu_task_create",
	TASK_UPDATE: "feishu_task_update",
	TASK_DELETE: "feishu_task_delete",
	TASK_COMPLETE: "feishu_task_complete",
	TASK_CANCEL: "feishu_task_cancel",

	// Calendar tools
	CALENDAR_LIST: "feishu_calendar_list",
	CALENDAR_GET: "feishu_calendar_get",
	CALENDAR_EVENT_LIST: "feishu_calendar_event_list",
	CALENDAR_EVENT_GET: "feishu_calendar_event_get",
	CALENDAR_EVENT_CREATE: "feishu_calendar_event_create",
	CALENDAR_EVENT_UPDATE: "feishu_calendar_event_update",
	CALENDAR_EVENT_DELETE: "feishu_calendar_event_delete",
	CALENDAR_EVENT_SEARCH: "feishu_calendar_event_search",

	// Bitable tools
	BITABLE_LIST: "feishu_bitable_list",
	BITABLE_GET: "feishu_bitable_get",
	BITABLE_TABLE_LIST: "feishu_bitable_table_list",
	BITABLE_RECORD_LIST: "feishu_bitable_record_list",
	BITABLE_RECORD_CREATE: "feishu_bitable_record_create",
	BITABLE_RECORD_UPDATE: "feishu_bitable_record_update",
	BITABLE_RECORD_DELETE: "feishu_bitable_record_delete",

	// Doc tools
	DOC_GET: "feishu_doc_get",
	DOC_CREATE: "feishu_doc_create",
	DOC_CONTENT_GET: "feishu_doc_content_get",
	DOC_BLOCK_LIST: "feishu_doc_block_list",
	DOC_BLOCK_CREATE: "feishu_doc_block_create",

	// Wiki tools
	WIKI_SPACE_LIST: "feishu_wiki_space_list",
	WIKI_NODE_LIST: "feishu_wiki_node_list",
	WIKI_NODE_GET: "feishu_wiki_node_get",
	WIKI_NODE_CREATE: "feishu_wiki_node_create",

	// Drive tools
	DRIVE_FILE_LIST: "feishu_drive_file_list",
	DRIVE_FILE_GET: "feishu_drive_file_get",
	DRIVE_FILE_UPLOAD: "feishu_drive_file_upload",
	DRIVE_FILE_DOWNLOAD: "feishu_drive_file_download",
	DRIVE_FOLDER_CREATE: "feishu_drive_folder_create",
	DRIVE_FILE_SEARCH: "feishu_drive_file_search",
} as const;

/**
 * 所有平台工具名称
 */
export const TOOL_NAMES = {
	FEISHU: FEISHU_TOOL_NAMES,
} as const;

// ============================================================================
// Naming Functions
// ============================================================================

/**
 * 构建工具名称
 *
 * 命名规范：{platform}_{category}_{action}
 * 示例：feishu_task_list, discord_channel_create
 *
 * @param platform 平台标识
 * @param category 工具分类
 * @param action 操作名称
 * @returns 工具名称
 */
export function buildToolName(platform: string, category: string, action: string): string {
	return `${platform}_${category}_${action}`;
}

/**
 * 解析工具名称
 *
 * @param name 工具名称
 * @returns 平台元数据，如果不是有效的平台工具名称则返回 null
 */
export function parseToolName(name: string): PlatformToolMeta | null {
	const parts = name.split("_");
	if (parts.length < 3) {
		return null;
	}

	return {
		platform: parts[0],
		category: parts[1],
		localName: parts.slice(2).join("_"),
	};
}

/**
 * 检查是否是平台工具名称
 *
 * @param name 工具名称
 * @param platform 可选的平台标识，用于检查特定平台的工具
 * @returns 是否是平台工具
 */
export function isPlatformToolName(name: string, platform?: string): boolean {
	const meta = parseToolName(name);
	if (!meta) return false;
	if (platform) return meta.platform === platform;
	return true;
}
