/**
 * 飞书卡片构建和流式更新
 *
 * 支持思考、流式、完成、确认等状态
 */

import type {
	CardState,
	CardData,
	FeishuCard,
	FeishuCardElement,
	ToolCallStatus,
} from "../../types.js";
import { optimizeMarkdownStyle } from "./send.js";

// ============================================================================
// 常量
// ============================================================================

/** 流式文本元素 ID */
export const STREAMING_ELEMENT_ID = "streaming_content";

/** 思考文本元素 ID */
export const REASONING_ELEMENT_ID = "reasoning_content";

// ============================================================================
// 辅助函数
// ============================================================================

const REASONING_PREFIX = "Reasoning:\n";

/**
 * 分离推理文本和回答文本
 */
export function splitReasoningText(text: string): {
	reasoningText?: string;
	answerText?: string;
} {
	if (typeof text !== "string" || !text.trim()) return {};

	const trimmed = text.trim();

	// Case 1: "Reasoning:\n..." 前缀
	if (
		trimmed.startsWith(REASONING_PREFIX) &&
		trimmed.length > REASONING_PREFIX.length
	) {
		return { reasoningText: cleanReasoningPrefix(trimmed) };
	}

	// Case 2: XML thinking tags
	const taggedReasoning = extractThinkingContent(text);
	const strippedAnswer = stripReasoningTags(text);

	if (!taggedReasoning && strippedAnswer === text) {
		return { answerText: text };
	}

	return {
		reasoningText: taggedReasoning || undefined,
		answerText: strippedAnswer || undefined,
	};
}

/**
 * 提取 <think/thinking/thought> 内容
 */
function extractThinkingContent(text: string): string {
	if (!text) return "";

	const scanRe = /<\s*(\/?)\s*(?:think(?:ing)?|thought|antthinking)\s*>/gi;
	let result = "";
	let lastIndex = 0;
	let inThinking = false;

	for (const match of text.matchAll(scanRe)) {
		const idx = match.index ?? 0;
		if (inThinking) {
			result += text.slice(lastIndex, idx);
		}
		inThinking = match[1] !== "/";
		lastIndex = idx + match[0].length;
	}

	// 处理未闭合标签（流式中）
	if (inThinking) {
		result += text.slice(lastIndex);
	}

	return result.trim();
}

/**
 * 移除推理标签
 */
export function stripReasoningTags(text: string): string {
	// 移除完整的 XML 块
	let result = text.replace(
		/<\s*(?:think(?:ing)?|thought|antthinking)\s*>[\s\S]*?<\s*\/\s*(?:think(?:ing)?|thought|antthinking)\s*>/gi,
		""
	);

	// 移除末尾未闭合标签（流式中）
	result = result.replace(
		/<\s*(?:think(?:ing)?|thought|antthinking)\s*>[\s\S]*$/gi,
		""
	);

	// 移除孤立的闭合标签
	result = result.replace(
		/<\s*\/\s*(?:think(?:ing)?|thought|antthinking)\s*>/gi,
		""
	);

	return result.trim();
}

/**
 * 清理 "Reasoning:\n_italic_" 格式
 */
function cleanReasoningPrefix(text: string): string {
	let cleaned = text.replace(/^Reasoning:\s*/i, "");
	cleaned = cleaned
		.split("\n")
		.map((line) => line.replace(/^_(.+)_$/, "$1"))
		.join("\n");
	return cleaned.trim();
}

/**
 * 格式化推理耗时
 */
export function formatReasoningDuration(ms: number): string {
	const seconds = ms / 1000;
	const duration =
		seconds < 60
			? `${seconds.toFixed(1)}s`
			: `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
	return `Thought for ${duration}`;
}

/**
 * 格式化耗时
 */
export function formatElapsed(ms: number): string {
	const seconds = ms / 1000;
	return seconds < 60
		? `${seconds.toFixed(1)}s`
		: `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

/**
 * 构建页脚
 */
function buildFooter(text: string, isError: boolean): FeishuCardElement[] {
	const content = isError ? `<font color='red'>${text}</font>` : text;
	return [{ tag: "markdown", content, text_size: "notation" }];
}

// ============================================================================
// 卡片构建
// ============================================================================

/**
 * 构建飞书卡片内容
 */
export function buildCardContent(state: CardState, data: CardData = {}): FeishuCard {
	switch (state) {
		case "thinking":
			return buildThinkingCard();
		case "streaming":
			return buildStreamingCard(
				data.text ?? "",
				data.toolCalls ?? [],
				data.reasoningText
			);
		case "complete":
			return buildCompleteCard(
				data.text ?? "",
				data.toolCalls ?? [],
				data.elapsedMs,
				data.isError,
				data.reasoningText,
				data.reasoningElapsedMs,
				data.isAborted,
				data.footer
			);
		case "confirm":
			return buildConfirmCard(data.confirmData);
		default:
			throw new Error(`Unknown card state: ${state}`);
	}
}

/**
 * 思考中卡片
 */
function buildThinkingCard(): FeishuCard {
	return {
		schema: "2.0",
		config: { wide_screen_mode: true, update_multi: true },
		body: {
			elements: [
				{
					tag: "markdown",
					content: "思考中...",
				},
			],
		},
	};
}

/**
 * 流式卡片
 */
function buildStreamingCard(
	partialText: string,
	toolCalls: ToolCallStatus[],
	reasoningText?: string
): FeishuCard {
	const elements: FeishuCardElement[] = [];

	if (!partialText && reasoningText) {
		// 推理阶段：显示推理内容
		elements.push({
			tag: "markdown",
			content: `💭 **Thinking...**\n\n${reasoningText}`,
			text_size: "notation",
		});
	} else if (partialText) {
		// 回答阶段：显示回答内容
		elements.push({
			tag: "markdown",
			content: optimizeMarkdownStyle(partialText),
		});
	}

	// 进行中的工具调用
	if (toolCalls.length > 0) {
		const toolLines = toolCalls.map((tc) => {
			const statusIcon =
				tc.status === "running"
					? "🔄"
					: tc.status === "complete"
						? "✅"
						: "❌";
			return `${statusIcon} ${tc.name} - ${tc.status}`;
		});
		elements.push({
			tag: "markdown",
			content: toolLines.join("\n"),
			text_size: "notation",
		});
	}

	return {
		schema: "2.0",
		config: { wide_screen_mode: true, update_multi: true },
		body: { elements },
	};
}

/**
 * 完成卡片
 */
function buildCompleteCard(
	fullText: string,
	toolCalls: ToolCallStatus[],
	elapsedMs?: number,
	isError?: boolean,
	reasoningText?: string,
	reasoningElapsedMs?: number,
	isAborted?: boolean,
	footer?: { status?: boolean; elapsed?: boolean }
): FeishuCard {
	const elements: FeishuCardElement[] = [];

	// 可折叠的推理面板（在主内容之前）
	if (reasoningText) {
		const durationLabel = reasoningElapsedMs
			? formatReasoningDuration(reasoningElapsedMs)
			: "Thought";
		elements.push({
			tag: "collapsible_panel",
			expanded: false,
			header: {
				title: {
					tag: "markdown",
					content: `💭 ${durationLabel}`,
				},
				vertical_align: "center",
				icon: {
					tag: "standard_icon",
					token: "down-small-ccm_outlined",
					size: "16px 16px",
				},
				icon_position: "follow_text",
				icon_expanded_angle: -180,
			},
			border: { color: "grey", corner_radius: "5px" },
			vertical_spacing: "8px",
			padding: "8px 8px 8px 8px",
			elements: [
				{
					tag: "markdown",
					content: reasoningText,
					text_size: "notation",
				},
			],
		});
	}

	// 完整文本内容
	elements.push({
		tag: "markdown",
		content: optimizeMarkdownStyle(fullText),
	});

	// 工具调用摘要
	if (toolCalls.length > 0) {
		const toolSummaryLines = toolCalls.map((tc) => {
			const statusIcon = tc.status === "complete" ? "✅" : "❌";
			return `${statusIcon} **${tc.name}** - ${tc.status}`;
		});
		elements.push({
			tag: "markdown",
			content: toolSummaryLines.join("\n"),
			text_size: "notation",
		});
	}

	// 页脚元信息
	const parts: string[] = [];
	if (footer?.status) {
		if (isError) {
			parts.push("出错");
		} else if (isAborted) {
			parts.push("已停止");
		} else {
			parts.push("已完成");
		}
	}
	if (footer?.elapsed && elapsedMs != null) {
		parts.push(`耗时 ${formatElapsed(elapsedMs)}`);
	}
	if (parts.length > 0) {
		const footerText = parts.join(" · ");
		elements.push(...buildFooter(footerText, isError ?? false));
	}

	// 摘要
	const summaryText = fullText.replace(/[*_`#>\[\]()~]/g, "").trim();
	const summary = summaryText ? { content: summaryText.slice(0, 120) } : undefined;

	return {
		schema: "2.0",
		config: { wide_screen_mode: true, update_multi: true, summary },
		body: { elements },
	};
}

/**
 * 确认卡片
 */
function buildConfirmCard(
	confirmData?: CardData["confirmData"]
): FeishuCard {
	if (!confirmData) {
		return {
			schema: "2.0",
			config: { wide_screen_mode: true },
			body: {
				elements: [
					{
						tag: "markdown",
						content: "No confirmation data available",
					},
				],
			},
		};
	}

	const elements: FeishuCardElement[] = [];

	// 操作描述
	elements.push({
		tag: "div",
		text: {
			tag: "lark_md",
			content: confirmData.operationDescription,
		},
	});

	// 预览（如果有）
	if (confirmData.preview) {
		elements.push({ tag: "hr" });
		elements.push({
			tag: "div",
			text: {
				tag: "lark_md",
				content: `**Preview:**\n${confirmData.preview}`,
			},
		});
	}

	// 确认/拒绝按钮
	elements.push({ tag: "hr" });
	elements.push({
		tag: "action",
		actions: [
			{
				tag: "button",
				text: { tag: "plain_text", content: "Confirm" },
				type: "primary",
				value: {
					action: "confirm_write",
					operation_id: confirmData.pendingOperationId,
				},
			},
			{
				tag: "button",
				text: { tag: "plain_text", content: "Reject" },
				type: "danger",
				value: {
					action: "reject_write",
					operation_id: confirmData.pendingOperationId,
				},
			},
			...(confirmData.preview
				? []
				: [
						{
							tag: "button",
							text: {
								tag: "plain_text",
								content: "Preview",
							},
							type: "default" as const,
							value: {
								action: "preview_write",
								operation_id: confirmData.pendingOperationId,
							},
						},
					]),
		],
	});

	return {
		schema: "2.0",
		config: { wide_screen_mode: true, update_multi: true },
		header: {
			title: {
				tag: "plain_text",
				content: "🔐 Confirmation Required",
			},
			template: "orange",
		},
		body: { elements },
	};
}

// ============================================================================
// 流式卡片管理器
// ============================================================================

/**
 * 流式卡片管理器
 *
 * 管理卡片的创建、更新和完成状态
 */
export class StreamingCardManager {
	private messageId?: string;
	private chatId?: string;
	private startTime?: number;
	private lastUpdateTime = 0;
	private updateInterval: number;

	constructor(updateInterval = 300) {
		this.updateInterval = updateInterval;
	}

	/**
	 * 开始流式（发送思考卡片）
	 */
	async start(
		sendCard: (card: FeishuCard) => Promise<{ messageId: string; chatId: string }>
	): Promise<{ messageId: string; chatId: string }> {
		this.startTime = Date.now();
		const card = buildCardContent("thinking");
		const result = await sendCard(card);
		this.messageId = result.messageId;
		this.chatId = result.chatId;
		return result;
	}

	/**
	 * 更新流式内容
	 */
	async update(
		updateCard: (messageId: string, card: FeishuCard) => Promise<void>,
		text: string,
		toolCalls?: ToolCallStatus[],
		reasoningText?: string,
		force = false
	): Promise<void> {
		if (!this.messageId) return;

		const now = Date.now();
		if (!force && now - this.lastUpdateTime < this.updateInterval) {
			return;
		}

		this.lastUpdateTime = now;
		const card = buildCardContent("streaming", {
			text,
			toolCalls,
			reasoningText,
		});

		await updateCard(this.messageId, card);
	}

	/**
	 * 完成流式
	 */
	async complete(
		updateCard: (messageId: string, card: FeishuCard) => Promise<void>,
		text: string,
		options: {
			toolCalls?: ToolCallStatus[];
			isError?: boolean;
			isAborted?: boolean;
			reasoningText?: string;
			reasoningElapsedMs?: number;
			footer?: { status?: boolean; elapsed?: boolean };
		} = {}
	): Promise<void> {
		if (!this.messageId) return;

		const elapsedMs = this.startTime ? Date.now() - this.startTime : undefined;
		const card = buildCardContent("complete", {
			text,
			elapsedMs,
			...options,
		});

		await updateCard(this.messageId, card);
	}

	/**
	 * 获取消息 ID
	 */
	getMessageId(): string | undefined {
		return this.messageId;
	}

	/**
	 * 获取聊天 ID
	 */
	getChatId(): string | undefined {
		return this.chatId;
	}
}
