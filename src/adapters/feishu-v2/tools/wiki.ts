/**
 * Feishu V2 Tools - Wiki
 *
 * 飞书知识库工具
 */

import type * as lark from "@larksuiteoapi/node-sdk";

// ============================================================================
// Types
// ============================================================================

/**
 * 知识库节点
 */
export interface WikiNode {
	nodeId: string;
	spaceId: string;
	title: string;
	objType: "doc" | "docx" | "sheet" | "bitable" | "mindnote" | "file" | "slides" | "wiki";
	objToken: string;
	parentId?: string;
	children?: WikiNode[];
	createTime?: number;
	updateTime?: number;
	creator?: string;
	owner?: string;
}

/**
 * 知识库空间
 */
export interface WikiSpace {
	spaceId: string;
	name: string;
	description?: string;
	createTime?: number;
	updateTime?: number;
	owner?: string;
}

// ============================================================================
// Wiki Tool
// ============================================================================

/**
 * 飞书知识库工具
 */
export class FeishuWikiTool {
	private client: lark.Client;

	constructor(client: lark.Client) {
		this.client = client;
	}

	/**
	 * 获取知识库空间列表
	 */
	async listSpaces(options?: {
		pageSize?: number;
		pageToken?: string;
	}): Promise<{ spaces: WikiSpace[]; pageToken?: string; hasMore: boolean }> {
		const result = await (this.client.wiki as any).space?.list?.({
			params: {
				page_size: options?.pageSize || 20,
				page_token: options?.pageToken,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to list wiki spaces: ${result?.msg}`);
		}

		return {
			spaces: (result.data?.spaces || []).map((item: any) => this.parseSpace(item)),
			pageToken: result.data?.page_token,
			hasMore: result.data?.has_more || false,
		};
	}

	/**
	 * 获取知识库空间信息
	 */
	async getSpace(spaceId: string): Promise<WikiSpace> {
		const result = await (this.client.wiki as any).space?.get?.({
			path: {
				space_id: spaceId,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to get wiki space: ${result?.msg}`);
		}

		return this.parseSpace(result.data?.space);
	}

	/**
	 * 获取知识库节点列表
	 */
	async listNodes(
		spaceId: string,
		options?: {
			parentNodeId?: string;
			pageSize?: number;
			pageToken?: string;
		},
	): Promise<{ nodes: WikiNode[]; pageToken?: string; hasMore: boolean }> {
		const result = await (this.client.wiki as any).spaceNode?.list?.({
			path: {
				space_id: spaceId,
			},
			params: {
				parent_node_token: options?.parentNodeId,
				page_size: options?.pageSize || 50,
				page_token: options?.pageToken,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to list wiki nodes: ${result?.msg}`);
		}

		return {
			nodes: (result.data?.nodes || []).map((item: any) => this.parseNode(item)),
			pageToken: result.data?.page_token,
			hasMore: result.data?.has_more || false,
		};
	}

	/**
	 * 获取知识库节点信息
	 */
	async getNode(token: string): Promise<WikiNode> {
		const result = await (this.client.wiki as any).spaceNode?.get?.({
			path: {
				token: token,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to get wiki node: ${result?.msg}`);
		}

		return this.parseNode(result.data?.node);
	}

	/**
	 * 创建知识库节点
	 */
	async createNode(
		spaceId: string,
		options: {
			title: string;
			objType: "doc" | "docx" | "sheet" | "bitable" | "mindnote" | "slides";
			parentNodeId?: string;
		},
	): Promise<WikiNode> {
		const result = await (this.client.wiki as any).spaceNode?.create?.({
			path: {
				space_id: spaceId,
			},
			data: {
				title: options.title,
				obj_type: options.objType,
				parent_node_token: options.parentNodeId,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to create wiki node: ${result?.msg}`);
		}

		return this.parseNode(result.data?.node);
	}

	/**
	 * 更新知识库节点
	 */
	async updateNode(
		token: string,
		options: {
			title?: string;
		},
	): Promise<WikiNode> {
		const result = await (this.client.wiki as any).spaceNode?.patch?.({
			path: {
				token: token,
			},
			data: {
				title: options.title,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to update wiki node: ${result?.msg}`);
		}

		return this.parseNode(result.data?.node);
	}

	/**
	 * 删除知识库节点
	 */
	async deleteNode(token: string): Promise<void> {
		const result = await (this.client.wiki as any).spaceNode?.delete?.({
			path: {
				token: token,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to delete wiki node: ${result?.msg}`);
		}
	}

	/**
	 * 移动知识库节点
	 */
	async moveNode(
		token: string,
		options: {
			targetSpaceId?: string;
			targetParentNodeId?: string;
		},
	): Promise<WikiNode> {
		const result = await (this.client.wiki as any).spaceNode?.move?.({
			path: {
				token: token,
			},
			data: {
				target_space_id: options.targetSpaceId,
				target_parent_token: options.targetParentNodeId,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to move wiki node: ${result?.msg}`);
		}

		return this.parseNode(result.data?.node);
	}

	/**
	 * 搜索知识库节点
	 */
	async searchNodes(
		spaceId: string,
		options: {
			query: string;
			pageSize?: number;
			pageToken?: string;
		},
	): Promise<{ nodes: WikiNode[]; pageToken?: string; hasMore: boolean }> {
		const result = await (this.client.wiki as any).spaceNode?.search?.({
			path: {
				space_id: spaceId,
			},
			data: {
				query: options.query,
				page_size: options.pageSize || 50,
				page_token: options.pageToken,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to search wiki nodes: ${result?.msg}`);
		}

		return {
			nodes: (result.data?.nodes || []).map((item: any) => this.parseNode(item)),
			pageToken: result.data?.page_token,
			hasMore: result.data?.has_more || false,
		};
	}

	/**
	 * 获取节点的子节点（递归）
	 */
	async getChildrenNodes(spaceId: string, parentNodeId?: string): Promise<WikiNode[]> {
		const allNodes: WikiNode[] = [];
		let pageToken: string | undefined;

		do {
			const result = await this.listNodes(spaceId, {
				parentNodeId,
				pageSize: 50,
				pageToken,
			});

			allNodes.push(...result.nodes);
			pageToken = result.hasMore ? result.pageToken : undefined;
		} while (pageToken);

		return allNodes;
	}

	// ==========================================================================
	// Helper Methods
	// ==========================================================================

	private parseSpace(data: any): WikiSpace {
		return {
			spaceId: data?.space_id,
			name: data?.name,
			description: data?.description,
			createTime: data?.create_time,
			updateTime: data?.update_time,
			owner: data?.owner,
		};
	}

	private parseNode(data: any): WikiNode {
		return {
			nodeId: data?.node_token,
			spaceId: data?.space_id,
			title: data?.title,
			objType: data?.obj_type,
			objToken: data?.obj_token,
			parentId: data?.parent_node_token,
			createTime: data?.create_time,
			updateTime: data?.update_time,
			creator: data?.creator,
			owner: data?.owner,
		};
	}
}
