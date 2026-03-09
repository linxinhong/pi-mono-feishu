/**
 * Feishu Adapter Types
 *
 * 飞书适配器的类型定义
 */

import type { Logger } from "../../utils/logger/types.js";

// ============================================================================
// Feishu Adapter Configuration
// ============================================================================

/**
 * 飞书适配器配置
 */
export interface FeishuAdapterConfig {
	/** 平台类型 */
	platform: "feishu";
	/** 是否启用 */
	enabled: boolean;
	/** App ID */
	appId: string;
	/** App Secret */
	appSecret: string;
	/** Encrypt Key (可选) */
	encryptKey?: string;
	/** Verification Token (可选) */
	verificationToken?: string;
	/** 品牌: feishu 或 lark */
	brand?: "feishu" | "lark";
	/** 连接模式: websocket 或 webhook */
	connectionMode?: "websocket" | "webhook";
	/** Webhook 端口 (仅 webhook 模式) */
	webhookPort?: number;
	/** 默认模型 */
	defaultModel?: string;
	/** 日志器 */
	logger?: Logger;
}

// ============================================================================
// Feishu Channel Data
// ============================================================================

/**
 * 飞书频道数据
 *
 * 用于发送消息时需要的上下文信息
 */
export interface FeishuChannelData {
	/** 配置对象 (传递给 feishu-openclaw-plugin) */
	cfg: {
		feishu: {
			accounts: Record<string, FeishuAccountConfig>;
		};
	};
	/** 账户 ID */
	accountId: string;
	/** 聊天 ID */
	chatId: string;
	/** 消息 ID (用于回复) */
	messageId?: string;
	/** 是否回复到话题 */
	replyInThread?: boolean;
}

/**
 * 飞书账户配置
 */
export interface FeishuAccountConfig {
	app_id: string;
	app_secret: string;
	encrypt_key?: string;
	verification_token?: string;
	brand?: "feishu" | "lark";
}

// ============================================================================
// Tool Call Info
// ============================================================================

/**
 * 工具调用信息
 */
export interface ToolCallInfo {
	/** 工具名称 */
	name: string;
	/** 状态: running, complete, error */
	status: "running" | "complete" | "error";
	/** 参数 (可选) */
	params?: Record<string, unknown>;
	/** 结果 (可选) */
	result?: string;
}

// ============================================================================
// Card Types
// ============================================================================

/**
 * 卡片状态
 */
export type CardState = "thinking" | "streaming" | "complete" | "confirm";

/**
 * 卡片构建选项
 */
export interface CardBuildOptions {
	/** 文本内容 */
	text?: string;
	/** 思考过程文本 */
	reasoningText?: string;
	/** 思考耗时 (ms) */
	reasoningElapsedMs?: number;
	/** 工具调用列表 */
	toolCalls?: ToolCallInfo[];
	/** 总耗时 (ms) */
	elapsedMs?: number;
	/** 是否错误 */
	isError?: boolean;
	/** 是否中止 */
	isAborted?: boolean;
	/** 页脚配置 */
	footer?: {
		status?: boolean;
		elapsed?: boolean;
	};
}

// ============================================================================
// Message Types
// ============================================================================

/**
 * 消息上下文 (从 feishu-openclaw-plugin 解析)
 */
export interface MessageContext {
	/** 聊天 ID */
	chatId: string;
	/** 消息 ID */
	messageId: string;
	/** 发送者 ID */
	senderId: string;
	/** 聊天类型 */
	chatType: "p2p" | "group" | "topic_group";
	/** 根消息 ID */
	rootId?: string;
	/** 父消息 ID */
	parentId?: string;
	/** 话题 ID */
	threadId?: string;
	/** 消息内容 */
	content: string;
	/** 内容类型 */
	contentType: string;
	/** 资源列表 */
	resources?: Record<string, unknown>;
	/** 提及列表 */
	mentions: MentionInfo[];
	/** 创建时间 */
	createTime?: number;
	/** 原始消息 */
	rawMessage?: unknown;
	/** 原始发送者 */
	rawSender?: unknown;
}

/**
 * 提及信息
 */
export interface MentionInfo {
	/** 提及 key */
	key: string;
	/** Open ID */
	openId: string;
	/** 名称 */
	name: string;
	/** 是否是 Bot */
	isBot: boolean;
}
