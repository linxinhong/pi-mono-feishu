/**
 * Memory Tools - 记忆工具创建
 *
 * 提供 Agent 工具形式的记忆操作接口
 */

import { Type, Static } from "@sinclair/typebox";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import { appendFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { MemoryStore } from "./store.js";

// ============================================================================
// Memory Save Tool
// ============================================================================

const MemorySaveSchema = Type.Object({
	content: Type.String({ description: "Information to save to memory" }),
	label: Type.String({ description: "Short label shown to user" }),
});
type MemorySaveParams = Static<typeof MemorySaveSchema>;

export function createMemorySaveTool(store: MemoryStore): AgentTool<typeof MemorySaveSchema> {
	return {
		name: "memory_save",
		label: "Memory Save",
		description: "Save important information to long-term memory.",
		parameters: MemorySaveSchema,
		execute: async (_toolCallId, params: MemorySaveParams, _signal, _onUpdate) => {
			const { content } = params;
			try {
				store.append(content);
				return {
					content: [{ type: "text", text: `Saved to memory: ${content.substring(0, 100)}...` }],
					details: { saved: true },
				};
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Error: ${error.message}` }],
					details: { error: error.message },
				};
			}
		},
	};
}

// ============================================================================
// Memory Recall Tool
// ============================================================================

const MemoryRecallSchema = Type.Object({
	query: Type.String({ description: "Search query" }),
	label: Type.String({ description: "Short label shown to user" }),
});
type MemoryRecallParams = Static<typeof MemoryRecallSchema>;

export function createMemoryRecallTool(store: MemoryStore): AgentTool<typeof MemoryRecallSchema> {
	return {
		name: "memory_recall",
		label: "Memory Recall",
		description: "Search and retrieve information from long-term memory.",
		parameters: MemoryRecallSchema,
		execute: async (_toolCallId, params: MemoryRecallParams, _signal, _onUpdate) => {
			const { query } = params;
			try {
				const results = store.search(query);
				if (results.length === 0) {
					return {
						content: [{ type: "text", text: "No matching memories found." }],
						details: { count: 0 },
					};
				}
				return {
					content: [{ type: "text", text: results.slice(0, 10).join("\n\n---\n\n") }],
					details: { count: results.length },
				};
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Error: ${error.message}` }],
					details: { error: error.message },
				};
			}
		},
	};
}

// ============================================================================
// Memory Forget Tool
// ============================================================================

const MemoryForgetSchema = Type.Object({
	pattern: Type.String({ description: "Pattern to match and remove" }),
	label: Type.String({ description: "Short label shown to user" }),
});
type MemoryForgetParams = Static<typeof MemoryForgetSchema>;

export function createMemoryForgetTable(store: MemoryStore): AgentTool<typeof MemoryForgetSchema> {
	return {
		name: "memory_forget",
		label: "Memory Forget",
		description: "Remove information from memory by pattern.",
		parameters: MemoryForgetSchema,
		execute: async (_toolCallId, params: MemoryForgetParams, _signal, _onUpdate) => {
			const { pattern } = params;
			try {
				const removed = store.forget(pattern);
				return {
					content: [{ type: "text", text: `Removed ${removed} lines from memory.` }],
					details: { removedLines: removed },
				};
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Error: ${error.message}` }],
					details: { error: error.message },
				};
			}
		},
	};
}

// ============================================================================
// Memory Append Daily Tool
// ============================================================================

const MemoryAppendDailySchema = Type.Object({
	content: Type.String({ description: "Content to append to daily log" }),
	label: Type.String({ description: "Short label shown to user" }),
});
type MemoryAppendDailyParams = Static<typeof MemoryAppendDailySchema>;

export function createMemoryAppendDailyTool(workspaceDir: string): AgentTool<typeof MemoryAppendDailySchema> {
	return {
		name: "memory_append_daily",
		label: "Memory Append Daily",
		description: "Append to today's daily log.",
		parameters: MemoryAppendDailySchema,
		execute: async (_toolCallId, params: MemoryAppendDailyParams, _signal, _onUpdate) => {
			const { content } = params;
			try {
				const today = new Date().toISOString().split("T")[0];
				const dailyLogPath = join(workspaceDir, "memory", `${today}.md`);
				const dir = join(dailyLogPath, "..");

				if (!existsSync(dir)) {
					mkdirSync(dir, { recursive: true });
				}

				const timestamp = new Date().toTimeString().split(" ")[0];
				const entry = `- [${timestamp}] ${content}\n`;
				appendFileSync(dailyLogPath, entry, "utf-8");

				return {
					content: [{ type: "text", text: `Appended to daily log: ${content.substring(0, 100)}...` }],
					details: { date: today },
				};
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Error: ${error.message}` }],
					details: { error: error.message },
				};
			}
		},
	};
}

// ============================================================================
// Channel Memory Save Tool
// ============================================================================

const ChannelMemorySaveSchema = Type.Object({
	content: Type.String({ description: "Information to save to channel memory" }),
	label: Type.String({ description: "Short label shown to user" }),
});
type ChannelMemorySaveParams = Static<typeof ChannelMemorySaveSchema>;

export function createChannelMemorySaveTool(channelStore: MemoryStore): AgentTool<typeof ChannelMemorySaveSchema> {
	return {
		name: "channel_memory_save",
		label: "Channel Memory Save",
		description: "Save information to this channel's memory. Use for channel-specific context that should persist across conversations in this channel.",
		parameters: ChannelMemorySaveSchema,
		execute: async (_toolCallId, params: ChannelMemorySaveParams, _signal, _onUpdate) => {
			const { content } = params;
			try {
				channelStore.append(content);
				return {
					content: [{ type: "text", text: `Saved to channel memory: ${content.substring(0, 100)}...` }],
					details: { saved: true },
				};
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Error: ${error.message}` }],
					details: { error: error.message },
				};
			}
		},
	};
}

// ============================================================================
// Channel Memory Recall Tool
// ============================================================================

const ChannelMemoryRecallSchema = Type.Object({
	query: Type.String({ description: "Search query" }),
	label: Type.String({ description: "Short label shown to user" }),
});
type ChannelMemoryRecallParams = Static<typeof ChannelMemoryRecallSchema>;

export function createChannelMemoryRecallTool(channelStore: MemoryStore): AgentTool<typeof ChannelMemoryRecallSchema> {
	return {
		name: "channel_memory_recall",
		label: "Channel Memory Recall",
		description: "Search and retrieve information from this channel's memory. Use to recall channel-specific context.",
		parameters: ChannelMemoryRecallSchema,
		execute: async (_toolCallId, params: ChannelMemoryRecallParams, _signal, _onUpdate) => {
			const { query } = params;
			try {
				const results = channelStore.search(query);
				if (results.length === 0) {
					return {
						content: [{ type: "text", text: "No matching channel memories found." }],
						details: { count: 0 },
					};
				}
				return {
					content: [{ type: "text", text: results.slice(0, 10).join("\n\n---\n\n") }],
					details: { count: results.length },
				};
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Error: ${error.message}` }],
					details: { error: error.message },
				};
			}
		},
	};
}

// ============================================================================
// Channel Memory Forget Tool
// ============================================================================

const ChannelMemoryForgetSchema = Type.Object({
	pattern: Type.String({ description: "Pattern to match and remove" }),
	label: Type.String({ description: "Short label shown to user" }),
});
type ChannelMemoryForgetParams = Static<typeof ChannelMemoryForgetSchema>;

export function createChannelMemoryForgetTable(channelStore: MemoryStore): AgentTool<typeof ChannelMemoryForgetSchema> {
	return {
		name: "channel_memory_forget",
		label: "Channel Memory Forget",
		description: "Remove information from this channel's memory by pattern.",
		parameters: ChannelMemoryForgetSchema,
		execute: async (_toolCallId, params: ChannelMemoryForgetParams, _signal, _onUpdate) => {
			const { pattern } = params;
			try {
				const removed = channelStore.forget(pattern);
				return {
					content: [{ type: "text", text: `Removed ${removed} lines from channel memory.` }],
					details: { removedLines: removed },
				};
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Error: ${error.message}` }],
					details: { error: error.message },
				};
			}
		},
	};
}

/**
 * 获取所有记忆工具
 */
export function getAllMemoryTools(
	globalStore: MemoryStore,
	channelStore: MemoryStore,
	workspaceDir: string
): AgentTool<any>[] {
	return [
		// 全局记忆工具
		createMemorySaveTool(globalStore),
		createMemoryRecallTool(globalStore),
		createMemoryForgetTable(globalStore),
		createMemoryAppendDailyTool(workspaceDir),
		// 频道记忆工具
		createChannelMemorySaveTool(channelStore),
		createChannelMemoryRecallTool(channelStore),
		createChannelMemoryForgetTable(channelStore),
	];
}
