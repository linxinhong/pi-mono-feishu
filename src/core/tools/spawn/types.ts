/**
 * Spawn Tool Types - 类型定义
 */

import { Type, Static } from "@sinclair/typebox";

// ============================================================================
// Agent Type Enum
// ============================================================================

/**
 * 子 Agent 类型
 */
export enum AgentType {
	/** 只读探索 - 禁止任何写入操作 */
	EXPLORE = "explore",
	/** 内容总结与提取 */
	SUMMARIZE = "summarize",
	/** 任务创建、查询、更新 */
	TASK_MANAGER = "task_manager",
	/** 联网搜索，整理实时信息 */
	SEARCH = "search",
	/** 通用类型 - 继承全部工具 */
	GENERAL = "general",
}

// ============================================================================
// Agent Type Config
// ============================================================================

/**
 * Agent 类型配置
 */
export interface AgentTypeConfig {
	/** 类型名称 */
	name: string;
	/** 描述 */
	description: string;
	/** 允许的工具名称列表（白名单，空数组表示全部） */
	allowedTools: string[];
	/** 禁止的工具名称列表（黑名单，优先级高于白名单） */
	deniedTools?: string[];
	/** 自定义系统提示词前缀 */
	systemPromptPrefix?: string;
	/** 是否只读模式 */
	readOnly?: boolean;
}

/**
 * Agent 类型配置映射
 */
export const AGENT_TYPE_CONFIGS: Record<AgentType, AgentTypeConfig> = {
	[AgentType.EXPLORE]: {
		name: "Explore Agent",
		description: "只读探索代码库，禁止任何写入操作",
		allowedTools: ["read", "glob", "grep"],
		deniedTools: ["write", "edit", "bash"],
		systemPromptPrefix: `You are an exploration agent. Your task is to READ ONLY.
You MUST NOT modify any files. Use read, glob, and grep tools to explore the codebase.
Report your findings clearly and concisely.`,
		readOnly: true,
	},

	[AgentType.SUMMARIZE]: {
		name: "Summarize Agent",
		description: "内容总结与提取",
		allowedTools: ["read", "glob", "grep", "web_reader"],
		systemPromptPrefix: `You are a summarization agent. Extract key information and create concise summaries.
Focus on the most important points and present them clearly.`,
		readOnly: true,
	},

	[AgentType.TASK_MANAGER]: {
		name: "Task Manager Agent",
		description: "任务创建、查询、更新",
		allowedTools: ["read", "write", "edit", "glob", "grep", "bash"],
		systemPromptPrefix: `You are a task management agent. Help users manage their tasks efficiently.
Create, update, and organize tasks as requested.`,
	},

	[AgentType.SEARCH]: {
		name: "Search Agent",
		description: "联网搜索，整理实时信息",
		allowedTools: ["web_search", "web_reader", "read", "glob", "grep"],
		systemPromptPrefix: `You are a search agent. Search the web and compile relevant, up-to-date information.
Provide comprehensive and accurate results.`,
		readOnly: true,
	},

	[AgentType.GENERAL]: {
		name: "General Agent",
		description: "通用类型 - 继承全部工具",
		allowedTools: [], // 空数组表示使用全部工具
	},
};

// ============================================================================
// Schema Definitions
// ============================================================================

/**
 * 单个子任务定义 Schema
 */
export const SubTaskSchema = Type.Object({
	task: Type.String({ description: "Task description" }),
	label: Type.String({ description: "Short label for this task" }),
	agent_type: Type.Optional(
		Type.Union(
			[
				Type.Literal("explore"),
				Type.Literal("summarize"),
				Type.Literal("task_manager"),
				Type.Literal("search"),
				Type.Literal("general"),
			],
			{ description: "Agent type (default: general)" },
		),
	),
	timeout: Type.Optional(Type.Number({ description: "Timeout in ms (default: 60000)" })),
	context: Type.Optional(Type.String({ description: "Additional context" })),
});

/**
 * Spawn 工具参数 Schema
 */
export const SpawnToolSchema = Type.Object({
	// 单任务模式
	task: Type.Optional(Type.String({ description: "Single task description" })),
	label: Type.Optional(Type.String({ description: "Short label for single task" })),
	agent_type: Type.Optional(Type.String({ description: "Agent type for single task" })),
	timeout: Type.Optional(Type.Number({ description: "Default timeout in ms" })),

	// 多任务并行模式
	tasks: Type.Optional(
		Type.Array(SubTaskSchema, {
			description: "Array of tasks to execute (mutually exclusive with task)",
		}),
	),

	// 执行模式
	parallel: Type.Optional(
		Type.Boolean({
			description: "Execute tasks in parallel (default: true)",
		}),
	),
});

export type SpawnToolParams = Static<typeof SpawnToolSchema>;

// ============================================================================
// Result Types
// ============================================================================

/**
 * 子任务执行结果
 */
export interface SubTaskResult {
	/** 任务标签 */
	label: string;
	/** 是否成功 */
	success: boolean;
	/** 执行结果 */
	result: string;
	/** 执行时长（毫秒） */
	duration: number;
	/** Agent 类型 */
	agentType: AgentType;
	/** 错误信息 */
	error?: string;
}

/**
 * Spawn 工具返回结果
 */
export interface SpawnResult {
	/** 是否全部成功 */
	success: boolean;
	/** 所有任务结果 */
	results: SubTaskResult[];
	/** 总耗时 */
	totalDuration: number;
	/** 任务总数 */
	taskCount: number;
	/** 成功数量 */
	successCount: number;
}

// ============================================================================
// Sub Task Definition
// ============================================================================

/**
 * 子任务定义（内部使用）
 */
export interface SubTaskDefinition {
	task: string;
	label: string;
	agentType: AgentType;
	timeout: number;
	context?: string;
}
