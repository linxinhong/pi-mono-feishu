/**
 * Feishu V2 Tools Module
 *
 * 飞书工具功能统一入口
 */

import type * as lark from "@larksuiteoapi/node-sdk";

// ============================================================================
// 任务工具
// ============================================================================

export { FeishuTaskTool, type Task, type TaskList } from "./task.js";

// ============================================================================
// 多维表格工具
// ============================================================================

export {
	FeishuBitableTool,
	type BitableRecord,
	type BitableField,
	type BitableInfo,
	type BitableTable,
	type BitableView,
} from "./bitable.js";

// ============================================================================
// 文档工具
// ============================================================================

export { FeishuDocTool, type DocInfo, type DocContent, type DocBlock } from "./doc.js";

// ============================================================================
// 日历工具
// ============================================================================

export { FeishuCalendarTool, type CalendarEvent, type CalendarInfo } from "./calendar.js";

// ============================================================================
// 知识库工具
// ============================================================================

export { FeishuWikiTool, type WikiNode, type WikiSpace } from "./wiki.js";

// ============================================================================
// 云盘工具
// ============================================================================

export { FeishuDriveTool, type DriveFile, type DriveFolder } from "./drive.js";

// ============================================================================
// 工具管理器
// ============================================================================

/**
 * 飞书工具管理器
 */
export class FeishuToolsManager {
	private client: lark.Client;
	public task!: import("./task.js").FeishuTaskTool;
	public bitable!: import("./bitable.js").FeishuBitableTool;
	public doc!: import("./doc.js").FeishuDocTool;
	public calendar!: import("./calendar.js").FeishuCalendarTool;
	public wiki!: import("./wiki.js").FeishuWikiTool;
	public drive!: import("./drive.js").FeishuDriveTool;

	private constructor(client: lark.Client) {
		this.client = client;
	}

	/**
	 * 创建工具管理器实例
	 */
	static async create(client: lark.Client): Promise<FeishuToolsManager> {
		const manager = new FeishuToolsManager(client);
		const [task, bitable, doc, calendar, wiki, drive] = await Promise.all([
			import("./task.js"),
			import("./bitable.js"),
			import("./doc.js"),
			import("./calendar.js"),
			import("./wiki.js"),
			import("./drive.js"),
		]);
		manager.task = new task.FeishuTaskTool(client);
		manager.bitable = new bitable.FeishuBitableTool(client);
		manager.doc = new doc.FeishuDocTool(client);
		manager.calendar = new calendar.FeishuCalendarTool(client);
		manager.wiki = new wiki.FeishuWikiTool(client);
		manager.drive = new drive.FeishuDriveTool(client);
		return manager;
	}

	/**
	 * 获取所有工具
	 */
	getAllTools() {
		return {
			task: this.task,
			bitable: this.bitable,
			doc: this.doc,
			calendar: this.calendar,
			wiki: this.wiki,
			drive: this.drive,
		};
	}
}

/**
 * 创建飞书工具集
 */
export async function createFeishuTools(client: lark.Client): Promise<FeishuToolsManager> {
	return FeishuToolsManager.create(client);
}
