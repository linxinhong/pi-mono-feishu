/**
 * Feishu V2 Message Parser
 *
 * 飞书消息解析器 - 将飞书消息转换为统一格式
 */

import type { UniversalMessage } from "../../core/platform/message.js";
import type {
	FeishuMessageEvent,
	FeishuEventMessage,
	FeishuEventSender,
	TextContent,
	PostContent,
	Mention,
} from "./types.js";

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
	const mentions: string[] = [];

	try {
		const parsedContent = JSON.parse(message.content);

		if (message.message_type === "text") {
			text = parsedContent.text || "";
			// 提取 @ 提及
			extractMentionsFromText(text, mentions);
		} else if (message.message_type === "post") {
			const { text: postText, mentions: postMentions } = extractTextFromPost(parsedContent);
			text = postText;
			mentions.push(...postMentions);
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
		} else if (message.message_type === "interactive") {
			// 卡片消息
			text = "[卡片消息]";
		} else if (message.message_type === "sticker") {
			// 表情包消息
			text = "[表情]";
		}
	} catch {
		text = message.content;
	}

	// 移除 @ 提及标记
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
			type: message.chat_type === "p2p" ? "private" : "group",
		},
		attachments: files,
		timestamp: new Date(parseInt(message.create_time) || Date.now()),
		mentions,
		// 线程回复相关
		...(message.root_id && { threadId: message.root_id }),
		...(message.parent_id && { replyTo: message.parent_id }),
	};
}

/**
 * 从富文本消息中提取文本
 */
function extractTextFromPost(postContent: PostContent): {
	text: string;
	mentions: string[];
} {
	const mentions: string[] = [];

	if (!postContent.content) return { text: "", mentions };

	const extractText = (elements: any[]): string => {
		return elements
			.map((el) => {
				if (el.tag === "text") return el.text || "";
				if (el.tag === "at") {
					// 提取 @ 提及
					if (el.user_id) {
						mentions.push(el.user_id);
					}
					return el.text || "";
				}
				if (el.children) return extractText(el.children);
				return "";
			})
			.join("");
	};

	let text = "";
	if (Array.isArray(postContent.content)) {
		text = postContent.content
			.map((block: any) => {
				if (block.children) return extractText(block.children);
				return "";
			})
			.join("\n");
	}

	return { text, mentions };
}

/**
 * 从文本中提取 @ 提及
 */
function extractMentionsFromText(
	text: string,
	mentions: string[],
): void {
	// 匹配 @_user_xxx 格式
	const mentionRegex = /@_user_([^\s]+)/g;
	let match;
	while ((match = mentionRegex.exec(text)) !== null) {
		mentions.push(match[1]);
	}
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
		case "interactive":
		case "sticker":
		default:
			return "text";
	}
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 判断是否是线程回复
 */
export function isThreadReply(event: FeishuMessageEvent): boolean {
	return !!event.message.root_id;
}

/**
 * 判断是否是私聊消息
 */
export function isP2PMessage(event: FeishuMessageEvent): boolean {
	return event.message.chat_type === "p2p";
}

/**
 * 判断是否是群聊消息
 */
export function isGroupMessage(event: FeishuMessageEvent): boolean {
	return event.message.chat_type === "group";
}

/**
 * 判断是否 @ 了机器人
 */
export function isBotMention(
	event: FeishuMessageEvent,
	botUserId: string,
): boolean {
	const message = event.message;

	// 检查内容中是否有 @ 机器人
	try {
		const content = JSON.parse(message.content);

		// 文本消息
		if (message.message_type === "text") {
			return content.text?.includes(`@_user_${botUserId}`) || false;
		}

		// 富文本消息
		if (message.message_type === "post" && content.content) {
			const checkMention = (elements: any[]): boolean => {
				return elements.some((el) => {
					if (el.tag === "at" && el.user_id === botUserId) return true;
					if (el.children) return checkMention(el.children);
					return false;
				});
			};
			return content.content.some((block: any) =>
				block.children ? checkMention(block.children) : false,
			);
		}
	} catch {
		// 解析失败，返回 false
	}

	return false;
}

/**
 * 构建文本消息内容
 */
export function buildTextContent(text: string): string {
	return JSON.stringify({ text } as TextContent);
}

/**
 * 构建富文本消息内容
 */
export function buildPostContent(
	blocks: Array<{
		tag: string;
		text?: string;
		children?: Array<{ tag: string; text?: string; user_id?: string }>;
	}>,
): string {
	const content = blocks.map((block) => ({
		tag: block.tag,
		children: block.children || (block.text ? [{ tag: "text", text: block.text }] : []),
	}));

	return JSON.stringify({
		content,
		version: "1.0",
	} as PostContent);
}
