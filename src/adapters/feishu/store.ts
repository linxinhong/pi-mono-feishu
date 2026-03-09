/**
 * Feishu 存储实现
 */

import { BaseStore } from "../../core/store/index.js";
import type { Attachment, AttachmentInput } from "../../core/store/types.js";

import { createReadStream, existsSync, mkdirSync } from "fs";
import { join } from "path";

import { writeFile } from "fs/promises";

import { Readable } from "stream";

import { pipeline } from "stream/promises";

import { tmpdir } from "os";

import { createHash } from "crypto";

import https from "https";

// ============================================================================
// FeishuStore
// ============================================================================

export class FeishuStore extends BaseStore {
	constructor(workspaceDir: string) {
		super({ workspaceDir })
	}

	/**
	 * 处理附件
	 */
	async processAttachments(
		channelId: string,
		files: AttachmentInput[],
		timestamp: string
	): Promise<Attachment[]> {
		const attachments: Attachment[] = []

		for (const file of files) {
			const localPath = join(
				this.getChannelDir(channelId),
				this.generateLocalFilename(file.file_key || "file", timestamp)
			)

			// 下载文件
			const response = await this.downloadFile(file.file_key, channelId)
			if (response) {
				await writeFile(localPath, response)
				attachments.push({
					name: file.name || file.file_key,
					original: file.file_key,
					localPath,
					type: file.type || "file",
				})
			}
		}

		return attachments
	}

	/**
	 * 下载文件
	 */
	private async downloadFile(
		fileKey: string,
		_channelId: string
	): Promise<Buffer | null> {
		// TODO: 实现飞书文件下载
		// 这里需要使用 Lark SDK 下载文件
		return null
	}

	/**
	 * 清理资源
	 */
	dispose(): void {
		// 清理临时文件等
	}
}
