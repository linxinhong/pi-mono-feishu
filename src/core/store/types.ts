/**
 * Store Types
 *
 * 通用存储类型定义，平台无关
 */

// ============================================================================
// Attachment Types
// ============================================================================

/**
 * 附件信息
 */
export interface Attachment {
	/** 原始文件名 */
	original: string;
	/** 本地存储路径 */
	local: string;
}

// ============================================================================
// Message Log Types
// ============================================================================

/**
 * 记录的消息
 */
export interface LoggedMessage {
	/** ISO 格式日期 */
	date: string;
	/** 消息时间戳 */
	ts: string;
	/** 用户 ID */
	user: string;
	/** 用户名 */
	userName?: string;
	/** 显示名称 */
	displayName?: string;
	/** 消息文本 */
	text: string;
	/** 附件列表 */
	attachments: Attachment[];
	/** 是否为 Bot 消息 */
	isBot: boolean;
}

// ============================================================================
// Store Config Types
// ============================================================================

/**
 * 基础存储配置（平台无关）
 */
export interface BaseStoreConfig {
	/** 工作目录 */
	workspaceDir: string;
}

/**
 * 附件下载请求（通用接口）
 */
export interface DownloadRequest {
	/** 频道 ID */
	channelId: string;
	/** 本地存储路径 */
	localPath: string;
	/** 文件标识 */
	fileKey: string;
	/** 文件令牌（可选） */
	fileToken?: string;
	/** 消息 ID（可选） */
	messageId?: string;
	/** 文件类型（可选） */
	type?: string;
}

/**
 * 附件信息输入（用于处理附件）
 */
export interface AttachmentInput {
	/** 文件名 */
	name?: string;
	/** 文件标识 */
	file_key?: string;
	/** 文件令牌 */
	file_token?: string;
	/** 消息 ID */
	message_id?: string;
	/** 文件类型 */
	type?: string;
}

// ============================================================================
// Platform Store Interface
// ============================================================================

/**
 * 平台存储接口
 *
 * 平台特定的存储实现需要实现此接口
 */
export interface PlatformStore {
	/**
	 * 处理附件
	 * @param channelId 频道 ID
	 * @param files 附件列表
	 * @param timestamp 时间戳
	 */
	processAttachments(
		channelId: string,
		files: AttachmentInput[],
		timestamp: string
	): Attachment[] | Promise<Attachment[]>;

	/**
	 * 立即下载附件
	 */
	downloadAttachmentNow?(
		file: AttachmentInput,
		channelId: string,
		timestamp: string
	): Promise<Attachment | null>;

	/**
	 * 记录消息
	 */
	logMessage(channelId: string, message: LoggedMessage): Promise<boolean>;

	/**
	 * 记录 Bot 响应
	 */
	logBotResponse(channelId: string, text: string, ts: string): Promise<void>;

	/**
	 * 获取最后一条消息的时间戳
	 */
	getLastTimestamp(channelId: string): string | null;
}
