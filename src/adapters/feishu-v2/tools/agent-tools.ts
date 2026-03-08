/**
 * Feishu Agent Tools
 *
 * 将飞书工具类转换为 PlatformTool 格式，供 CoreAgent 加载
 */

import { Type, Static } from "@sinclair/typebox";
import type { PlatformTool } from "../../../core/platform/tools/index.js";
import { FEISHU_TOOL_NAMES, createPlatformDescription, createToolLabel } from "../../../core/platform/tools/index.js";
import type { FeishuTaskTool } from "./task.js";
import type { FeishuCalendarTool } from "./calendar.js";
import type { FeishuBitableTool } from "./bitable.js";
import type { FeishuDocTool } from "./doc.js";
import type { FeishuWikiTool } from "./wiki.js";
import type { FeishuDriveTool } from "./drive.js";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 创建工具执行结果
 */
function createToolResult(text: string, details?: Record<string, any>) {
	return {
		content: [{ type: "text", text } as { type: "text"; text: string }], // Use type assertion
		details: details || {},
	};
}

// ============================================================================
// Task Tools
// ============================================================================

const TaskListSchema = Type.Object({
	pageSize: Type.Optional(Type.Number({ description: "每页数量，默认 50" })),
	pageToken: Type.Optional(Type.String({ description: "分页 token" })),
	startTime: Type.Optional(Type.Number({ description: "开始时间戳（毫秒）" })),
	endTime: Type.Optional(Type.Number({ description: "结束时间戳（毫秒）" })),
});

const TaskGetSchema = Type.Object({
	taskId: Type.String({ description: "任务 ID" }),
});

const TaskCreateSchema = Type.Object({
	subject: Type.String({ description: "任务标题" }),
	description: Type.Optional(Type.String({ description: "任务描述" })),
	startTime: Type.Optional(Type.Number({ description: "开始时间戳（毫秒）" })),
	endTime: Type.Optional(Type.Number({ description: "结束时间戳（毫秒）" })),
	priority: Type.Optional(Type.Union([Type.Literal("low"), Type.Literal("medium"), Type.Literal("high")], { description: "优先级" })),
	assignees: Type.Optional(Type.Array(Type.String(), { description: "负责人 ID 列表" })),
});

const TaskUpdateSchema = Type.Object({
	taskId: Type.String({ description: "任务 ID" }),
	subject: Type.Optional(Type.String({ description: "任务标题" })),
	description: Type.Optional(Type.String({ description: "任务描述" })),
	startTime: Type.Optional(Type.Number({ description: "开始时间戳（毫秒）" })),
	endTime: Type.Optional(Type.Number({ description: "结束时间戳（毫秒）" })),
	status: Type.Optional(Type.Union([Type.Literal("todo"), Type.Literal("in_progress"), Type.Literal("done"), Type.Literal("cancelled")], { description: "任务状态" })),
	priority: Type.Optional(Type.Union([Type.Literal("low"), Type.Literal("medium"), Type.Literal("high")], { description: "优先级" })),
});

const TaskDeleteSchema = Type.Object({
	taskId: Type.String({ description: "任务 ID" }),
});

export function createFeishuTaskTools(task: FeishuTaskTool): PlatformTool[] {
	return [
		{
			name: FEISHU_TOOL_NAMES.TASK_LIST,
			label: createToolLabel("feishu", "任务列表"),
			description: createPlatformDescription("feishu", "获取飞书任务列表"),
			parameters: TaskListSchema,
			platformMeta: { platform: "feishu", category: "task", localName: "list" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const result = await task.listTasks(params as Static<typeof TaskListSchema>);
				return createToolResult(JSON.stringify(result, null, 2));
			},
		},
		{
			name: FEISHU_TOOL_NAMES.TASK_GET,
			label: createToolLabel("feishu", "获取任务"),
			description: createPlatformDescription("feishu", "获取飞书任务详情"),
			parameters: TaskGetSchema,
			platformMeta: { platform: "feishu", category: "task", localName: "get" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const { taskId } = params as Static<typeof TaskGetSchema>;
				const result = await task.getTask(taskId);
				return createToolResult(JSON.stringify(result, null, 2));
			},
		},
		{
			name: FEISHU_TOOL_NAMES.TASK_CREATE,
			label: createToolLabel("feishu", "创建任务"),
			description: createPlatformDescription("feishu", "创建飞书任务"),
			parameters: TaskCreateSchema,
			platformMeta: { platform: "feishu", category: "task", localName: "create" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const result = await task.createTask(params as Static<typeof TaskCreateSchema>);
				return createToolResult(JSON.stringify(result, null, 2));
			},
		},
		{
			name: FEISHU_TOOL_NAMES.TASK_UPDATE,
			label: createToolLabel("feishu", "更新任务"),
			description: createPlatformDescription("feishu", "更新飞书任务"),
			parameters: TaskUpdateSchema,
			platformMeta: { platform: "feishu", category: "task", localName: "update" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const { taskId, ...options } = params as Static<typeof TaskUpdateSchema>;
				const result = await task.updateTask(taskId, options);
				return createToolResult(JSON.stringify(result, null, 2));
			},
		},
		{
			name: FEISHU_TOOL_NAMES.TASK_DELETE,
			label: createToolLabel("feishu", "删除任务"),
			description: createPlatformDescription("feishu", "删除飞书任务"),
			parameters: TaskDeleteSchema,
			platformMeta: { platform: "feishu", category: "task", localName: "delete" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const { taskId } = params as Static<typeof TaskDeleteSchema>;
				await task.deleteTask(taskId);
				return createToolResult(`任务 ${taskId} 已删除`);
			},
		},
		{
			name: FEISHU_TOOL_NAMES.TASK_COMPLETE,
			label: createToolLabel("feishu", "完成任务"),
			description: createPlatformDescription("feishu", "完成飞书任务"),
			parameters: TaskGetSchema,
			platformMeta: { platform: "feishu", category: "task", localName: "complete" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const { taskId } = params as Static<typeof TaskGetSchema>;
				const result = await task.completeTask(taskId);
				return createToolResult(JSON.stringify(result, null, 2));
			},
		},
		{
			name: FEISHU_TOOL_NAMES.TASK_CANCEL,
			label: createToolLabel("feishu", "取消任务"),
			description: createPlatformDescription("feishu", "取消飞书任务"),
			parameters: TaskGetSchema,
			platformMeta: { platform: "feishu", category: "task", localName: "cancel" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const { taskId } = params as Static<typeof TaskGetSchema>;
				const result = await task.cancelTask(taskId);
				return createToolResult(JSON.stringify(result, null, 2));
			},
		},
	];
}

// ============================================================================
// Calendar Tools
// ============================================================================

const CalendarListSchema = Type.Object({});

const CalendarGetSchema = Type.Object({
	calendarId: Type.String({ description: "日历 ID" }),
});

const CalendarEventListSchema = Type.Object({
	calendarId: Type.String({ description: "日历 ID" }),
	startTime: Type.Optional(Type.Number({ description: "开始时间戳（秒）" })),
	endTime: Type.Optional(Type.Number({ description: "结束时间戳（秒）" })),
	pageSize: Type.Optional(Type.Number({ description: "每页数量，默认 250" })),
	pageToken: Type.Optional(Type.String({ description: "分页 token" })),
});

const CalendarEventGetSchema = Type.Object({
	calendarId: Type.String({ description: "日历 ID" }),
	eventId: Type.String({ description: "事件 ID" }),
});

const CalendarEventCreateSchema = Type.Object({
	calendarId: Type.String({ description: "日历 ID" }),
	summary: Type.String({ description: "事件标题" }),
	description: Type.Optional(Type.String({ description: "事件描述" })),
	startTime: Type.Number({ description: "开始时间戳（秒）" }),
	endTime: Type.Number({ description: "结束时间戳（秒）" }),
	location: Type.Optional(Type.String({ description: "地点" })),
	attendees: Type.Optional(Type.Array(Type.String(), { description: "参会人 ID 列表" })),
	visibility: Type.Optional(Type.Union([Type.Literal("default"), Type.Literal("public"), Type.Literal("private")], { description: "可见性" })),
});

const CalendarEventUpdateSchema = Type.Object({
	calendarId: Type.String({ description: "日历 ID" }),
	eventId: Type.String({ description: "事件 ID" }),
	summary: Type.Optional(Type.String({ description: "事件标题" })),
	description: Type.Optional(Type.String({ description: "事件描述" })),
	startTime: Type.Optional(Type.Number({ description: "开始时间戳（秒）" })),
	endTime: Type.Optional(Type.Number({ description: "结束时间戳（秒）" })),
	location: Type.Optional(Type.String({ description: "地点" })),
});

const CalendarEventDeleteSchema = Type.Object({
	calendarId: Type.String({ description: "日历 ID" }),
	eventId: Type.String({ description: "事件 ID" }),
});

const CalendarEventSearchSchema = Type.Object({
	query: Type.String({ description: "搜索关键词" }),
	startTime: Type.Optional(Type.Number({ description: "开始时间戳（秒）" })),
	endTime: Type.Optional(Type.Number({ description: "结束时间戳（秒）" })),
	pageSize: Type.Optional(Type.Number({ description: "每页数量，默认 250" })),
});

export function createFeishuCalendarTools(calendar: FeishuCalendarTool): PlatformTool[] {
	return [
		{
			name: FEISHU_TOOL_NAMES.CALENDAR_LIST,
			label: createToolLabel("feishu", "日历列表"),
			description: createPlatformDescription("feishu", "获取飞书日历列表"),
			parameters: CalendarListSchema,
			platformMeta: { platform: "feishu", category: "calendar", localName: "list" },
			execute: async (_toolCallId, _params, _signal, _onUpdate) => {
				const result = await calendar.listCalendars();
				return createToolResult(JSON.stringify(result, null, 2));
			},
		},
		{
			name: FEISHU_TOOL_NAMES.CALENDAR_GET,
			label: createToolLabel("feishu", "获取日历"),
			description: createPlatformDescription("feishu", "获取飞书日历详情"),
			parameters: CalendarGetSchema,
			platformMeta: { platform: "feishu", category: "calendar", localName: "get" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const { calendarId } = params as Static<typeof CalendarGetSchema>;
				const result = await calendar.getCalendar(calendarId);
				return createToolResult(JSON.stringify(result, null, 2));
			},
		},
		{
			name: FEISHU_TOOL_NAMES.CALENDAR_EVENT_LIST,
			label: createToolLabel("feishu", "事件列表"),
			description: createPlatformDescription("feishu", "获取飞书日历事件列表"),
			parameters: CalendarEventListSchema,
			platformMeta: { platform: "feishu", category: "calendar", localName: "event_list" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const { calendarId, ...options } = params as Static<typeof CalendarEventListSchema>;
				const result = await calendar.listEvents(calendarId, options);
				return createToolResult(JSON.stringify(result, null, 2));
			},
		},
		{
			name: FEISHU_TOOL_NAMES.CALENDAR_EVENT_GET,
			label: createToolLabel("feishu", "获取事件"),
			description: createPlatformDescription("feishu", "获取飞书日历事件详情"),
			parameters: CalendarEventGetSchema,
			platformMeta: { platform: "feishu", category: "calendar", localName: "event_get" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const { calendarId, eventId } = params as Static<typeof CalendarEventGetSchema>;
				const result = await calendar.getEvent(calendarId, eventId);
				return createToolResult(JSON.stringify(result, null, 2));
			},
		},
		{
			name: FEISHU_TOOL_NAMES.CALENDAR_EVENT_CREATE,
			label: createToolLabel("feishu", "创建事件"),
			description: createPlatformDescription("feishu", "创建飞书日历事件"),
			parameters: CalendarEventCreateSchema,
			platformMeta: { platform: "feishu", category: "calendar", localName: "event_create" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const { calendarId, ...options } = params as Static<typeof CalendarEventCreateSchema>;
				const result = await calendar.createEvent(calendarId, options);
				return createToolResult(JSON.stringify(result, null, 2));
			},
		},
		{
			name: FEISHU_TOOL_NAMES.CALENDAR_EVENT_UPDATE,
			label: createToolLabel("feishu", "更新事件"),
			description: createPlatformDescription("feishu", "更新飞书日历事件"),
			parameters: CalendarEventUpdateSchema,
			platformMeta: { platform: "feishu", category: "calendar", localName: "event_update" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const { calendarId, eventId, ...options } = params as Static<typeof CalendarEventUpdateSchema>;
				const result = await calendar.updateEvent(calendarId, eventId, options);
				return createToolResult(JSON.stringify(result, null, 2));
			},
		},
		{
			name: FEISHU_TOOL_NAMES.CALENDAR_EVENT_DELETE,
			label: createToolLabel("feishu", "删除事件"),
			description: createPlatformDescription("feishu", "删除飞书日历事件"),
			parameters: CalendarEventDeleteSchema,
			platformMeta: { platform: "feishu", category: "calendar", localName: "event_delete" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const { calendarId, eventId } = params as Static<typeof CalendarEventDeleteSchema>;
				await calendar.deleteEvent(calendarId, eventId);
				return createToolResult(`事件 ${eventId} 已删除`);
			},
		},
		{
			name: FEISHU_TOOL_NAMES.CALENDAR_EVENT_SEARCH,
			label: createToolLabel("feishu", "搜索事件"),
			description: createPlatformDescription("feishu", "搜索飞书日历事件"),
			parameters: CalendarEventSearchSchema,
			platformMeta: { platform: "feishu", category: "calendar", localName: "event_search" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const result = await calendar.searchEvents(params as Static<typeof CalendarEventSearchSchema>);
				return createToolResult(JSON.stringify(result, null, 2));
			},
		},
	];
}

// ============================================================================
// Bitable Tools
// ============================================================================

const BitableGetSchema = Type.Object({
	appToken: Type.String({ description: "多维表格 token" }),
});

const BitableTableListSchema = Type.Object({
	appToken: Type.String({ description: "多维表格 token" }),
});

const BitableRecordListSchema = Type.Object({
	appToken: Type.String({ description: "多维表格 token" }),
	tableId: Type.String({ description: "数据表 ID" }),
	viewId: Type.Optional(Type.String({ description: "视图 ID" })),
	fieldNames: Type.Optional(Type.Array(Type.String(), { description: "字段名列表" })),
	pageSize: Type.Optional(Type.Number({ description: "每页数量，默认 100" })),
	pageToken: Type.Optional(Type.String({ description: "分页 token" })),
});

const BitableRecordCreateSchema = Type.Object({
	appToken: Type.String({ description: "多维表格 token" }),
	tableId: Type.String({ description: "数据表 ID" }),
	fields: Type.Record(Type.String(), Type.Any(), { description: "字段值" }),
});

const BitableRecordUpdateSchema = Type.Object({
	appToken: Type.String({ description: "多维表格 token" }),
	tableId: Type.String({ description: "数据表 ID" }),
	recordId: Type.String({ description: "记录 ID" }),
	fields: Type.Record(Type.String(), Type.Any(), { description: "字段值" }),
});

const BitableRecordDeleteSchema = Type.Object({
	appToken: Type.String({ description: "多维表格 token" }),
	tableId: Type.String({ description: "数据表 ID" }),
	recordId: Type.String({ description: "记录 ID" }),
});

export function createFeishuBitableTools(bitable: FeishuBitableTool): PlatformTool[] {
	return [
		{
			name: FEISHU_TOOL_NAMES.BITABLE_GET,
			label: createToolLabel("feishu", "获取多维表格"),
			description: createPlatformDescription("feishu", "获取飞书多维表格信息"),
			parameters: BitableGetSchema,
			platformMeta: { platform: "feishu", category: "bitable", localName: "get" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const { appToken } = params as Static<typeof BitableGetSchema>;
				const result = await bitable.getBitable(appToken);
				return createToolResult(JSON.stringify(result, null, 2));
			},
		},
		{
			name: FEISHU_TOOL_NAMES.BITABLE_TABLE_LIST,
			label: createToolLabel("feishu", "数据表列表"),
			description: createPlatformDescription("feishu", "获取飞书多维表格数据表列表"),
			parameters: BitableTableListSchema,
			platformMeta: { platform: "feishu", category: "bitable", localName: "table_list" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const { appToken } = params as Static<typeof BitableTableListSchema>;
				const result = await bitable.listTables(appToken);
				return createToolResult(JSON.stringify(result, null, 2));
			},
		},
		{
			name: FEISHU_TOOL_NAMES.BITABLE_RECORD_LIST,
			label: createToolLabel("feishu", "记录列表"),
			description: createPlatformDescription("feishu", "获取飞书多维表格记录列表"),
			parameters: BitableRecordListSchema,
			platformMeta: { platform: "feishu", category: "bitable", localName: "record_list" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const { appToken, tableId, ...options } = params as Static<typeof BitableRecordListSchema>;
				const result = await bitable.listRecords(appToken, tableId, options);
				return createToolResult(JSON.stringify(result, null, 2));
			},
		},
		{
			name: FEISHU_TOOL_NAMES.BITABLE_RECORD_CREATE,
			label: createToolLabel("feishu", "创建记录"),
			description: createPlatformDescription("feishu", "创建飞书多维表格记录"),
			parameters: BitableRecordCreateSchema,
			platformMeta: { platform: "feishu", category: "bitable", localName: "record_create" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const { appToken, tableId, fields } = params as Static<typeof BitableRecordCreateSchema>;
				const result = await bitable.createRecord(appToken, tableId, fields);
				return createToolResult(JSON.stringify(result, null, 2));
			},
		},
		{
			name: FEISHU_TOOL_NAMES.BITABLE_RECORD_UPDATE,
			label: createToolLabel("feishu", "更新记录"),
			description: createPlatformDescription("feishu", "更新飞书多维表格记录"),
			parameters: BitableRecordUpdateSchema,
			platformMeta: { platform: "feishu", category: "bitable", localName: "record_update" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const { appToken, tableId, recordId, fields } = params as Static<typeof BitableRecordUpdateSchema>;
				const result = await bitable.updateRecord(appToken, tableId, recordId, fields);
				return createToolResult(JSON.stringify(result, null, 2));
			},
		},
		{
			name: FEISHU_TOOL_NAMES.BITABLE_RECORD_DELETE,
			label: createToolLabel("feishu", "删除记录"),
			description: createPlatformDescription("feishu", "删除飞书多维表格记录"),
			parameters: BitableRecordDeleteSchema,
			platformMeta: { platform: "feishu", category: "bitable", localName: "record_delete" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const { appToken, tableId, recordId } = params as Static<typeof BitableRecordDeleteSchema>;
				await bitable.deleteRecord(appToken, tableId, recordId);
				return createToolResult(`记录 ${recordId} 已删除`);
			},
		},
	];
}

// ============================================================================
// Doc Tools
// ============================================================================

const DocGetSchema = Type.Object({
	documentId: Type.String({ description: "文档 ID" }),
});

const DocCreateSchema = Type.Object({
	title: Type.String({ description: "文档标题" }),
	content: Type.Optional(Type.String({ description: "文档内容" })),
});

const DocContentGetSchema = Type.Object({
	documentId: Type.String({ description: "文档 ID" }),
});

const DocBlockListSchema = Type.Object({
	documentId: Type.String({ description: "文档 ID" }),
});

const DocBlockCreateSchema = Type.Object({
	documentId: Type.String({ description: "文档 ID" }),
	index: Type.Optional(Type.Number({ description: "插入位置" })),
	children: Type.Array(
		Type.Object({
			type: Type.String({ description: "块类型" }),
			text: Type.Optional(Type.String({ description: "文本内容" })),
		}),
		{ description: "子块列表" },
	),
});

export function createFeishuDocTools(doc: FeishuDocTool): PlatformTool[] {
	return [
		{
			name: FEISHU_TOOL_NAMES.DOC_GET,
			label: createToolLabel("feishu", "获取文档"),
			description: createPlatformDescription("feishu", "获取飞书文档信息"),
			parameters: DocGetSchema,
			platformMeta: { platform: "feishu", category: "doc", localName: "get" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const { documentId } = params as Static<typeof DocGetSchema>;
				const result = await doc.getDoc(documentId);
				return createToolResult(JSON.stringify(result, null, 2));
			},
		},
		{
			name: FEISHU_TOOL_NAMES.DOC_CREATE,
			label: createToolLabel("feishu", "创建文档"),
			description: createPlatformDescription("feishu", "创建飞书文档"),
			parameters: DocCreateSchema,
			platformMeta: { platform: "feishu", category: "doc", localName: "create" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const result = await doc.createDoc(params as Static<typeof DocCreateSchema>);
				return createToolResult(JSON.stringify(result, null, 2));
			},
		},
		{
			name: FEISHU_TOOL_NAMES.DOC_CONTENT_GET,
			label: createToolLabel("feishu", "获取文档内容"),
			description: createPlatformDescription("feishu", "获取飞书文档完整内容"),
			parameters: DocContentGetSchema,
			platformMeta: { platform: "feishu", category: "doc", localName: "content_get" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const { documentId } = params as Static<typeof DocContentGetSchema>;
				const result = await doc.getDocContent(documentId);
				return createToolResult(JSON.stringify(result, null, 2));
			},
		},
		{
			name: FEISHU_TOOL_NAMES.DOC_BLOCK_LIST,
			label: createToolLabel("feishu", "文档块列表"),
			description: createPlatformDescription("feishu", "获取飞书文档所有块"),
			parameters: DocBlockListSchema,
			platformMeta: { platform: "feishu", category: "doc", localName: "block_list" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const { documentId } = params as Static<typeof DocBlockListSchema>;
				const result = await doc.listBlocks(documentId);
				return createToolResult(JSON.stringify(result, null, 2));
			},
		},
		{
			name: FEISHU_TOOL_NAMES.DOC_BLOCK_CREATE,
			label: createToolLabel("feishu", "创建文档块"),
			description: createPlatformDescription("feishu", "在飞书文档中创建块"),
			parameters: DocBlockCreateSchema,
			platformMeta: { platform: "feishu", category: "doc", localName: "block_create" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const { documentId, ...options } = params as Static<typeof DocBlockCreateSchema>;
				const result = await doc.createBlock(documentId, options);
				return createToolResult(`块已创建: ${result}`);
			},
		},
	];
}

// ============================================================================
// Wiki Tools
// ============================================================================

const WikiSpaceListSchema = Type.Object({
	pageSize: Type.Optional(Type.Number({ description: "每页数量，默认 20" })),
	pageToken: Type.Optional(Type.String({ description: "分页 token" })),
});

const WikiNodeListSchema = Type.Object({
	spaceId: Type.String({ description: "知识库 ID" }),
	parentNodeId: Type.Optional(Type.String({ description: "父节点 ID" })),
	pageSize: Type.Optional(Type.Number({ description: "每页数量，默认 50" })),
	pageToken: Type.Optional(Type.String({ description: "分页 token" })),
});

const WikiNodeGetSchema = Type.Object({
	token: Type.String({ description: "节点 token" }),
});

const WikiNodeCreateSchema = Type.Object({
	spaceId: Type.String({ description: "知识库 ID" }),
	title: Type.String({ description: "节点标题" }),
	objType: Type.Union(
		[Type.Literal("doc"), Type.Literal("docx"), Type.Literal("sheet"), Type.Literal("bitable"), Type.Literal("mindnote"), Type.Literal("slides")],
		{ description: "文档类型" },
	),
	parentNodeId: Type.Optional(Type.String({ description: "父节点 ID" })),
});

export function createFeishuWikiTools(wiki: FeishuWikiTool): PlatformTool[] {
	return [
		{
			name: FEISHU_TOOL_NAMES.WIKI_SPACE_LIST,
			label: createToolLabel("feishu", "知识库列表"),
			description: createPlatformDescription("feishu", "获取飞书知识库列表"),
			parameters: WikiSpaceListSchema,
			platformMeta: { platform: "feishu", category: "wiki", localName: "space_list" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const result = await wiki.listSpaces(params as Static<typeof WikiSpaceListSchema>);
				return createToolResult(JSON.stringify(result, null, 2));
			},
		},
		{
			name: FEISHU_TOOL_NAMES.WIKI_NODE_LIST,
			label: createToolLabel("feishu", "知识库节点列表"),
			description: createPlatformDescription("feishu", "获取飞书知识库节点列表"),
			parameters: WikiNodeListSchema,
			platformMeta: { platform: "feishu", category: "wiki", localName: "node_list" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const { spaceId, ...options } = params as Static<typeof WikiNodeListSchema>;
				const result = await wiki.listNodes(spaceId, options);
				return createToolResult(JSON.stringify(result, null, 2));
			},
		},
		{
			name: FEISHU_TOOL_NAMES.WIKI_NODE_GET,
			label: createToolLabel("feishu", "获取知识库节点"),
			description: createPlatformDescription("feishu", "获取飞书知识库节点详情"),
			parameters: WikiNodeGetSchema,
			platformMeta: { platform: "feishu", category: "wiki", localName: "node_get" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const { token } = params as Static<typeof WikiNodeGetSchema>;
				const result = await wiki.getNode(token);
				return createToolResult(JSON.stringify(result, null, 2));
			},
		},
		{
			name: FEISHU_TOOL_NAMES.WIKI_NODE_CREATE,
			label: createToolLabel("feishu", "创建知识库节点"),
			description: createPlatformDescription("feishu", "创建飞书知识库节点"),
			parameters: WikiNodeCreateSchema,
			platformMeta: { platform: "feishu", category: "wiki", localName: "node_create" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const { spaceId, ...options } = params as Static<typeof WikiNodeCreateSchema>;
				const result = await wiki.createNode(spaceId, options);
				return createToolResult(JSON.stringify(result, null, 2));
			},
		},
	];
}

// ============================================================================
// Drive Tools
// ============================================================================

const DriveFileGetSchema = Type.Object({
	fileToken: Type.String({ description: "文件 token" }),
});

const DriveFileListSchema = Type.Object({
	folderToken: Type.String({ description: "文件夹 token" }),
	pageSize: Type.Optional(Type.Number({ description: "每页数量，默认 50" })),
	pageToken: Type.Optional(Type.String({ description: "分页 token" })),
	orderBy: Type.Optional(Type.Union([Type.Literal("name"), Type.Literal("created_time"), Type.Literal("modified_time"), Type.Literal("size")], { description: "排序方式" })),
	orderByDesc: Type.Optional(Type.Boolean({ description: "是否降序" })),
});

const DriveFolderCreateSchema = Type.Object({
	parentToken: Type.String({ description: "父文件夹 token" }),
	name: Type.String({ description: "文件夹名称" }),
});

const DriveFileSearchSchema = Type.Object({
	query: Type.String({ description: "搜索关键词" }),
	folderToken: Type.Optional(Type.String({ description: "搜索范围文件夹 token" })),
	pageSize: Type.Optional(Type.Number({ description: "每页数量，默认 50" })),
});

export function createFeishuDriveTools(drive: FeishuDriveTool): PlatformTool[] {
	return [
		{
			name: FEISHU_TOOL_NAMES.DRIVE_FILE_GET,
			label: createToolLabel("feishu", "获取文件"),
			description: createPlatformDescription("feishu", "获取飞书云盘文件信息"),
			parameters: DriveFileGetSchema,
			platformMeta: { platform: "feishu", category: "drive", localName: "file_get" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const { fileToken } = params as Static<typeof DriveFileGetSchema>;
				const result = await drive.getFileInfo(fileToken);
				return createToolResult(JSON.stringify(result, null, 2));
			},
		},
		{
			name: FEISHU_TOOL_NAMES.DRIVE_FILE_LIST,
			label: createToolLabel("feishu", "文件列表"),
			description: createPlatformDescription("feishu", "获取飞书云盘文件夹内容列表"),
			parameters: DriveFileListSchema,
			platformMeta: { platform: "feishu", category: "drive", localName: "file_list" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const { folderToken, ...options } = params as Static<typeof DriveFileListSchema>;
				const result = await drive.listFolder(folderToken, options);
				return createToolResult(JSON.stringify(result, null, 2));
			},
		},
		{
			name: FEISHU_TOOL_NAMES.DRIVE_FOLDER_CREATE,
			label: createToolLabel("feishu", "创建文件夹"),
			description: createPlatformDescription("feishu", "在飞书云盘创建文件夹"),
			parameters: DriveFolderCreateSchema,
			platformMeta: { platform: "feishu", category: "drive", localName: "folder_create" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const { parentToken, name } = params as Static<typeof DriveFolderCreateSchema>;
				const result = await drive.createFolder(parentToken, name);
				return createToolResult(JSON.stringify(result, null, 2));
			},
		},
		{
			name: FEISHU_TOOL_NAMES.DRIVE_FILE_SEARCH,
			label: createToolLabel("feishu", "搜索文件"),
			description: createPlatformDescription("feishu", "搜索飞书云盘文件"),
			parameters: DriveFileSearchSchema,
			platformMeta: { platform: "feishu", category: "drive", localName: "file_search" },
			execute: async (_toolCallId, params, _signal, _onUpdate) => {
				const result = await drive.searchFiles(params as Static<typeof DriveFileSearchSchema>);
				return createToolResult(JSON.stringify(result, null, 2));
			},
		},
	];
}

// ============================================================================
// All Feishu Tools
// ============================================================================

/**
 * 创建所有飞书平台工具
 */
export function createAllFeishuTools(manager: {
	task: FeishuTaskTool;
	calendar: FeishuCalendarTool;
	bitable: FeishuBitableTool;
	doc: FeishuDocTool;
	wiki: FeishuWikiTool;
	drive: FeishuDriveTool;
}): PlatformTool[] {
	return [
		...createFeishuTaskTools(manager.task),
		...createFeishuCalendarTools(manager.calendar),
		...createFeishuBitableTools(manager.bitable),
		...createFeishuDocTools(manager.doc),
		...createFeishuWikiTools(manager.wiki),
		...createFeishuDriveTools(manager.drive),
	];
}
