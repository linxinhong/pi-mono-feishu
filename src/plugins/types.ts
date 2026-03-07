/**
 * Plugin System Types
 *
 * 插件化架构的核心类型定义
 *
 * 注意：此文件现在从 core/plugin/types.ts 重新导出类型，并提供向后兼容的类型别名
 */

import type { AgentTool } from "@mariozechner/pi-agent-core";

// ============================================================================
// Re-export from Core Plugin System
// ============================================================================

// 从新的核心插件系统重新导出所有类型
// 注意：ChannelInfo 和 UserInfo 从 core/platform 导出，避免重复
export type {
	Plugin,
	PluginMeta,
	PluginConfig,
	PluginsConfig,
	PluginContext,
	PluginInitContext,
	PluginEvent,
	PluginManagerConfig,
	MessageEvent,
	ScheduledEvent,
	SystemEvent,
	MessageContext,
	PlatformCapabilities,
	Attachment,
	ToolContext,
	CapabilityName,
} from "../core/plugin/types.js";

// 从 platform 模块导出 ChannelInfo 和 UserInfo
export type { ChannelInfo, UserInfo } from "../core/platform/message.js";

// 导出能力常量
export { CAPABILITIES } from "../core/plugin/types.js";

// 导出上下文构建器
export type { FeishuCompatibleContext, BuildPluginContextParams } from "../core/plugin/context.js";
export {
	buildPluginContext,
	buildFeishuCompatibleContext,
	createMessageContext,
	isFeishuCompatibleContext,
} from "../core/plugin/context.js";

// 导出插件管理器
export { PluginManager } from "../core/plugin/manager.js";

// ============================================================================
// Backward Compatibility Types (Deprecated)
// ============================================================================

import type { Plugin, PluginContext } from "../core/plugin/types.js";
import type { FeishuCompatibleContext } from "../core/plugin/context.js";

/**
 * 飞书插件接口
 *
 * @deprecated 使用 Plugin 代替。新插件应使用通用的 Plugin 接口，
 * 并通过 context.capabilities 访问平台能力
 */
export type FeishuPlugin = Plugin;

/**
 * 飞书插件上下文
 *
 * @deprecated 使用 PluginContext 代替。新代码应使用 PluginContext + capabilities。
 * 如果需要飞书特定方法，可以使用 buildFeishuCompatibleContext() 创建兼容上下文。
 */
export type FeishuPluginContext = FeishuCompatibleContext;
