/**
 * Feishu V2 Tools - Bitable
 *
 * 飞书多维表格工具
 */

import type * as lark from "@larksuiteoapi/node-sdk";

// ============================================================================
// Types
// ============================================================================

export interface BitableRecord {
	recordId: string;
	fields: Record<string, any>;
	createdAt: number;
	updatedAt: number;
}

export interface BitableField {
	fieldId: string;
	fieldName: string;
	type: number;
	property?: any;
}

export interface BitableView {
	viewId: string;
	viewName: string;
	viewType: string;
}

export interface BitableTable {
	tableId: string;
	tableName: string;
	fields: BitableField[];
	views: BitableView[];
}

export interface BitableInfo {
	appToken: string;
	name: string;
	tables: BitableTable[];
}

// ============================================================================
// Bitable Tool
// ============================================================================

/**
 * 飞书多维表格工具
 */
export class FeishuBitableTool {
	private client: lark.Client;

	constructor(client: lark.Client) {
		this.client = client;
	}

	/**
	 * 获取多维表格信息
	 */
	async getBitable(appToken: string): Promise<BitableInfo> {
		const result = await (this.client.bitable as any).app?.get?.({
			path: { app_token: appToken },
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to get bitable: ${result?.msg}`);
		}

		return {
			appToken,
			name: result.data?.app?.name,
			tables: [],
		};
	}

	/**
	 * 获取数据表列表
	 */
	async listTables(appToken: string): Promise<BitableTable[]> {
		const result = await (this.client.bitable as any).appTable?.list?.({
			path: { app_token: appToken },
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to list tables: ${result?.msg}`);
		}

		return (result.data?.items || []).map((item: any) => ({
			tableId: item.table_id,
			tableName: item.name,
			fields: [],
			views: [],
		}));
	}

	/**
	 * 获取字段列表
	 */
	async listFields(appToken: string, tableId: string): Promise<BitableField[]> {
		const result = await (this.client.bitable as any).appTableField?.list?.({
			path: {
				app_token: appToken,
				table_id: tableId,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to list fields: ${result?.msg}`);
		}

		return (result.data?.items || []).map((item: any) => ({
			fieldId: item.field_id,
			fieldName: item.field_name,
			type: item.type,
			property: item.property,
		}));
	}

	/**
	 * 获取记录列表
	 */
	async listRecords(
		appToken: string,
		tableId: string,
		options?: {
			viewId?: string;
			fieldNames?: string[];
			pageSize?: number;
			pageToken?: string;
		},
	): Promise<{ records: BitableRecord[]; pageToken?: string; hasMore: boolean }> {
		const result = await (this.client.bitable as any).appTableRecord?.list?.({
			path: {
				app_token: appToken,
				table_id: tableId,
			},
			params: {
				view_id: options?.viewId,
				field_names: options?.fieldNames,
				page_size: options?.pageSize || 100,
				page_token: options?.pageToken,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to list records: ${result?.msg}`);
		}

		return {
			records: (result.data?.items || []).map((item: any) => ({
				recordId: item.record_id,
				fields: item.fields,
				createdAt: item.created_time,
				updatedAt: item.modified_time,
			})),
			pageToken: result.data?.page_token,
			hasMore: result.data?.has_more || false,
		};
	}

	/**
	 * 获取记录详情
	 */
	async getRecord(appToken: string, tableId: string, recordId: string): Promise<BitableRecord> {
		const result = await (this.client.bitable as any).appTableRecord?.get?.({
			path: {
				app_token: appToken,
				table_id: tableId,
				record_id: recordId,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to get record: ${result?.msg}`);
		}

		return {
			recordId: result.data?.record?.record_id,
			fields: result.data?.record?.fields,
			createdAt: result.data?.record?.created_time,
			updatedAt: result.data?.record?.modified_time,
		};
	}

	/**
	 * 创建记录
	 */
	async createRecord(
		appToken: string,
		tableId: string,
		fields: Record<string, any>,
	): Promise<BitableRecord> {
		const result = await (this.client.bitable as any).appTableRecord?.create?.({
			path: {
				app_token: appToken,
				table_id: tableId,
			},
			data: {
				fields,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to create record: ${result?.msg}`);
		}

		return {
			recordId: result.data?.record?.record_id,
			fields: result.data?.record?.fields,
			createdAt: result.data?.record?.created_time,
			updatedAt: result.data?.record?.modified_time,
		};
	}

	/**
	 * 更新记录
	 */
	async updateRecord(
		appToken: string,
		tableId: string,
		recordId: string,
		fields: Record<string, any>,
	): Promise<BitableRecord> {
		const result = await (this.client.bitable as any).appTableRecord?.patch?.({
			path: {
				app_token: appToken,
				table_id: tableId,
				record_id: recordId,
			},
			data: {
				fields,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to update record: ${result?.msg}`);
		}

		return {
			recordId: result.data?.record?.record_id,
			fields: result.data?.record?.fields,
			createdAt: result.data?.record?.created_time,
			updatedAt: result.data?.record?.modified_time,
		};
	}

	/**
	 * 删除记录
	 */
	async deleteRecord(appToken: string, tableId: string, recordId: string): Promise<void> {
		const result = await (this.client.bitable as any).appTableRecord?.delete?.({
			path: {
				app_token: appToken,
				table_id: tableId,
				record_id: recordId,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to delete record: ${result?.msg}`);
		}
	}

	/**
	 * 搜索记录
	 */
	async searchRecords(
		appToken: string,
		tableId: string,
		options: {
			viewId?: string;
			fieldNames?: string[];
			filter?: string;
			sort?: Array<{ fieldId: string; desc?: boolean }>;
			pageSize?: number;
			pageToken?: string;
		},
	): Promise<{ records: BitableRecord[]; pageToken?: string; hasMore: boolean }> {
		const result = await (this.client.bitable as any).appTableRecord?.search?.({
			path: {
				app_token: appToken,
				table_id: tableId,
			},
			data: {
				view_id: options.viewId,
				field_names: options.fieldNames,
				filter: options.filter ? JSON.parse(options.filter) : undefined,
				sort: options.sort,
				page_size: options.pageSize || 100,
				page_token: options.pageToken,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to search records: ${result?.msg}`);
		}

		return {
			records: (result.data?.items || []).map((item: any) => ({
				recordId: item.record_id,
				fields: item.fields,
				createdAt: item.created_time,
				updatedAt: item.modified_time,
			})),
			pageToken: result.data?.page_token,
			hasMore: result.data?.has_more || false,
		};
	}
}
