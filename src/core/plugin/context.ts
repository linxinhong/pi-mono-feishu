/**
 * Plugin Context Builder
 *
 * 构建插件上下文，包括通用上下文和平台兼容上下文
 */

import type {
	PluginContext,
	PlatformCapabilities,
	MessageContext,
	ChannelInfo,
	UserInfo,
	Attachment,
} from "./types.js";

// ============================================================================
// Context Builder
// ============================================================================

/**
 * 构建插件上下文的参数
 */
export interface BuildPluginContextParams {
	/** 消息上下文 */
	message: MessageContext;
	/** 频道名称 */
	channelName?: string;
	/** 频道列表 */
	channels: ChannelInfo[];
	/** 用户列表 */
	users: UserInfo[];
	/** 工作目录 */
	workspaceDir: string;
	/** 频道目录 */
	channelDir: string;
	/** 响应函数 */
	respond: (text: string, shouldLog?: boolean) => Promise<void>;
	/** 平台能力 */
	capabilities: PlatformCapabilities;
}

/**
 * 构建通用插件上下文
 */
export function buildPluginContext(params: BuildPluginContextParams): PluginContext {
	return {
		message: params.message,
		channelName: params.channelName,
		channels: params.channels,
		users: params.users,
		workspaceDir: params.workspaceDir,
		channelDir: params.channelDir,
		respond: params.respond,
		capabilities: params.capabilities,
	};
}

// ============================================================================
// Feishu Compatibility Layer
// ============================================================================

/**
 * 飞书兼容的插件上下文
 *
 * 提供与旧版 FeishuPluginContext 完全兼容的接口
 * @deprecated 建议使用 PluginContext + capabilities
 */
export interface FeishuCompatibleContext extends PluginContext {
	// 飞书特定方法（从 capabilities 中提取）
	replaceMessage: (text: string) => Promise<void>;
	respondInThread: (text: string) => Promise<void>;
	setTyping: (isTyping: boolean) => Promise<void>;
	setWorking: (working: boolean) => Promise<void>;
	uploadFile: (filePath: string, title?: string) => Promise<void>;
	uploadImage: (imagePath: string) => Promise<string>;
	sendImage: (imageKey: string) => Promise<string>;
	sendVoiceMessage: (filePath: string) => Promise<string>;
	deleteMessage: () => Promise<void>;
	sendErrorCard: (message: string) => Promise<void>;
}

/**
 * 构建飞书兼容的插件上下文
 *
 * 将通用 PluginContext 包装为飞书兼容接口，方便现有插件迁移
 * @deprecated 建议新插件直接使用 PluginContext + capabilities
 */
export function buildFeishuCompatibleContext(context: PluginContext): FeishuCompatibleContext {
	const { capabilities } = context;

	// 辅助函数：获取能力或抛出错误
	const getCapabilityOrThrow = <T extends (...args: any[]) => any>(
		name: string,
		capability: T | undefined
	): T => {
		if (!capability) {
			throw new Error(`Capability "${name}" is not supported on platform "${capabilities.platform}"`);
		}
		return capability;
	};

	return {
		...context,

		// 从 capabilities 中提取方法
		replaceMessage: getCapabilityOrThrow("replaceMessage", capabilities.replaceMessage),
		respondInThread: getCapabilityOrThrow("respondInThread", capabilities.respondInThread),
		setTyping: getCapabilityOrThrow("setTyping", capabilities.setTyping),
		setWorking: getCapabilityOrThrow("setWorking", capabilities.setWorking),
		uploadFile: getCapabilityOrThrow("uploadFile", capabilities.uploadFile),
		uploadImage: getCapabilityOrThrow("uploadImage", capabilities.uploadImage),
		sendImage: getCapabilityOrThrow("sendImage", capabilities.sendImage),
		sendVoiceMessage: getCapabilityOrThrow("sendVoiceMessage", capabilities.sendVoiceMessage),
		deleteMessage: getCapabilityOrThrow("deleteMessage", capabilities.deleteMessage),
		sendErrorCard: getCapabilityOrThrow("sendErrorCard", capabilities.sendErrorCard),
	};
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 创建消息上下文
 */
export function createMessageContext(params: {
	text: string;
	rawText: string;
	user: string;
	userName?: string;
	channel: string;
	ts: string;
	attachments?: Attachment[];
}): MessageContext {
	return {
		text: params.text,
		rawText: params.rawText,
		user: params.user,
		userName: params.userName,
		channel: params.channel,
		ts: params.ts,
		attachments: params.attachments || [],
	};
}

/**
 * 检查上下文是否为飞书兼容上下文
 */
export function isFeishuCompatibleContext(context: PluginContext): context is FeishuCompatibleContext {
	return (
		"replaceMessage" in context &&
		"respondInThread" in context &&
		"sendVoiceMessage" in context &&
		typeof (context as any).replaceMessage === "function"
	);
}
