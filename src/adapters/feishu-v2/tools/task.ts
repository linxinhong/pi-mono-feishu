/**
 * Feishu V2 Tools - Task
 *
 * 飞书任务工具
 */

import type * as lark from "@larksuiteoapi/node-sdk";

// ============================================================================
// Types
// ============================================================================

export interface Task {
	id: string;
	subject: string;
	description?: string;
	startTime?: number;
	endTime?: number;
	status: "todo" | "in_progress" | "done" | "cancelled";
	priority?: "low" | "medium" | "high";
	creatorId?: string;
	assignees?: string[];
	completedAt?: number;
	createdAt: number;
	updatedAt?: number;
}

export interface TaskList {
	items: Task[];
	pageToken?: string;
	hasMore: boolean;
}

// ============================================================================
// Task Tool
// ============================================================================

/**
 * 飞书任务工具
 */
export class FeishuTaskTool {
	private client: lark.Client;

	constructor(client: lark.Client) {
		this.client = client;
	}

	/**
	 * 获取任务列表
	 */
	async listTasks(options?: {
		pageSize?: number;
		pageToken?: string;
		startTime?: number;
		endTime?: number;
	}): Promise<TaskList> {
		const result = await (this.client.task as any).task?.list?.({
			params: {
				page_size: options?.pageSize || 50,
				page_token: options?.pageToken,
				start_time: options?.startTime,
				end_time: options?.endTime,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to list tasks: ${result?.msg}`);
		}

		return {
			items: (result.data?.items || []).map((item: any) => this.parseTask(item)),
			pageToken: result.data?.page_token,
			hasMore: result.data?.has_more || false,
		};
	}

	/**
	 * 获取任务详情
	 */
	async getTask(taskId: string): Promise<Task> {
		const result = await (this.client.task as any).task?.get?.({
			path: { task_id: taskId },
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to get task: ${result?.msg}`);
		}

		return this.parseTask(result.data);
	}

	/**
	 * 创建任务
	 */
	async createTask(options: {
		subject: string;
		description?: string;
		startTime?: number;
		endTime?: number;
		priority?: "low" | "medium" | "high";
		assignees?: string[];
	}): Promise<Task> {
		const result = await (this.client.task as any).task?.create?.({
			data: {
				subject: options.subject,
				description: options.description,
				start_time: options.startTime,
				end_time: options.endTime,
				priority: this.mapPriority(options.priority),
				assignees: options.assignees?.map((id) => ({ id, type: "user" })),
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to create task: ${result?.msg}`);
		}

		return this.parseTask(result.data);
	}

	/**
	 * 更新任务
	 */
	async updateTask(
		taskId: string,
		options: {
			subject?: string;
			description?: string;
			startTime?: number;
			endTime?: number;
			status?: "todo" | "in_progress" | "done" | "cancelled";
			priority?: "low" | "medium" | "high";
		},
	): Promise<Task> {
		const result = await (this.client.task as any).task?.patch?.({
			path: { task_id: taskId },
			data: {
				subject: options.subject,
				description: options.description,
				start_time: options.startTime,
				end_time: options.endTime,
				status: this.mapStatus(options.status),
				priority: this.mapPriority(options.priority),
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to update task: ${result?.msg}`);
		}

		return this.parseTask(result.data);
	}

	/**
	 * 删除任务
	 */
	async deleteTask(taskId: string): Promise<void> {
		const result = await (this.client.task as any).task?.delete?.({
			path: { task_id: taskId },
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to delete task: ${result?.msg}`);
		}
	}

	/**
	 * 完成任务
	 */
	async completeTask(taskId: string): Promise<Task> {
		return this.updateTask(taskId, { status: "done" });
	}

	/**
	 * 取消任务
	 */
	async cancelTask(taskId: string): Promise<Task> {
		return this.updateTask(taskId, { status: "cancelled" });
	}

	// ==========================================================================
	// Helper Methods
	// ==========================================================================

	private parseTask(data: any): Task {
		return {
			id: data.task_id || data.id,
			subject: data.subject,
			description: data.description,
			startTime: data.start_time,
			endTime: data.end_time,
			status: this.parseStatus(data.status),
			priority: this.parsePriority(data.priority),
			creatorId: data.creator?.id,
			assignees: data.assignees?.map((a: any) => a.id),
			completedAt: data.completed_at,
			createdAt: data.created_at,
			updatedAt: data.updated_at,
		};
	}

	private parseStatus(status: string): Task["status"] {
		switch (status) {
			case "todo":
			case "0":
				return "todo";
			case "in_progress":
			case "1":
				return "in_progress";
			case "done":
			case "2":
				return "done";
			case "cancelled":
			case "3":
				return "cancelled";
			default:
				return "todo";
		}
	}

	private mapStatus(status?: Task["status"]): string | undefined {
		if (!status) return undefined;
		return status;
	}

	private parsePriority(priority: number): Task["priority"] {
		if (priority === 1) return "high";
		if (priority === 2) return "medium";
		return "low";
	}

	private mapPriority(priority?: Task["priority"]): number | undefined {
		if (!priority) return undefined;
		switch (priority) {
			case "high":
				return 1;
			case "medium":
				return 2;
			case "low":
				return 3;
			default:
				return undefined;
		}
	}
}
