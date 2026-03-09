/**
 * Feishu Card Builder
 *
 * 卡片构建工具，用于生成飞书卡片内容
 */

import type { CardState, CardBuildOptions, ToolCallInfo } from "./types.js";

// 卡片元素 ID
export const STREAMING_ELEMENT_ID = "streaming_content";
export const REASONING_ELEMENT_ID = "reasoning_content";

/**
 * 分离思考内容和回答内容
 *
 * 从文本中分离 `<think/>` 标签内的思考内容
 */
export function splitReasoningText(text: string): {
	reasoningText?: string;
	answerText?: string;
} {
	if (typeof text !== "string" || !text.trim()) {
		return {};
	}

	// 匹配 <think ...>...</think > 标签
	const thinkRegex =
		/<think[^>]*>([\s\S]*?)<\/think\s*>/gi;
	let reasoningText = "";
	let answerText = text;

	let match;
	while ((match = thinkRegex.exec(text)) !== null) {
		reasoningText += (reasoningText ? "\n" : "") + match[1].trim();
	}

	// 移除思考标签
	answerText = answerText.replace(thinkRegex, "").trim();

	return {
		reasoningText: reasoningText || undefined,
		answerText: answerText || undefined,
	};
}

/**
 * 格式化思考耗时
 */
export function formatReasoningDuration(ms: number | undefined): string {
	if (!ms) return "";
	const seconds = Math.floor(ms / 1000);
	if (seconds < 60) {
		return `${seconds}s`;
	}
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}m ${remainingSeconds}s`;
}

/**
 * 格式化总耗时
 */
export function formatElapsed(ms: number | undefined): string {
	if (!ms) return "";
	const seconds = Math.floor(ms / 1000);
	if (seconds < 60) {
		return `${seconds}s`;
	}
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}m ${remainingSeconds}s`;
}

/**
 * 构建飞书卡片内容
 */
export function buildFeishuCard(
	state: CardState,
	options?: CardBuildOptions
): Record<string, unknown> {
	const card: Record<string, unknown> = {
		schema: "2.0",
		config: {
			width_mode: "fill",
			update_multi: true,
		},
	};

	switch (state) {
		case "thinking":
			return buildThinkingCardInternal();
		case "streaming":
			return buildStreamingCardInternal(options);
		case "complete":
			return buildCompleteCardInternal(options);
		default:
			return card;
	}
}

/**
 * 构建思考中卡片（内部函数）
 */
function buildThinkingCardInternal(): Record<string, unknown> {
	return {
		schema: "2.0",
		config: {
			width_mode: "fill",
		},
		header: {
			title: {
				tag: "plain_text",
				content: "思考中...",
			},
			template: "blue",
		},
		body: {
			elements: [
				{
					tag: "markdown",
					content: "正在处理您的请求...",
				},
			],
		},
	};
}

/**
 * 构建流式输出卡片（内部函数）
 */
function buildStreamingCardInternal(
	options?: CardBuildOptions
): Record<string, unknown> {
	const elements: Record<string, unknown>[] = [];

	// 添加思考内容
	if (options?.reasoningText) {
		elements.push({
			tag: "markdown",
			content: `**思考过程:**\n${options.reasoningText}`,
			element_id: REASONING_ELEMENT_ID,
		});
	}

	// 添加工具调用状态
	if (options?.toolCalls && options.toolCalls.length > 0) {
		const toolElements = options.toolCalls.map((tool) => {
			const statusIcon =
				tool.status === "running"
					? "🔄"
					: tool.status === "complete"
						? "✅"
						: "❌";
			return `${statusIcon} ${tool.name}`;
		});
		elements.push({
			tag: "markdown",
			content: `**工具调用:**\n${toolElements.join("\n")}`,
		});
	}

	return {
		schema: "2.0",
		config: {
			width_mode: "fill",
			update_multi: true,
		},
		body: {
			elements:
				elements.length > 0
					? elements
					: [{ tag: "markdown", content: "处理中..." }],
		},
	};
}

/**
 * 构建完成卡片（内部函数）
 */
function buildCompleteCardInternal(
	options?: CardBuildOptions
): Record<string, unknown> {
	const elements: Record<string, unknown>[] = [];

	// 添加思考内容（折叠）
	if (options?.reasoningText) {
		const duration = formatReasoningDuration(options.reasoningElapsedMs);
		elements.push({
			tag: "collapse",
			header: {
				title: {
					tag: "plain_text",
					content: duration
						? `思考过程 (${duration})`
						: "思考过程",
				},
			},
			elements: [
				{
					tag: "markdown",
					content: options.reasoningText,
				},
			],
		});
	}

	// 添加工具调用历史
	if (options?.toolCalls && options.toolCalls.length > 0) {
		const toolElements = options.toolCalls.map((tool) => {
			const statusIcon =
				tool.status === "complete"
					? "✅"
					: tool.status === "error"
						? "❌"
						: "🔄";
			return `${statusIcon} ${tool.name}`;
		});
		elements.push({
			tag: "markdown",
			content: `**工具调用:**\n${toolElements.join("\n")}`,
		});
	}

	// 添加回答内容
	if (options?.text) {
		elements.push({
			tag: "markdown",
			content: options.text,
		});
	}

	// 添加页脚
	if (options?.footer?.elapsed && options.elapsedMs) {
		elements.push({
			tag: "markdown",
			content: `---\n⏱ 耗时: ${formatElapsed(options.elapsedMs)}`,
		});
	}

	// 错误状态
	const headerTemplate = options?.isError ? "red" : "blue";

	return {
		schema: "2.0",
		config: {
			width_mode: "fill",
		},
		header: options?.isError
			? {
					title: {
						tag: "plain_text",
						content: "错误",
					},
					template: "red",
				}
			: undefined,
		body: {
			elements:
				elements.length > 0
					? elements
					: [{ tag: "markdown", content: "完成" }],
		},
	};
}

/**
 * 构建思考中卡片
 */
export function buildThinkingCard(): Record<string, unknown> {
	return buildFeishuCard("thinking");
}

/**
 * 构建流式输出卡片
 */
export function buildStreamingCard(
	text: string,
	toolCalls: ToolCallInfo[] = [],
	reasoningText?: string
): Record<string, unknown> {
	return buildFeishuCard("streaming", {
		text,
		toolCalls,
		reasoningText,
	});
}

/**
 * 构建完成卡片
 */
export function buildCompleteCard(
	text: string,
	options?: {
		toolCalls?: ToolCallInfo[];
		elapsedMs?: number;
		isError?: boolean;
		isAborted?: boolean;
		reasoningText?: string;
		reasoningElapsedMs?: number;
	}
): Record<string, unknown> {
	return buildFeishuCard("complete", {
		text,
		...options,
		footer: {
			status: true,
			elapsed: true,
		},
	});
}

/**
 * 解析工具状态文本
 *
 * 从 "_ -> ToolName - status" 格式解析工具调用信息
 */
export function parseToolStatusText(text: string): ToolCallInfo | null {
	// 匹配 "_ -> ToolName - status" 或 "_Error: ToolName - error"
	const match = text.match(/^_ -> (.+?) - (running|complete|error)/);
	if (match) {
		return {
			name: match[1],
			status: match[2] as ToolCallInfo["status"],
		};
	}

	// 匹配错误格式 "_Error: ToolName - error"
	const errorMatch = text.match(/^_Error: (.+)/);
	if (errorMatch) {
		return {
			name: errorMatch[1],
			status: "error",
		};
	}

	return null;
}
