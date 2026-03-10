/**
 * Sub Task Executor - 子任务执行器
 *
 * 负责执行子任务并收集结果
 */

import type { AgentSession } from "@mariozechner/pi-coding-agent";
import { AgentType, type SubTaskResult, type SubTaskDefinition } from "./types.js";
import { SubAgentFactory } from "./sub-agent-factory.js";
import * as log from "../../../utils/logger/index.js";

// ============================================================================
// Sub Task Executor
// ============================================================================

/**
 * 子任务执行器
 */
export class SubTaskExecutor {
	private factory: SubAgentFactory;

	constructor(factory: SubAgentFactory) {
		this.factory = factory;
	}

	/**
	 * 执行单个子任务
	 */
	async executeTask(taskDef: SubTaskDefinition): Promise<SubTaskResult> {
		const startTime = Date.now();
		const { task, label, agentType, timeout, context } = taskDef;

		try {
			log.logInfo(`[Spawn] Starting sub-task: ${label} (type: ${agentType})`);

			// 创建子 Agent
			const { session } = await this.factory.createSubAgent(agentType, task, context);

			// 执行任务并等待结果
			const result = await this.runSession(session, task, timeout);

			const duration = Date.now() - startTime;
			log.logInfo(`[Spawn] Completed sub-task: ${label} (${duration}ms)`);

			return {
				label,
				success: true,
				result,
				duration,
				agentType,
			};
		} catch (error: any) {
			const duration = Date.now() - startTime;
			log.logError(`[Spawn] Failed sub-task: ${label} - ${error.message}`);

			return {
				label,
				success: false,
				result: "",
				duration,
				agentType,
				error: error.message,
			};
		}
	}

	/**
	 * 并行执行多个子任务
	 */
	async executeTasksParallel(tasks: SubTaskDefinition[]): Promise<SubTaskResult[]> {
		log.logInfo(`[Spawn] Starting ${tasks.length} tasks in parallel`);

		const promises = tasks.map((task) => this.executeTask(task));
		const results = await Promise.all(promises);

		const successCount = results.filter((r) => r.success).length;
		log.logInfo(`[Spawn] Completed ${successCount}/${tasks.length} tasks successfully`);

		return results;
	}

	/**
	 * 顺序执行多个子任务
	 */
	async executeTasksSequential(tasks: SubTaskDefinition[]): Promise<SubTaskResult[]> {
		log.logInfo(`[Spawn] Starting ${tasks.length} tasks sequentially`);

		const results: SubTaskResult[] = [];
		for (const task of tasks) {
			const result = await this.executeTask(task);
			results.push(result);
		}

		return results;
	}

	/**
	 * 运行 AgentSession 并获取结果
	 */
	private async runSession(session: AgentSession, prompt: string, timeout: number): Promise<string> {
		return new Promise((resolve, reject) => {
			let finalResponse = "";
			let timeoutHandle: NodeJS.Timeout | undefined;
			let settled = false;

			// 设置超时
			if (timeout > 0) {
				timeoutHandle = setTimeout(() => {
					if (!settled) {
						settled = true;
						reject(new Error(`Task timed out after ${timeout}ms`));
					}
				}, timeout);
			}

			// 订阅事件
			const unsubscribe = session.subscribe((event) => {
				if (settled) return;

				if (event.type === "message_end" && event.message.role === "assistant") {
					const content = event.message.content;
					const textParts = content.filter((c: any) => c.type === "text").map((c: any) => c.text);
					finalResponse = textParts.join("\n");

					settled = true;
					if (timeoutHandle) clearTimeout(timeoutHandle);
					unsubscribe();
					resolve(finalResponse);
				}
			});

			// 执行 prompt
			session.prompt(prompt).catch((error) => {
				if (!settled) {
					settled = true;
					if (timeoutHandle) clearTimeout(timeoutHandle);
					unsubscribe();
					reject(error);
				}
			});
		});
	}
}
