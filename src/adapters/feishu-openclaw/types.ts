/**
 * feishu-openclaw 适配器类型定义
 *
 * 定义 OpenClaw 配置接口和适配器特有类型
 */

import type { PlatformConfig, UserInfo, ChannelInfo } from "../../core/platform/context.js";
import type { Sender, Chat, Attachment } from "../../core/platform/message.js";

// ============================================================================
// OpenClaw Plugin Types (re-exported for convenience)
// ============================================================================

/**
 * 飞书品牌类型
 */
export type LarkBrand = "feishu" | "lark" | string;

/**
 * 连接模式
 */
export type FeishuConnectionMode = "websocket" | "webhook";

/**
 * 提及信息
 */
export interface MentionInfo {
	/** 占位符 key */
	key: string;
	/** 飞书 Open ID */
	openId: string;
	/** 显示名称 */
	name: string;
	/** 是否提及机器人 */
	isBot: boolean;
}

/**
 * 资源描述符
 */
export interface ResourceDescriptor {
	type: "image" | "file" | "audio" | "video" | "sticker";
	fileKey: string;
	fileName?: string;
	duration?: number;
	coverImageKey?: string;
}

/**
 * OpenClaw 消息上下文
 */
export interface OpenClawMessageContext {
	chatId: string;
	messageId: string;
	senderId: string;
	senderName?: string;
	chatType: "p2p" | "group";
	content: string;
	contentType: string;
	resources: ResourceDescriptor[];
	mentions: MentionInfo[];
	rootId?: string;
	parentId?: string;
	threadId?: string;
	createTime?: number;
	rawMessage: any;
	rawSender: any;
}

/**
 * 飞书消息事件
 */
export interface FeishuMessageEvent {
	sender: {
		sender_id: {
			open_id?: string;
			user_id?: string;
			union_id?: string;
		};
		sender_type?: string;
		tenant_key?: string;
	};
	message: {
		message_id: string;
		root_id?: string;
		parent_id?: string;
		create_time?: string;
		update_time?: string;
		chat_id: string;
		thread_id?: string;
		chat_type: "p2p" | "group";
		message_type: string;
		content: string;
		mentions?: Array<{
			key: string;
			id: {
				open_id?: string;
				user_id?: string;
				union_id?: string;
			};
			name: string;
			tenant_key?: string;
		}>;
		user_agent?: string;
	};
}

// ============================================================================
// Adapter Configuration
// ============================================================================

/**
 * feishu-openclaw 适配器配置
 */
export interface OpenClawAdapterConfig extends PlatformConfig {
	/** 平台类型 */
	platform: "feishu-openclaw";
	/** 是否启用 */
	enabled: boolean;
	/** 飞书 App ID */
	appId: string;
	/** 飞书 App Secret */
	appSecret: string;
	/** 账户 ID（用于多账户支持） */
	accountId?: string;
	/** 品牌 */
	brand?: LarkBrand;
	/** 连接模式 */
	connectionMode?: FeishuConnectionMode;
	/** 工作目录 */
	workingDir: string;
	/** 服务端口 */
	port?: number;
	/** 加密 Key */
	encryptKey?: string;
	/** 验证 Token */
	verificationToken?: string;
	/** 默认模型 */
	model?: string;
	/** 额外的 HTTP headers */
	extraHttpHeaders?: Record<string, string>;
}

// ============================================================================
// Bot Configuration
// ============================================================================

/**
 * feishu-openclaw Bot 配置
 */
export interface OpenClawBotConfig {
	/** 工作目录 */
	workspaceDir: string;
	/** 飞书 App ID */
	appId: string;
	/** 飞书 App Secret */
	appSecret: string;
	/** 账户 ID */
	accountId?: string;
	/** 品牌 */
	brand?: LarkBrand;
	/** 连接模式 */
	connectionMode?: FeishuConnectionMode;
	/** 端口 */
	port?: number;
	/** 默认模型 */
	model?: string;
	/** 插件配置 */
	plugins?: Record<string, any>;
	/** Sandbox 配置 */
	sandbox?: any;
	/** 日志配置 */
	logging?: any;
	/** 额外的 HTTP headers */
	extraHttpHeaders?: Record<string, string>;
}

// ============================================================================
// Send Parameters
// ============================================================================

/**
 * 发送参数（转换为 OpenClaw 格式）
 */
export interface OpenClawSendParams {
	/** 目标 ID */
	to: string;
	/** 文本内容 */
	text?: string;
	/** 卡片内容 */
	card?: any;
	/** 媒体 URL */
	mediaUrl?: string;
	/** 媒体本地根目录 */
	mediaLocalRoots?: string[];
	/** 回复的消息 ID */
	replyToId?: string;
	/** 是否在话题中回复 */
	threadId?: string;
	/** 账户 ID */
	accountId?: string;
}

/**
 * 发送结果
 */
export interface OpenClawSendResult {
	channel: "feishu";
	messageId: string;
	chatId: string;
	meta?: {
		warnings?: string[];
	};
}

// ============================================================================
// LarkClient Interface
// ============================================================================

/**
 * LarkClient 接口（简化版）
 */
export interface LarkClientInterface {
	/** 账户 ID */
	accountId: string;
	/** SDK 客户端 */
	sdk: any;
	/** Bot Open ID */
	botOpenId?: string;
	/** Bot 名称 */
	botName?: string;
	/** 探测 Bot 信息 */
	probe(): Promise<{
		ok: boolean;
		appId?: string;
		botName?: string;
		botOpenId?: string;
		error?: string;
	}>;
	/** 启动 WebSocket */
	startWS(opts: {
		handlers: Record<string, (data: any) => Promise<void>>;
		abortSignal?: AbortSignal;
		autoProbe?: boolean;
	}): Promise<void>;
	/** 断开连接 */
	disconnect(): void;
	/** WebSocket 是否已连接 */
	wsConnected: boolean;
}

// ============================================================================
// OpenClaw Config (for plugin compatibility)
// ============================================================================

/**
 * OpenClaw 插件配置接口
 * 这是为了兼容 feishu-openclaw-plugin 的配置格式
 */
export interface OpenClawPluginConfig {
	/** 账户配置 */
	accounts?: Record<string, {
		appId: string;
		appSecret: string;
		brand?: LarkBrand;
		encryptKey?: string;
		verificationToken?: string;
		connectionMode?: FeishuConnectionMode;
		extra?: {
			domain?: string;
			httpHeaders?: Record<string, string>;
		};
	}>;
	/** 默认账户 */
	defaultAccount?: string;
}

// ============================================================================
// Context Types
// ============================================================================

/**
 * 适配器内部上下文
 */
export interface AdapterInternalContext {
	/** 当前聊天的消息 ID（用于回复） */
	currentMessageId?: string;
	/** 根消息 ID（用于话题） */
	rootId?: string;
	/** 父消息 ID */
	parentId?: string;
	/** 话题 ID */
	threadId?: string;
	/** 发送者信息 */
	sender?: Sender;
	/** 聊天信息 */
	chat?: Chat;
}
