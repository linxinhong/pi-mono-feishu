/**
 * 飞书入站消息解析
 *
 * 将原始飞书消息事件转换为标准化的 MessageContext
 */

import type {
	FeishuMessageEvent,
	MessageContext,
	MentionInfo,
} from "../../types.js";

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 解析 JSON 内容，失败时返回原字符串
 */
function safeParseJSON(content: string): any {
	try {
		return JSON.parse(content);
	} catch {
		return content;
	}
}

/**
 * 从消息内容中提取文本
 */
function extractTextContent(content: string, messageType: string): string {
	if (messageType === "text") {
		const parsed = safeParseJSON(content);
		return typeof parsed === "string" ? parsed : parsed?.content ?? content;
	}

	if (messageType === "post") {
		const parsed = safeParseJSON(content);
		// 飞书富文本格式: { zh_cn: { content: [[{tag: "text", text: "..."}]] } }
		const blocks = parsed?.zh_cn?.content ?? [];
		const texts: string[] = [];

		for (const block of blocks) {
			if (Array.isArray(block)) {
				for (const elem of block) {
					if (elem?.tag === "text" || elem?.tag === "md") {
						texts.push(elem.text ?? "");
					}
				}
			}
		}

		return texts.join("");
	}

	if (messageType === "interactive") {
		// 卡片消息，提取纯文本摘要
		const parsed = safeParseJSON(content);
		return extractCardText(parsed);
	}

	return content;
}

/**
 * 从卡片中提取文本
 */
function extractCardText(card: any): string {
	if (!card) return "[卡片]";

	const elements = card?.body?.elements ?? card?.elements ?? [];
	const texts: string[] = [];

	for (const elem of elements) {
		if (elem?.tag === "markdown" || elem?.tag === "div") {
			texts.push(elem.content ?? elem.text?.content ?? "");
		}
	}

	return texts.join("\n").trim() || "[卡片]";
}

/**
 * 从消息内容中提取资源
 */
function extractResources(content: string, messageType: string): MessageContext["resources"] {
	if (messageType === "image") {
		const parsed = safeParseJSON(content);
		const imageKey = parsed?.image_key ?? "";
		if (imageKey) {
			return [{ type: "image" as const, fileKey: imageKey }];
		}
	}

	if (messageType === "file") {
		const parsed = safeParseJSON(content);
		const fileKey = parsed?.file_key ?? "";
		const fileName = parsed?.file_name ?? "";
		if (fileKey) {
			return [{ type: "file" as const, fileKey: fileKey, name: fileName }];
		}
	}

	if (messageType === "audio") {
		const parsed = safeParseJSON(content);
		const fileKey = parsed?.file_key ?? "";
		if (fileKey) {
			return [{ type: "audio" as const, fileKey: fileKey }];
		}
	}

	if (messageType === "video") {
		const parsed = safeParseJSON(content);
		const fileKey = parsed?.file_key ?? "";
		if (fileKey) {
			return [{ type: "video" as const, fileKey: fileKey }];
		}
	}

	return undefined;
}

// ============================================================================
// 公共 API
// ============================================================================

/**
 * 解析飞书消息事件为 MessageContext
 */
export async function parseMessageEvent(
	event: FeishuMessageEvent,
	botOpenId?: string
): Promise<MessageContext> {
	// 1. 构建 MentionInfo 列表
	const mentionMap = new Map<string, MentionInfo>();
	const mentionList: MentionInfo[] = [];

	for (const m of event.message.mentions ?? []) {
		const openId = m.id?.open_id ?? "";
		if (!openId) continue;

		const info: MentionInfo = {
			key: m.key,
			openId,
			name: m.name,
			isBot: Boolean(botOpenId && openId === botOpenId),
		};
		mentionMap.set(m.key, info);
		mentionList.push(info);
	}

	// 2. 提取消息内容
	const content = extractTextContent(
		event.message.content,
		event.message.message_type
	);

	// 3. 提取资源
	const resources = extractResources(
		event.message.content,
		event.message.message_type
	);

	// 4. 解析时间
	const createTimeStr = event.message.create_time;
	const createTime = createTimeStr ? parseInt(createTimeStr, 10) : undefined;

	return {
		chatId: event.message.chat_id,
		messageId: event.message.message_id,
		senderId: event.sender.sender_id.open_id || "",
		chatType: event.message.chat_type,
		rootId: event.message.root_id || undefined,
		parentId: event.message.parent_id || undefined,
		threadId: event.message.thread_id || undefined,
		content,
		contentType: event.message.message_type,
		resources,
		mentions: mentionList,
		createTime: Number.isNaN(createTime) ? undefined : createTime,
		rawMessage: event.message,
		rawSender: event.sender,
	};
}

/**
 * 检查消息是否提及了机器人
 */
export function mentionedBot(mentions: MentionInfo[]): boolean {
	return mentions.some((m) => m.isBot);
}

/**
 * 获取非机器人的提及目标
 */
export function getNonBotMentions(mentions: MentionInfo[]): MentionInfo[] {
	return mentions.filter((m) => !m.isBot);
}

/**
 * 从消息内容中移除机器人提及
 */
export function stripBotMentions(
	content: string,
	mentions: MentionInfo[]
): string {
	let result = content;
	for (const m of mentions) {
		if (m.isBot && m.key) {
			result = result.replace(m.key, "").trim();
		}
	}
	return result;
}
