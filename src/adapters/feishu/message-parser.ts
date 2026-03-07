/**
 * Feishu Message Parser
 *
 * 飞书消息解析器 - 将飞书消息转换为统一格式
 */

import type { UniversalMessage } from "../../core/platform/message.js";

// ============================================================================
// Types
// ============================================================================

/**
 * 飞书事件消息
 */
export interface FeishuEventMessage {
	/** 消息 ID */
	message_id: string;
	/** 聊天 ID */
	chat_id: string;
	/** 消息类型 */
	message_type: string;
	/** 消息内容 */
	content: string;
	/** 创建时间 */
	create_time: string;
}

/**
 * 飞书事件发送者
 */
export interface FeishuEventSender {
	/** 发送者 ID */
	sender_id: {
		user_id?: string;
		open_id?: string;
	};
	/** 发送者类型 */
	sender_type: string;
}

/**
 * 飞书消息事件
 */
export interface FeishuMessageEvent {
	/** 消息 */
	message: FeishuEventMessage;
	/** 发送者 */
	sender: FeishuEventSender;
}

// ============================================================================
// Message Parser
// ============================================================================

/**
 * 解析飞书消息为统一格式
 */
export function parseFeishuMessage(
	event: FeishuMessageEvent,
	userInfo?: { userName: string; displayName: string } | null,
): UniversalMessage {
	const message = event.message;
	const sender = event.sender;

	// 解析消息内容
	let text = "";
	let files: Array<{ name: string; originalId: string; localPath: string; type: "image" | "file" | "audio" | "video" }> | undefined;

	try {
		const parsedContent = JSON.parse(message.content);

		if (message.message_type === "text") {
			text = parsedContent.text || "";
		} else if (message.message_type === "post") {
			text = extractTextFromPost(parsedContent);
		} else if (message.message_type === "image") {
			files = [{
				name: `image_${parsedContent.image_key}.jpg`,
				originalId: parsedContent.image_key,
				localPath: "", // 需要下载后填充
				type: "image",
			}];
			text = "[图片]";
		} else if (message.message_type === "file" || message.message_type === "audio" || message.message_type === "media") {
			const fileType: "audio" | "file" = message.message_type === "audio" ? "audio" : "file";
			const fileName = parsedContent.file_name || `audio_${parsedContent.file_key}.${message.message_type === "audio" ? "opus" : "file"}`;
			files = [{
				name: fileName,
				originalId: parsedContent.file_key,
				localPath: "", // 需要下载后填充
				type: fileType,
			}];
			text = parsedContent.file_name || "[语音]";
		}
	} catch {
		text = message.content;
	}

	// 移除 @ 提及
	text = text.replace(/@_user_[\d]+/g, "").trim();

	return {
		id: message.message_id,
		platform: "feishu",
		type: getMessageType(message.message_type),
		content: text,
		sender: {
			id: sender.sender_id?.user_id || sender.sender_id?.open_id || "unknown",
			name: userInfo?.userName || "unknown",
			displayName: userInfo?.displayName || "unknown",
		},
		chat: {
			id: message.chat_id,
			type: "group", // 飞书群聊
		},
		attachments: files,
		timestamp: new Date(parseInt(message.create_time) || Date.now()),
		mentions: [],
	};
}

/**
 * 从富文本消息中提取文本
 */
function extractTextFromPost(postContent: any): string {
	if (!postContent.content) return "";

	const extractText = (elements: any[]): string => {
		return elements
			.map((el) => {
				if (el.tag === "text") return el.text || "";
				if (el.children) return extractText(el.children);
				return "";
			})
			.join("");
	};

	if (Array.isArray(postContent.content)) {
		return postContent.content
			.map((block: any) => {
				if (block.children) return extractText(block.children);
				return "";
			})
			.join("\n");
	}

	return "";
}

/**
 * 获取消息类型
 */
function getMessageType(messageType: string): UniversalMessage["type"] {
	switch (messageType) {
		case "text":
		case "post":
			return "text";
		case "image":
			return "image";
		case "audio":
			return "audio";
		case "file":
		case "media":
			return "file";
		default:
			return "text";
	}
}
