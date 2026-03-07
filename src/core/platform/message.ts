/**
 * Platform Message Types
 *
 * 统一的消息格式，用于不同平台之间的消息转换
 */

// ============================================================================
// Types
// ============================================================================

/**
 * 附件类型
 */
export interface Attachment {
	/** 附件名称 */
	name: string;
	/** 原始文件标识（如 file_key） */
	originalId: string;
	/** 本地文件路径 */
	localPath: string;
	/** 文件类型 */
	type: "image" | "file" | "audio" | "video";
}

/**
 * 发送者信息
 */
export interface Sender {
	/** 用户 ID */
	id: string;
	/** 用户名 */
	name: string;
	/** 显示名称 */
	displayName?: string;
	/** 头像 URL */
	avatar?: string;
}

/**
 * 用户信息（用于适配器接口）
 */
export interface UserInfo {
	id: string;
	userName: string;
	displayName: string;
	avatar?: string;
}

/**
 * 聊天/频道信息
 */
export interface Chat {
	/** 聊天 ID */
	id: string;
	/** 聊天类型 */
	type: "private" | "group" | "channel";
	/** 聊天名称 */
	name?: string;
}

/**
 * 频道/聊天信息（用于适配器接口）
 */
export interface ChannelInfo {
	id: string;
	name: string;
}

/**
 * 统一的消息格式
 */
export interface UniversalMessage {
	/** 消息 ID */
	id: string;
	/** 平台类型 */
	platform: "feishu" | "wechat" | "weibo";
	/** 消息类型 */
	type: "text" | "image" | "file" | "audio" | "video";
	/** 消息内容 */
	content: string;
	/** 发送者信息 */
	sender: Sender;
	/** 聊天信息 */
	chat: Chat;
	/** 附件列表 */
	attachments?: Attachment[];
	/** 时间戳 */
	timestamp: Date;
	/** 提及的用户 ID 列表 */
	mentions?: string[];
}

/**
 * 卡片内容（用于飞书等支持卡片的平台）
 */
export interface CardContent {
	/** 卡片配置 */
	config?: {
		width_mode?: "fill" | "normal";
		update_multi?: boolean;
	};
	/** 卡片主体 */
	elements: CardElement[];
}

/**
 * 卡片元素
 */
export interface CardElement {
	tag: string;
	text?: {
		tag: "lark_md" | "plain_text";
		content: string;
	};
	/** 其他卡片属性 */
	[key: string]: any;
}

/**
 * 统一的响应格式
 */
export interface UniversalResponse {
	/** 响应类型 */
	type: "text" | "image" | "card" | "audio";
	/** 响应内容 */
	content: string | CardContent;
	/** 回复的消息 ID（用于更新消息） */
	messageId?: string;
	/** 图片键（用于发送图片） */
	imageKey?: string;
	/** 文件路径（用于发送文件） */
	filePath?: string;
}
