/**
 * Reasoning Content Parser
 *
 * 思考内容解析器
 * 参考: openclaw-lark/src/card/builder.ts
 *
 * 支持从 AI 模型输出中提取思考内容，支持多种格式：
 * 1. "Reasoning:\n..." 前缀格式
 * 2. <think>...</think> XML 标签格式
 * 3. <thinking>...</thinking> XML 标签格式
 * 4. <thought>...</thought> XML 标签格式
 * 5. <antthinking>...</antthinking> XML 标签格式
 */

// ============================================================================
// Constants
// ============================================================================

const REASONING_PREFIX = "Reasoning:\n";

// 匹配各种 thinking 标签的正则表达式
const THINKING_TAG_PATTERN = /<(\/?)\s*(?:think(?:ing)?|thought|antthinking)\s*>/gi;

// 匹配完整的 thinking 标签块（用于 strip）
const COMPLETE_THINKING_BLOCK_PATTERN =
	/<\s*(?:think(?:ing)?|thought|antthinking)\s*>[\s\S]*?<\s*\/\s*(?:think(?:ing)?|thought|antthinking)\s*>/gi;

// 匹配末尾未闭合的 thinking 标签
const UNCLOSED_THINKING_PATTERN = /<(think(?:ing)?|thought|antthinking)>\s*[\s\S]*$/i;

// 匹配孤立的闭合标签
const ORPHANED_CLOSING_TAG_PATTERN = /<\s*\/\s*(?:think(?:ing)?|thought|antthinking)\s*>/gi;

// ============================================================================
// Types
// ============================================================================

export interface SplitReasoningResult {
	/** 思考内容（如果有） */
	reasoningText?: string;
	/** 回答内容（如果有） */
	answerText?: string;
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * 将文本分割为思考内容和回答内容
 *
 * 支持的格式：
 * 1. "Reasoning:\n..." 前缀格式 —— 整个内容是思考
 * 2. XML thinking 标签 —— 提取标签内容作为思考，移除标签后的内容作为回答
 *
 * @param text 输入文本
 * @returns 分割结果，包含 reasoningText 和/或 answerText
 */
export function splitReasoningText(text?: string): SplitReasoningResult {
	if (typeof text !== "string" || !text.trim()) {
		return {};
	}

	const trimmed = text.trim();

	// Case 1: "Reasoning:\n..." 前缀格式
	if (trimmed.startsWith(REASONING_PREFIX) && trimmed.length > REASONING_PREFIX.length) {
		return { reasoningText: cleanReasoningPrefix(trimmed) };
	}

	// Case 2: XML thinking 标签
	const taggedReasoning = extractThinkingContent(text);
	const strippedAnswer = stripReasoningTags(text);

	// 如果没有提取到 thinking 内容，且回答内容与原内容相同，返回原内容作为回答
	if (!taggedReasoning && strippedAnswer === text) {
		return { answerText: text };
	}

	return {
		reasoningText: taggedReasoning || undefined,
		answerText: strippedAnswer || undefined,
	};
}

/**
 * 从文本中提取 thinking 标签内的内容
 *
 * 支持流式场景中的未闭合标签
 */
export function extractThinkingContent(text: string): string {
	if (!text) return "";

	let result = "";
	let lastIndex = 0;
	let inThinking = false;

	// 重置正则表达式的 lastIndex
	THINKING_TAG_PATTERN.lastIndex = 0;

	for (const match of text.matchAll(THINKING_TAG_PATTERN)) {
		const idx = match.index ?? 0;

		if (inThinking) {
			// 如果在 thinking 块内，收集内容
			result += text.slice(lastIndex, idx);
		}

		// 判断是开标签还是闭标签
		// match[1] 是捕获组，如果是 "/" 表示闭标签
		inThinking = match[1] !== "/";
		lastIndex = idx + match[0].length;
	}

	// 处理未闭合的标签（流式场景）
	if (inThinking) {
		result += text.slice(lastIndex);
	}

	return result.trim();
}

/**
 * 移除文本中的 thinking 标签及其内容
 */
export function stripReasoningTags(text: string): string {
	if (!text) return "";

	// 1. 移除完整的 thinking 标签块
	let result = text.replace(COMPLETE_THINKING_BLOCK_PATTERN, "");

	// 2. 移除末尾未闭合的 thinking 标签及其内容
	result = result.replace(UNCLOSED_THINKING_PATTERN, "");

	// 3. 移除孤立的闭合标签
	result = result.replace(ORPHANED_CLOSING_TAG_PATTERN, "");

	return result.trim();
}

/**
 * 检查文本是否包含 thinking 内容
 */
export function hasReasoningContent(text?: string): boolean {
	if (!text) return false;

	// 检查 "Reasoning:" 前缀
	if (text.trim().startsWith(REASONING_PREFIX)) {
		return true;
	}

	// 检查 thinking 标签
	THINKING_TAG_PATTERN.lastIndex = 0;
	return THINKING_TAG_PATTERN.test(text);
}

/**
 * 检查文本是否只包含 thinking 内容（没有回答部分）
 */
export function isPureReasoning(text?: string): boolean {
	if (!text) return false;

	const trimmed = text.trim();

	// "Reasoning:" 前缀格式表示纯思考
	if (trimmed.startsWith(REASONING_PREFIX)) {
		return true;
	}

	const split = splitReasoningText(text);
	return !!split.reasoningText && !split.answerText;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 清理 "Reasoning:" 前缀格式的内容
 * 移除前缀和每行的斜体标记
 */
function cleanReasoningPrefix(text: string): string {
	// 移除前缀
	let cleaned = text.replace(/^Reasoning:\s*/i, "");

	// 移除每行的斜体标记（_text_ -> text）
	cleaned = cleaned
		.split("\n")
		.map((line) => line.replace(/^_(.+)_$/, "$1"))
		.join("\n");

	return cleaned.trim();
}

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * 格式化思考耗时
 * @param ms 毫秒数
 * @returns 格式化后的字符串，如 "Thought for 3.2s" 或 "Thought for 1m 15s"
 */
export function formatReasoningDuration(ms: number): string {
	// 防护负数输入
	const safeMs = Math.max(0, ms);
	return `Thought for ${formatElapsed(safeMs)}`;
}

/**
 * 格式化耗时
 * @param ms 毫秒数
 */
export function formatElapsed(ms: number): string {
	// 防护负数输入
	const safeMs = Math.max(0, ms);
	const seconds = safeMs / 1000;
	if (seconds < 60) {
		return `${seconds.toFixed(1)}s`;
	}
	return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

/**
 * 构建思考内容显示文本
 * @param reasoningText 思考内容
 * @param isStreaming 是否是流式场景
 */
export function buildReasoningDisplay(reasoningText: string, isStreaming: boolean = false): string {
	if (isStreaming) {
		return `💭 **Thinking...**\n\n${reasoningText}`;
	}
	return reasoningText;
}
