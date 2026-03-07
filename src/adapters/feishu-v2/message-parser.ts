/**
 * Feishu V2 Message Parser
 *
 * 飞书消息解析器 - 将飞书消息转换为统一格式
 */

import type { UniversalMessage } from "../../core/platform/message.js";
import type {
	FeishuMessageEvent,
	FeishuEventMessage,
	TextContent,
	PostContent,
	ImageContent,
	FileContent,
	AudioContent,
	Mention,
} from "./types.js";

// ============================================================================
// 消息解析
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
	const { text, files, mentions } = parseMessageContent(message);

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
			type: message.chat_type === "p2p" ? "dm" : "group",
		},
		attachments: files,
		timestamp: new Date(parseInt(message.create_time) || Date.now()),
		mentions,
		// 保留原始消息信息
		raw: {
			rootId: message.root_id,
			parentId: message.parent_id,
			messageType: message.message_type,
		},
	} as UniversalMessage & { raw: any };
}

/**
 * 解析消息内容
 */
function parseMessageContent(message: FeishuEventMessage): {
	text: string;
	files?: UniversalMessage["attachments"];
	mentions: Mention[];
} {
	let text = "";
	let files: UniversalMessage["attachments"];
	const mentions: Mention[] = [];

	try {
		const parsedContent = JSON.parse(message.content);

		switch (message.message_type) {
			case "text": {
				const textContent = parsedContent as TextContent;
				text = textContent.text || "";
				// 解析 @ 提及
				const mentionMatches = text.match(/@_user_(\d+)/g);
				if (mentionMatches) {
					for (const match of mentionMatches) {
						mentions.push({
							type: "user",
							userId: match.replace("@_user_", ""),
							rawText: match,
						});
					}
				}
				// 移除 @ 提及标记
				text = text.replace(/@_user_\d+/g, "").trim();
				break;
			}

			case "post": {
				const postContent = parsedContent as PostContent;
				const result = extractTextFromPost(postContent);
				text = result.text;
				mentions.push(...result.mentions);
				break;
			}

			case "image": {
				const imageContent = parsedContent as ImageContent;
				files = [
					{
						name: `image_${imageContent.image_key}.jpg`,
						originalId: imageContent.image_key,
						localPath: "",
						type: "image",
					},
				];
				text = "[图片]";
				break;
			}

			case "file": {
				const fileContent = parsedContent as FileContent;
				files = [
					{
						name: fileContent.file_name || `file_${fileContent.file_key}`,
						originalId: fileContent.file_key,
						localPath: "",
						type: "file",
					},
				];
				text = fileContent.file_name || "[文件]";
				break;
			}

			case "audio": {
				const audioContent = parsedContent as AudioContent;
				files = [
					{
						name: `audio_${audioContent.file_key}.opus`,
						originalId: audioContent.file_key,
						localPath: "",
						type: "audio",
					},
				];
				text = "[语音]";
				break;
			}

			case "media": {
				const mediaContent = parsedContent as FileContent & AudioContent;
				const fileType = mediaContent.duration ? "video" : "file";
				files = [
					{
						name: mediaContent.file_name || `media_${mediaContent.file_key}`,
						originalId: mediaContent.file_key,
						localPath: "",
						type: fileType,
					},
				];
				text = mediaContent.file_name || "[媒体]";
				break;
			}

			case "interactive": {
				// 卡片消息，提取文本内容
				text = extractTextFromCard(parsedContent);
				break;
			}

			default:
				text = message.content;
		}
	} catch {
		text = message.content;
	}

	return { text, files, mentions };
}

/**
 * 从富文本消息中提取文本
 */
function extractTextFromPost(postContent: PostContent): {
	text: string;
	mentions: Mention[];
} {
	if (!postContent.content) return { text: "", mentions: [] };

	const mentions: Mention[] = [];

	const extractText = (elements: any[]): string => {
		return elements
			.map((el) => {
				if (el.tag === "text") {
					return el.text || "";
				}
				if (el.tag === "at") {
					// 记录提及
					mentions.push({
						type: "user",
						userId: el.user_id,
						userName: el.text?.replace("@", ""),
						rawText: el.text || "",
					});
					return ""; // 不在文本中显示 @
				}
				if (el.tag === "a") {
					return el.text || "";
				}
				if (el.children) {
					return extractText(el.children);
				}
				return "";
			})
			.join("");
	};

	if (Array.isArray(postContent.content)) {
		const text = postContent.content
			.map((block: any) => {
				if (block.children) return extractText(block.children);
				return "";
			})
			.join("\n");

		return { text, mentions };
	}

	return { text: "", mentions };
}

/**
 * 从卡片消息中提取文本
 */
function extractTextFromCard(cardContent: any): string {
	if (!cardContent.body?.elements) return "";

	const extractFromElements = (elements: any[]): string => {
		return elements
			.map((el) => {
				if (el.tag === "div" && el.text?.content) {
					return el.text.content;
				}
				if (el.tag === "markdown" && el.content) {
					return el.content;
				}
				if (el.elements) {
					return extractFromElements(el.elements);
				}
				return "";
			})
			.join("\n");
	};

	return extractFromElements(cardContent.body.elements);
}

/**
 * 获取消息类型
 */
function getMessageType(messageType: string): UniversalMessage["type"] {
	switch (messageType) {
		case "text":
		case "post":
		case "interactive":
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

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 检查是否是话题回复
 */
export function isThreadReply(message: FeishuEventMessage): boolean {
	return !!message.root_id;
}

/**
 * 检查是否是 P2P 消息
 */
export function isP2PMessage(message: FeishuEventMessage): boolean {
	return message.chat_type === "p2p";
}

/**
 * 检查消息是否提及了机器人
 */
export function isBotMention(message: FeishuEventMessage, botUserId: string): boolean {
	try {
		const content = JSON.parse(message.content);
		// 检查文本消息中的 @ 提及
		if (message.message_type === "text") {
			return content.text?.includes(`@_user_${botUserId}`);
		}
		// 检查富文本消息中的 @ 提及
		if (message.message_type === "post") {
			return JSON.stringify(content).includes(`"user_id":"${botUserId}"`);
		}
		return false;
	} catch {
		return false;
	}
}

/**
 * 构建文本消息内容
 */
export function buildTextContent(text: string): string {
	return JSON.stringify({ text });
}

/**
 * 构建富文本消息内容
 */
export function buildPostContent(paragraphs: any[]): string {
	return JSON.stringify({
		zh_cn: {
			title: "",
			content: paragraphs,
		},
	});
}
