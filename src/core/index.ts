/**
 * Core Module - 核心模块导出
 */

// ============================================================================
// Platform Module
// ============================================================================

export * from "./platform/index.js";

// ============================================================================
// Model Module
// ============================================================================

export * from "./model/index.js";

// ============================================================================
// Agent Module
// ============================================================================

export * from "./agent/index.js";

// ============================================================================
// Plugin System (New)
// ============================================================================

export * from "./plugin/index.js";

// ============================================================================
// Store Module
// ============================================================================

// 导出通用类型和基类
export type { Attachment, LoggedMessage, BaseStoreConfig, PlatformStore } from "./store/types.js";
export { BaseStore } from "./store/base.js";

// 导出飞书 Store 作为默认 Store（向后兼容）
export { FeishuStore as Store } from "../adapters/feishu/store.js";

// ============================================================================
// Adapter System (New)
// ============================================================================

export * from "./adapter/index.js";

// ============================================================================
// Adapters Module (re-export for convenience)
// ============================================================================

// 显式导出 adapters 模块，避免与 platform 模块的类型冲突
export {
	// 核心适配器
	FeishuAdapter,
	feishuAdapterFactory,
	type FeishuBotConfig,
	FeishuPlatformContext,
	type FeishuContextConfig,
	// 平台能力
	FeishuCapabilities,
	createFeishuCapabilities,
	getFeishuCapabilityList,
	type FeishuCapabilitiesConfig,
	// 消息解析
	parseFeishuMessage,
	isThreadReply,
	isP2PMessage,
	isBotMention,
	buildTextContent,
	buildPostContent,
	// 类型定义
	type FeishuMessageEvent,
	type FeishuEventMessage,
	type FeishuEventSender,
	type FeishuMessageType,
	type FeishuEvent,
	type TextContent,
	type PostContent,
	type PostParagraph,
	type PostElement,
	type ImageContent,
	type FileContent,
	type AudioContent,
	type MediaContent,
	type Mention,
	type FeishuEmojiType,
	type Reaction,
	type FeishuConfig,
	type SendMessageOptions,
	type UpdateMessageOptions,
	type ThreadReplyOptions,
	// 出站消息功能
	FeishuOutbound,
	FeishuReactions,
	EMOJI_TYPES,
	FeishuThread,
	FeishuChatManage,
	type ChatInfo,
	type ChatMember,
	// 卡片功能
	buildTextCard,
	buildCodeCard,
	buildErrorCard,
	buildSuccessCard,
	buildStatusCard,
	buildProgressCard,
	autoBuildCard,
	FeishuCards,
	// 工具功能
	FeishuTaskTool,
	FeishuBitableTool,
	FeishuDocTool,
	FeishuCalendarTool,
	FeishuWikiTool,
	FeishuDriveTool,
	FeishuToolsManager,
	createFeishuTools,
	type Task,
	type TaskList,
	type BitableRecord,
	type BitableField,
	type BitableInfo,
	type BitableTable,
	type BitableView,
	type DocInfo,
	type DocContent,
	type DocBlock,
	type CalendarEvent,
	type CalendarInfo,
	type WikiNode,
	type WikiSpace,
	type DriveFile,
	type DriveFolder,
} from "../adapters/index.js";

// ============================================================================
// Unified Bot (New Architecture)
// ============================================================================

export { UnifiedBot, createUnifiedBot, type UnifiedBotConfig } from "./unified-bot.js";
