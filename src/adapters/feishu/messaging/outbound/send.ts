/**
 * 飞书消息发送
 */

import type { LarkClient } from "../../client/lark-client.js";
import type { FeishuCard } from "../../types.js";

// ============================================================================
// 类型
// ============================================================================

export interface SendResult {
	messageId: string;
	chatId: string;
}

export interface SendMessageOptions {
	/** 聊天 ID 或用户 ID */
	to: string;
	/** 消息文本 */
	text: string;
	/** 回复的消息 ID */
	replyToMessageId?: string;
	/** 是否在线程中回复 */
	replyInThread?: boolean;
}

export interface SendCardOptions {
	/** 聊天 ID 或用户 ID */
	to: string;
	/** 卡片内容 */
	card: FeishuCard;
	/** 回复的消息 ID */
	replyToMessageId?: string;
	/** 是否在线程中回复 */
	replyInThread?: boolean;
}

export interface UpdateCardOptions {
	/** 消息 ID */
	messageId: string;
	/** 新卡片内容 */
	card: FeishuCard;
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 优化 Markdown 样式以适配飞书
 */
export function optimizeMarkdownStyle(text: string): string {
	// 飞书 Markdown 不支持某些语法，需要转换
	let result = text;

	// 处理代码块
	// result = result.replace(/```(\w*)\n([\s\S]*?)```/g, '```\n$2```');

	return result;
}

/**
 * 构建飞书富文本内容
 */
function buildPostContent(text: string): string {
	const optimizedText = optimizeMarkdownStyle(text);
	return JSON.stringify({
		zh_cn: {
			content: [[{ tag: "md", text: optimizedText }]],
		},
	});
}

/**
 * 解析目标类型
 */
function resolveReceiveIdType(target: string): "open_id" | "user_id" | "chat_id" | "email" {
	// open_id 格式: ou_xxx
	if (target.startsWith("ou_")) return "open_id";
	// user_id 格式: xxx
	// chat_id 格式: oc_xxx
	if (target.startsWith("oc_")) return "chat_id";
	// email 格式
	if (target.includes("@")) return "email";
	return "open_id";
}

/**
 * 规范化消息 ID（处理合成 ID）
 */
function normalizeMessageId(messageId: string | undefined): string | undefined {
	if (!messageId) return undefined;
	// 如果包含冒号，说明是合成的 ID（如 "om_xxx:auth-complete"），提取真实部分
	if (messageId.includes(":")) {
		return messageId.split(":")[0];
	}
	return messageId;
}

// ============================================================================
// 发送函数
// ============================================================================

/**
 * 发送文本消息
 */
export async function sendMessage(
	client: LarkClient,
	options: SendMessageOptions
): Promise<SendResult> {
	const { to, text, replyToMessageId, replyInThread } = options;

	// 构建消息内容
	const content = buildPostContent(text);

	if (replyToMessageId) {
		// 作为回复发送
		const normalizedId = normalizeMessageId(replyToMessageId);
		const response = await client.sdk.im.message.reply({
			path: {
				message_id: normalizedId!,
			},
			data: {
				content,
				msg_type: "post",
				reply_in_thread: replyInThread,
			},
		});

		return {
			messageId: response?.data?.message_id ?? "",
			chatId: response?.data?.chat_id ?? "",
		};
	}

	// 发送新消息
	const receiveIdType = resolveReceiveIdType(to);
	const response = await client.sdk.im.message.create({
		params: {
			receive_id_type: receiveIdType,
		},
		data: {
			receive_id: to,
			msg_type: "post",
			content,
		},
	});

	return {
		messageId: response?.data?.message_id ?? "",
		chatId: response?.data?.chat_id ?? "",
	};
}

/**
 * 发送卡片消息
 */
export async function sendCard(
	client: LarkClient,
	options: SendCardOptions
): Promise<SendResult> {
	const { to, card, replyToMessageId, replyInThread } = options;

	// 转换为 CardKit 2.0 格式
	const cardKit2 = toCardKit2(card);
	const content = JSON.stringify(cardKit2);

	if (replyToMessageId) {
		const normalizedId = normalizeMessageId(replyToMessageId);
		const response = await client.sdk.im.message.reply({
			path: {
				message_id: normalizedId!,
			},
			data: {
				content,
				msg_type: "interactive",
				reply_in_thread: replyInThread,
			},
		});

		return {
			messageId: response?.data?.message_id ?? "",
			chatId: response?.data?.chat_id ?? "",
		};
	}

	const receiveIdType = resolveReceiveIdType(to);
	const response = await client.sdk.im.message.create({
		params: {
			receive_id_type: receiveIdType,
		},
		data: {
			receive_id: to,
			msg_type: "interactive",
			content,
		},
	});

	return {
		messageId: response?.data?.message_id ?? "",
		chatId: response?.data?.chat_id ?? "",
	};
}

/**
 * 更新卡片消息
 */
export async function updateCard(
	client: LarkClient,
	options: UpdateCardOptions
): Promise<void> {
	const { messageId, card } = options;

	// 转换为 CardKit 2.0 格式
	const cardKit2 = toCardKit2(card);

	await client.sdk.im.message.patch({
		path: {
			message_id: messageId,
		},
		data: {
			content: JSON.stringify(cardKit2),
		},
	});
}

/**
 * 编辑文本消息
 */
export async function editMessage(
	client: LarkClient,
	messageId: string,
	text: string
): Promise<void> {
	const content = buildPostContent(text);

	await client.sdk.im.message.update({
		path: {
			message_id: messageId,
		},
		data: {
			content,
			msg_type: "post",
		},
	});
}

/**
 * 发送图片
 */
export async function sendImage(
	client: LarkClient,
	to: string,
	imageKey: string,
	replyToMessageId?: string
): Promise<SendResult> {
	const content = JSON.stringify({ image_key: imageKey });

	if (replyToMessageId) {
		const normalizedId = normalizeMessageId(replyToMessageId);
		const response = await client.sdk.im.message.reply({
			path: {
				message_id: normalizedId!,
			},
			data: {
				content,
				msg_type: "image",
			},
		});

		return {
			messageId: response?.data?.message_id ?? "",
			chatId: response?.data?.chat_id ?? "",
		};
	}

	const receiveIdType = resolveReceiveIdType(to);
	const response = await client.sdk.im.message.create({
		params: {
			receive_id_type: receiveIdType,
		},
		data: {
			receive_id: to,
			msg_type: "image",
			content,
		},
	});

	return {
		messageId: response?.data?.message_id ?? "",
		chatId: response?.data?.chat_id ?? "",
	};
}

/**
 * 上传图片
 */
export async function uploadImage(
	client: LarkClient,
	imagePath: string
): Promise<string> {
	const fs = await import("fs");
	const buffer = fs.readFileSync(imagePath);

	const response = await client.sdk.im.image.create({
		data: {
			image_type: "message",
			image: buffer,
		},
	});

	return response?.data?.image_key ?? "";
}

/**
 * 上传文件
 */
export async function uploadFile(
	client: LarkClient,
	filePath: string,
	fileName?: string
): Promise<string> {
	const fs = await import("fs");
	const path = await import("path");
	const buffer = fs.readFileSync(filePath);
	const name = fileName || path.basename(filePath);

	const response = await client.sdk.im.file.create({
		data: {
			file_type: "stream",
			file_name: name,
			file: buffer,
		},
	});

	return response?.data?.file_key ?? "";
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 转换为 CardKit 2.0 格式
 */
function toCardKit2(card: FeishuCard): any {
	if (card.schema === "2.0") return card;

	const result: any = {
		schema: "2.0",
		config: card.config,
		body: { elements: card.elements ?? card.body?.elements ?? [] },
	};

	if (card.header) {
		result.header = card.header;
	}

	return result;
}

/**
 * 构建简单的 Markdown 卡片
 */
export function buildMarkdownCard(text: string): FeishuCard {
	const optimizedText = optimizeMarkdownStyle(text);
	return {
		schema: "2.0",
		config: {
			wide_screen_mode: true,
			update_multi: true,
		},
		body: {
			elements: [
				{
					tag: "markdown",
					content: optimizedText,
				},
			],
		},
	};
}
