/**
 * Context - 运行时上下文
 *
 * 提供消息处理时的上下文信息和方法
 *
 * @deprecated 建议使用 core/plugin/context.ts 中的 buildPluginContext 和 buildFeishuCompatibleContext
 */

import type { Attachment, ChannelInfo, UserInfo } from "../core/plugin/types.js";
import type { FeishuCompatibleContext } from "../core/plugin/context.js";
import { buildFeishuCompatibleContext } from "../core/plugin/context.js";
import type { PlatformCapabilities } from "../core/plugin/types.js";

/**
 * 构建 FeishuPluginContext 的选项
 * @deprecated 建议使用 core/plugin/context.ts 中的 BuildPluginContextParams
 */
export interface BuildContextOptions {
	message: {
		text: string;
		rawText: string;
		user: string;
		userName?: string;
		channel: string;
		ts: string;
		attachments: Attachment[];
	};
	channelName?: string;
	channels: ChannelInfo[];
	users: UserInfo[];
	workspaceDir: string;
	channelDir: string;

	// 响应方法
	respond: (text: string, shouldLog?: boolean) => Promise<void>;
	replaceMessage: (text: string) => Promise<void>;
	respondInThread: (text: string) => Promise<void>;

	// 状态方法
	setTyping: (isTyping: boolean) => Promise<void>;
	setWorking: (working: boolean) => Promise<void>;

	// 文件上传
	uploadFile: (filePath: string, title?: string) => Promise<void>;
	uploadImage: (imagePath: string) => Promise<string>;
	sendImage: (imageKey: string) => Promise<string>;
	sendVoiceMessage: (filePath: string) => Promise<string>;

	// 消息管理
	deleteMessage: () => Promise<void>;
	sendErrorCard: (message: string) => Promise<void>;

	// 平台能力（可选，用于替代 FeishuCapabilities）
	capabilities?: PlatformCapabilities;
}

/**
 * 构建插件上下文
 * @deprecated 建议使用 core/plugin/context.ts 中的 buildPluginContext 和 buildFeishuCompatibleContext
 */
export function buildPluginContext(options: BuildContextOptions): FeishuCompatibleContext {
	// 如果提供了 capabilities，直接使用
	if (!options.capabilities) {
		throw new Error("capabilities is required. Please provide PlatformCapabilities.");
	}

	// 构建通用插件上下文
	const pluginContext = {
		message: options.message,
		channelName: options.channelName,
		channels: options.channels,
		users: options.users,
		workspaceDir: options.workspaceDir,
		channelDir: options.channelDir,
		respond: options.respond,
		capabilities: options.capabilities,
	};

	// 返回飞书兼容上下文
	return buildFeishuCompatibleContext(pluginContext);
}

/**
 * 创建简化的响应函数集
 */
export interface ResponseFunctions {
	respond: (text: string, shouldLog?: boolean) => Promise<void>;
	replaceMessage: (text: string) => Promise<void>;
	respondInThread: (text: string) => Promise<void>;
}

/**
 * 创建简化的文件操作函数集
 */
export interface FileFunctions {
	uploadFile: (filePath: string, title?: string) => Promise<void>;
	uploadImage: (imagePath: string) => Promise<string>;
	sendImage: (imageKey: string) => Promise<string>;
	sendVoiceMessage: (filePath: string) => Promise<string>;
}
