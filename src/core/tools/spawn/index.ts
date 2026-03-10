/**
 * Spawn Tool - 派发子 Agent
 *
 * 允许主 Agent 派发子任务给独立的子 Agent 执行
 * 支持多种 Agent 类型和并行执行
 */

import type { AgentTool } from "@mariozechner/pi-agent-core";
import type { Executor } from "../../sandbox/index.js";
import type { ModelManager } from "../../model/manager.js";
import {
	AgentType,
	SpawnToolSchema,
	type SpawnToolParams,
	type SpawnResult,
	type SubTaskDefinition,
} from "./types.js";
import { SubAgentFactory } from "./sub-agent-factory.js";
import { SubTaskExecutor } from "./sub-task-executor.js";
import * as log from "../../../utils/logger/index.js";

// ============================================================================
// Spawn Tool Config
// ============================================================================

/**
 * Spawn 工具配置
 */
export interface SpawnToolConfig {
	executor: Executor;
	modelManager: ModelManager;
	workspaceDir: string;
	channelDir: string;
	/** 父 Agent 的工具列表（用于子 Agent 继承） */
	parentTools: AgentTool<any>[];
}

// ============================================================================
// Spawn Tool Factory
// ============================================================================

/**
 * 创建 Spawn 工具
 */
export function createSpawnTool(config: SpawnToolConfig): AgentTool<typeof SpawnToolSchema> {
	// 创建工厂和执行器
	const factory = new SubAgentFactory({
		executor: config.executor,
		modelManager: config.modelManager,
		workspaceDir: config.workspaceDir,
		channelDir: config.channelDir,
		parentTools: config.parentTools,
	});

	const executor = new SubTaskExecutor(factory);

	return {
		name: "spawn",
		label: "Spawn",
		description: `Spawn sub-agents to execute tasks in parallel.

Agent types:
- explore: Read-only code exploration (read, glob, grep)
- summarize: Content summarization
- task_manager: Task CRUD operations
- search: Web search
- general: Full tool access

Use 'tasks' array for parallel execution.

Example (single task):
{
  "task": "探索 src/core 目录结构",
  "agent_type": "explore",
  "label": "探索核心代码"
}

Example (parallel tasks):
{
  "tasks": [
    { "task": "搜索 API 文档", "agent_type": "search", "label": "搜索1" },
    { "task": "总结 README", "agent_type": "summarize", "label": "总结1" }
  ]
}`,
		parameters: SpawnToolSchema,
		execute: async (_toolCallId, params: SpawnToolParams, _signal, _onUpdate) => {
			const startTime = Date.now();

			try {
				// 解析任务列表
				const taskDefs = parseTaskDefinitions(params);

				if (taskDefs.length === 0) {
					return {
						content: [{ type: "text", text: "No tasks provided. Use 'task' for single task or 'tasks' array for multiple tasks." }],
						details: { error: "no_tasks" },
					};
				}

				// 执行任务
				const parallel = params.parallel !== false; // 默认并行
				const results = parallel ? await executor.executeTasksParallel(taskDefs) : await executor.executeTasksSequential(taskDefs);

				// 格式化结果
				const output = formatResults(results);
				const totalDuration = Date.now() - startTime;

				return {
					content: [{ type: "text", text: output }],
					details: {
						success: results.every((r) => r.success),
						taskCount: results.length,
						successCount: results.filter((r) => r.success).length,
						totalDuration,
						results,
					} as SpawnResult,
				};
			} catch (error: any) {
				log.logError(`[Spawn] Error: ${error.message}`);
				return {
					content: [{ type: "text", text: `Spawn error: ${error.message}` }],
					details: { error: error.message },
				};
			}
		},
	};
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 解析任务定义
 */
function parseTaskDefinitions(params: SpawnToolParams): SubTaskDefinition[] {
	const defaultTimeout = params.timeout || 60000;

	// 多任务模式
	if (params.tasks && params.tasks.length > 0) {
		return params.tasks.map((t, index) => ({
			task: t.task,
			label: t.label || `Task ${index + 1}`,
			agentType: parseAgentType(t.agent_type),
			timeout: t.timeout || defaultTimeout,
			context: t.context,
		}));
	}

	// 单任务模式
	if (params.task) {
		return [
			{
				task: params.task,
				label: params.label || "Sub-task",
				agentType: parseAgentType(params.agent_type),
				timeout: defaultTimeout,
			},
		];
	}

	return [];
}

/**
 * 解析 Agent 类型
 */
function parseAgentType(type?: string): AgentType {
	if (!type) return AgentType.GENERAL;

	const normalized = type.toLowerCase().trim();
	switch (normalized) {
		case "explore":
			return AgentType.EXPLORE;
		case "summarize":
			return AgentType.SUMMARIZE;
		case "task_manager":
		case "task":
			return AgentType.TASK_MANAGER;
		case "search":
			return AgentType.SEARCH;
		case "general":
		default:
			return AgentType.GENERAL;
	}
}

/**
 * 格式化结果输出
 */
function formatResults(results: SpawnResult["results"]): string {
	const lines: string[] = [];

	for (const result of results) {
		lines.push(`### ${result.label}`);
		lines.push(`Type: ${result.agentType} | Duration: ${result.duration}ms | Status: ${result.success ? "OK" : "FAILED"}`);

		if (result.success) {
			lines.push("");
			lines.push(result.result || "(no output)");
		} else {
			lines.push("");
			lines.push(`**Error**: ${result.error}`);
		}

		lines.push("");
		lines.push("---");
		lines.push("");
	}

	return lines.join("\n");
}

// ============================================================================
// Re-exports
// ============================================================================

export { AgentType, type SpawnToolParams, type SubTaskResult, type SpawnResult } from "./types.js";
