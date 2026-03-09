/**
 * Feishu Adapter 类型定义
 */

// ============================================================================
// 飞书品牌类型
// ============================================================================

/**
 * 飞书品牌类型
 */
export type LarkBrand = "feishu" | "lark" | string;

/**
 * 直聊策略
 */
export type DMPolicy = "pairing" | "mention" | "all";

/**
 * 群聊策略
 */
export type GroupPolicy = "mention" | "all";

// ============================================================================
// 账户配置
// ============================================================================

/**
 * 飞书账户配置
 */
export interface FeishuAccountConfig {
	/** 账户 ID */
	accountId: string;
	/** 应用 ID */
	appId: string;
	/** 应用密钥 */
	appSecret: string;
	/** 加密密钥（可选） */
	encryptKey?: string;
	/** 验证令牌（可选） */
	verificationToken?: string;
	/** 品牌：feishu 或 lark */
	brand?: LarkBrand;
	/** 直聊策略 */
	dmPolicy?: DMPolicy;
	/** 群聊策略 */
	groupPolicy?: GroupPolicy;
	/** 是否启用流式卡片 */
	streaming?: boolean;
	/** 账户名称 */
	name?: string;
	/** 额外配置 */
	extra?: {
		/** 自定义域名 */
		domain?: string;
		/** 自定义 HTTP headers */
		httpHeaders?: Record<string, string>;
	};
}

/**
 * 飞书 Adapter 配置
 */
export interface FeishuAdapterConfig {
	/** 账户列表 */
	accounts: FeishuAccountConfig[];
	/** 是否启用 WebSocket */
	useWebSocket?: boolean;
	/** 默认模型 */
	model?: string;
}

// ============================================================================
// 消息事件类型
// ============================================================================

/**
 * 飞书消息事件
 */
export interface FeishuMessageEvent {
	event: {
		sender: {
			sender_id: {
				open_id: string;
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
			thread_id?: string;
			chat_id: string;
			chat_type: "p2p" | "group" | "topic";
			message_type: string;
			content: string;
			create_time: string;
			mentions?: Array<{
				key: string;
				id: {
					open_id: string;
					user_id?: string;
					union_id?: string;
				};
				name: string;
				tenant_key?: string;
			}>;
		};
	};
}

/**
 * 飞书卡片事件
 */
export interface FeishuCardEvent {
	action?: {
		value?: Record<string, any>;
	};
	context?: {
		open_message_id?: string;
		open_chat_id?: string;
	};
	open_message_id?: string;
	open_chat_id?: string;
}

/**
 * 提及信息
 */
export interface MentionInfo {
	/** 提及 key */
	key: string;
	/** 用户 open_id */
	openId: string;
	/** 用户名称 */
	name: string;
	/** 是否是机器人 */
	isBot: boolean;
}

// ============================================================================
// 消息上下文
// ============================================================================

/**
 * 消息上下文（解析后的消息）
 */
export interface MessageContext {
	/** 聊天 ID */
	chatId: string;
	/** 消息 ID */
	messageId: string;
	/** 发送者 ID */
	senderId: string;
	/** 聊天类型 */
	chatType: "p2p" | "group" | "topic";
	/** 根消息 ID（话题） */
	rootId?: string;
	/** 父消息 ID */
	parentId?: string;
	/** 线程 ID */
	threadId?: string;
	/** 消息内容（已转换为文本） */
	content: string;
	/** 原始内容类型 */
	contentType: string;
	/** 资源列表（图片、文件等） */
	resources?: Array<{
		type: "image" | "file" | "audio" | "video";
		fileKey: string;
		name?: string;
	}>;
	/** 提及列表 */
	mentions: MentionInfo[];
	/** 创建时间 */
	createTime?: number;
	/** 原始消息 */
	rawMessage?: any;
	/** 原始发送者信息 */
	rawSender?: any;
}

// ============================================================================
// 卡片系统类型
// ============================================================================

/**
 * 卡片状态
 */
export type CardState = "thinking" | "streaming" | "complete" | "confirm";

/**
 * 工具调用状态
 */
export interface ToolCallStatus {
	/** 工具名称 */
	name: string;
	/** 状态 */
	status: "running" | "complete" | "error";
}

/**
 * 卡片数据
 */
export interface CardData {
	/** 文本内容 */
	text?: string;
	/** 工具调用列表 */
	toolCalls?: ToolCallStatus[];
	/** 思考文本 */
	reasoningText?: string;
	/** 思考耗时（毫秒） */
	reasoningElapsedMs?: number;
	/** 总耗时（毫秒） */
	elapsedMs?: number;
	/** 是否错误 */
	isError?: boolean;
	/** 是否中止 */
	isAborted?: boolean;
	/** 确认数据 */
	confirmData?: {
		pendingOperationId: string;
		operationDescription: string;
		preview?: string;
	};
	/** 页脚配置 */
	footer?: {
		status?: boolean;
		elapsed?: boolean;
	};
}

/**
 * 飞书卡片内容
 */
export interface FeishuCard {
	schema?: "2.0";
	config?: {
		wide_screen_mode?: boolean;
		update_multi?: boolean;
		summary?: {
			content: string;
		};
	};
	header?: {
		title: {
			tag: "plain_text";
			content: string;
		};
		template?: string;
	};
	body?: {
		elements: FeishuCardElement[];
	};
	elements?: FeishuCardElement[];
}

/**
 * 飞书卡片元素
 */
export interface FeishuCardElement {
	tag: string;
	content?: string;
	text?: {
		tag: "lark_md" | "plain_text";
		content: string;
	};
	text_size?: "notation" | "heading" | "normal";
	[key: string]: any;
}

// ============================================================================
// LarkClient 相关类型
// ============================================================================

/**
 * 已配置的飞书账户
 */
export interface ConfiguredLarkAccount {
	accountId: string;
	enabled: true;
	configured: true;
	name?: string;
	appId: string;
	appSecret: string;
	encryptKey?: string;
	verificationToken?: string;
	brand: LarkBrand;
	config: Record<string, any>;
	extra?: {
		domain?: string;
		httpHeaders?: Record<string, string>;
	};
}

/**
 * 未配置的飞书账户
 */
export interface UnconfiguredLarkAccount {
	accountId: string;
	enabled: boolean;
	configured: false;
	name?: string;
	appId?: string;
	appSecret?: string;
	encryptKey?: string;
	verificationToken?: string;
	brand: LarkBrand;
	config: Record<string, any>;
	extra?: {
		domain?: string;
		httpHeaders?: Record<string, string>;
	};
}

/**
 * 飞书账户（联合类型）
 */
export type LarkAccount = ConfiguredLarkAccount | UnconfiguredLarkAccount;

/**
 * Probe 结果
 */
export interface ProbeResult {
	ok: boolean;
	appId?: string;
	botName?: string;
	botOpenId?: string;
	error?: string;
}
