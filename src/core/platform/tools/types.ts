/**
 * Platform Tools Types
 *
 * 平台工具的类型定义
 */

import type { AgentTool } from "@mariozechner/pi-agent-core";

// ============================================================================
// Types
// ============================================================================

/**
 * 平台工具元数据
 */
export interface PlatformToolMeta {
	/** 平台标识：feishu, discord, slack */
	platform: string;
	/** 工具分类：task, calendar, drive, bitable, doc, wiki */
	category: string;
	/** 操作名称：list, create, delete, get, update, search */
	localName: string;
}

/**
 * 平台工具定义（扩展 AgentTool）
 *
 * 工具命名规范：{platform}_{category}_{action}
 * 示例：feishu_task_list, feishu_calendar_create
 */
// 使用 any 类型避免复杂的类型约束问题
export type PlatformTool = AgentTool<any> & {
	/** 平台元数据 */
	platformMeta: PlatformToolMeta;
};
