/**
 * Feishu V2 Store
 *
 * 飞书平台存储实现
 */

import type * as lark from "@larksuiteoapi/node-sdk";
import { BaseStore, type Attachment, type AttachmentInput } from "../../core/store/index.js";

// ============================================================================
// Feishu Store
// ============================================================================

/**
 * 飞书存储实现
 */
export class FeishuStore extends BaseStore {
	private client: lark.Client;

	constructor(config: { workspaceDir: string; client: lark.Client }) {
		super({ workspaceDir: config.workspaceDir });
		this.client = config.client;
	}

	/**
	 * 处理附件
	 */
	async processAttachments(
		channelId: string,
		files: AttachmentInput[],
		_timestamp: string,
	): Promise<Attachment[]> {
		const attachments: Attachment[] = [];

		for (const file of files) {
			try {
				const attachment = await this.downloadAttachmentNow(file, channelId, _timestamp);
				if (attachment) {
					attachments.push(attachment);
				}
			} catch (error) {
				console.error(`[FeishuStore] Failed to download attachment: ${file.file_key}`, error);
			}
		}

		return attachments;
	}

	/**
	 * 立即下载附件
	 */
	async downloadAttachmentNow(
		file: AttachmentInput,
		channelId: string,
		timestamp: string,
	): Promise<Attachment | null> {
		if (!file.file_key) return null;

		try {
			const localName = this.generateLocalFilename(file.name || file.file_key, timestamp);
			const localPath = `${this.getChannelDir(channelId)}/${localName}`;

			// 下载文件内容
			const result = await (this.client.im.file as any).read?.({
				path: {
					file_key: file.file_key,
				},
			});

			if (result?.code === 0 && result?.data) {
				// 写入文件
				const { writeFile } = await import("fs/promises");
				await writeFile(localPath, result.data);
				return { original: file.name || file.file_key, local: localPath };
			}
		} catch (error) {
			console.error(`[FeishuStore] Download failed: ${file.file_key}`, error);
		}

		return null;
	}
}
