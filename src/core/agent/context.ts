/**
 * Agent Context
 *
 * Agent 上下文 - 包含平台信息和运行时状态
 */

import type { PlatformContext } from "../platform/context.js";
import type { ChannelInfo, UserInfo } from "../platform/context.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Agent 上下文
 *
 * 包含 Agent 运行所需的所有上下文信息
 */
export interface AgentContext {
	/**
	 * 平台上下文（提供平台特定能力）
	 */
	platform: PlatformContext;

	/**
	 * 频道/聊天 ID
	 */
	chatId: string;

	/**
	 * 用户信息
	 */
	user: UserInfo;

	/**
	 * 工作目录
	 */
	workspaceDir: string;

	/**
	 * 频道目录
	 */
	channelDir: string;

	/**
	 * 可用的频道列表
	 */
	channels: ChannelInfo[];

	/**
	 * 可用的用户列表
	 */
	users: UserInfo[];

	/**
	 * 原始消息文本
	 */
	rawText: string;

	/**
	 * 处理后的消息文本
	 */
	text: string;

	/**
	 * 附件列表
	 */
	attachments: Array<{
		name: string;
		localPath: string;
		type: string;
	}>;

	/**
	 * 时间戳
	 */
	timestamp: string;
}
