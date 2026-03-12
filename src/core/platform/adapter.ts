/**
 * Platform Adapter Interface
 *
 * 平台适配器接口，所有平台适配器都需要实现此接口
 */

import type {
	UniversalMessage,
	UniversalResponse,
} from "./message.js";
import type { PlatformContext, PlatformConfig, UserInfo, ChannelInfo } from "./context.js";

// ============================================================================
// Types
// ============================================================================

/**
 * 平台适配器接口
 *
 * 这个接口定义了所有平台适配器必须实现的方法。
 * 通过实现这个接口，可以轻松添加新的平台支持（微信、微博等）。
 */
export interface PlatformAdapter {
	/**
	 * 平台标识
	 */
	readonly platform: string;

	/**
	 * 初始化适配器
	 * @param config 平台配置
	 */
	initialize(config: PlatformConfig): Promise<void>;

	/**
	 * 启动适配器（连接 WebSocket、注册 Webhook 等）
	 */
	start(): Promise<void>;

	/**
	 * 停止适配器
	 */
	stop(): Promise<void>;

	/**
	 * 发送消息
	 * @param response 统一格式的响应
	 */
	sendMessage(response: UniversalResponse): Promise<void>;

	/**
	 * 更新消息
	 * @param messageId 消息 ID
	 * @param response 统一格式的响应
	 */
	updateMessage(messageId: string, response: UniversalResponse): Promise<void>;

	/**
	 * 删除消息
	 * @param messageId 消息 ID
	 */
	deleteMessage(messageId: string): Promise<void>;

	/**
	 * 上传文件
	 * @param filePath 文件路径
	 * @returns 文件标识（如 file_key、media_id 等）
	 */
	uploadFile(filePath: string): Promise<string>;

	/**
	 * 上传图片
	 * @param imagePath 图片路径
	 * @returns 图片标识（如 image_key、media_id 等）
	 */
	uploadImage(imagePath: string): Promise<string>;

	/**
	 * 获取用户信息
	 * @param userId 用户 ID
	 */
	getUserInfo(userId: string): Promise<UserInfo | undefined>;

	/**
	 * 获取所有用户
	 */
	getAllUsers(): Promise<UserInfo[]>;

	/**
	 * 获取频道/聊天信息
	 * @param channelId 频道 ID
	 */
	getChannelInfo(channelId: string): Promise<ChannelInfo | undefined>;

	/**
	 * 获取所有频道/聊天
	 */
	getAllChannels(): Promise<ChannelInfo[]>;

	/**
	 * 订阅消息事件
	 * @param handler 消息处理器
	 */
	onMessage(handler: (message: UniversalMessage) => void): void;

	/**
	 * 创建平台上下文（用于 Agent）
	 * @param chatId 聊天 ID
	 * @param quoteMessageId 可选的引用消息 ID，用于回复时引用原消息
	 */
	createPlatformContext(chatId: string, quoteMessageId?: string): PlatformContext;

	/**
	 * 检查频道是否正在运行
	 * @param channelId 频道 ID
	 */
	isRunning(channelId: string): boolean;

	/**
	 * 设置频道运行状态
	 * @param channelId 频道 ID
	 * @param abort 中止函数
	 */
	setRunning(channelId: string, abort: () => void): void;

	/**
	 * 清除频道运行状态
	 * @param channelId 频道 ID
	 */
	clearRunning(channelId: string): void;

	/**
	 * 中止频道运行
	 * @param channelId 频道 ID
	 */
	abortChannel(channelId: string): void;

	/**
	 * 获取 adapter 默认模型
	 * @returns 默认模型 ID，如果未配置则返回 undefined
	 */
	getDefaultModel?(): string | undefined;
}

/**
 * 平台工厂接口
 *
 * 用于创建平台适配器实例
 */
export interface PlatformAdapterFactory {
	/**
	 * 创建平台适配器
	 * @param config 平台配置
	 */
	createAdapter(config: PlatformConfig): PlatformAdapter;
}

// Re-export types from context and message for convenience
export type { PlatformConfig, UserInfo, ChannelInfo } from "./context.js";
export type { UniversalMessage, UniversalResponse } from "./message.js";
