/**
 * Feishu V2 Tools - Doc
 *
 * 飞书文档工具
 */

import type * as lark from "@larksuiteoapi/node-sdk";

// ============================================================================
// Types
// ============================================================================

export interface DocInfo {
	documentId: string;
	title: string;
	revisionId?: string;
	createdAt?: number;
	updatedAt?: number;
}

export interface DocBlock {
	blockType: number;
	text?: {
		elements: Array<{
			textRun?: { content: string };
			mentionDoc?: { title: string };
		}>;
	};
	children?: string[];
}

export interface DocContent {
	documentId: string;
	title: string;
	blocks: Record<string, DocBlock>;
}

// ============================================================================
// Doc Tool
// ============================================================================

/**
 * 飞书文档工具
 */
export class FeishuDocTool {
	private client: lark.Client;

	constructor(client: lark.Client) {
		this.client = client;
	}

	/**
	 * 获取文档信息
	 */
	async getDoc(documentId: string): Promise<DocInfo> {
		const result = await (this.client.docx as any).document?.get?.({
			path: { document_id: documentId },
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to get doc: ${result?.msg}`);
		}

		return {
			documentId: result.data?.document?.document_id,
			title: result.data?.document?.title,
			revisionId: result.data?.document?.revision_id,
		};
	}

	/**
	 * 获取文档内容
	 */
	async getDocContent(documentId: string): Promise<DocContent> {
		const result = await (this.client.docx as any).document?.get?.({
			path: { document_id: documentId },
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to get doc content: ${result?.msg}`);
		}

		return {
			documentId: result.data?.document?.document_id,
			title: result.data?.document?.title,
			blocks: result.data?.document?.blocks || {},
		};
	}

	/**
	 * 创建文档
	 */
	async createDoc(options: { title: string; content?: string }): Promise<DocInfo> {
		const result = await (this.client.docx as any).document?.create?.({
			data: {
				title: options.title,
				content: options.content,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to create doc: ${result?.msg}`);
		}

		return {
			documentId: result.data?.document?.document_id,
			title: result.data?.document?.title,
		};
	}

	/**
	 * 获取文档块内容
	 */
	async getBlock(documentId: string, blockId: string): Promise<DocBlock> {
		const result = await (this.client.docx as any).documentBlock?.get?.({
			path: {
				document_id: documentId,
				block_id: blockId,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to get block: ${result?.msg}`);
		}

		return result.data?.block;
	}

	/**
	 * 获取文档所有块
	 */
	async listBlocks(documentId: string): Promise<DocBlock[]> {
		const result = await (this.client.docx as any).documentBlock?.list?.({
			path: { document_id: documentId },
			params: { page_size: 500 },
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to list blocks: ${result?.msg}`);
		}

		return result.data?.items || [];
	}

	/**
	 * 创建文档块
	 */
	async createBlock(
		documentId: string,
		options: {
			index?: number;
			children: Array<{
				type: string;
				text?: string;
			}>;
		},
	): Promise<string> {
		const result = await (this.client.docx as any).documentBlock?.create?.({
			path: { document_id: documentId },
			data: {
				index: options.index,
				children: options.children.map((child) => ({
					type: child.type,
					text: child.text ? { elements: [{ text_run: { content: child.text } }] } : undefined,
				})),
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to create block: ${result?.msg}`);
		}

		return result.data?.block?.block_id;
	}

	/**
	 * 更新文档块
	 */
	async updateBlock(
		documentId: string,
		blockId: string,
		options: {
			text?: string;
			elements?: any[];
		},
	): Promise<void> {
		const result = await (this.client.docx as any).documentBlock?.patch?.({
			path: {
				document_id: documentId,
				block_id: blockId,
			},
			data: {
				text: options.text
					? { elements: [{ text_run: { content: options.text } }] }
					: { elements: options.elements },
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to update block: ${result?.msg}`);
		}
	}

	/**
	 * 删除文档块
	 */
	async deleteBlock(documentId: string, blockId: string): Promise<void> {
		const result = await (this.client.docx as any).documentBlock?.delete?.({
			path: {
				document_id: documentId,
				block_id: blockId,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to delete block: ${result?.msg}`);
		}
	}

	/**
	 * 提取文档纯文本
	 */
	extractText(blocks: Record<string, DocBlock>): string {
		const extractFromBlock = (blockId: string, visited: Set<string> = new Set()): string => {
			if (visited.has(blockId)) return "";
			visited.add(blockId);

			const block = blocks[blockId];
			if (!block) return "";

			let text = "";
			if (block.text?.elements) {
				for (const element of block.text.elements) {
					if (element.textRun?.content) {
						text += element.textRun.content;
					}
					if (element.mentionDoc?.title) {
						text += element.mentionDoc.title;
					}
				}
			}

			if (block.children) {
				for (const childId of block.children) {
					text += "\n" + extractFromBlock(childId, visited);
				}
			}

			return text;
		};

		// 从根块开始提取
		const rootBlock = Object.keys(blocks).find((id) => blocks[id].blockType === 1);
		if (!rootBlock) return "";

		return extractFromBlock(rootBlock);
	}
}
