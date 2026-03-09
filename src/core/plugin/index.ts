/**
 * Core Plugin System
 *
 * 通用插件系统，平台无关
 */

// Types
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
} from "./types.js";

// 注意：ChannelInfo 和 UserInfo 从 platform 模块导出，避免重复

// Constants
export { CAPABILITIES } from "./types.js";

// Context
export type { FeishuCompatibleContext, BuildPluginContextParams } from "./context.js";
export {
	buildPluginContext,
	buildFeishuCompatibleContext,
	createMessageContext,
	isFeishuCompatibleContext,
} from "./context.js";

// Manager
export { PluginManager } from "./manager.js";

// Loader
export { discoverPlugins, loadPlugins } from "./loader.js";
