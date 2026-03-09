/**
 * Feishu Store
 *
 * 飞书平台存储实现
 */

import {
	BaseStore,
	type Attachment,
	type AttachmentInput,
} from "../../core/store/index.js";

/**
 * 飞书存储实现
 *
 * 处理飞书消息的附件下载和存储
 */
export class FeishuStore extends BaseStore {
	constructor(config: { workspaceDir: string }) {
		super({ workspaceDir: config.workspaceDir });
	}

	/**
	 * 处理附件
	 *
	 * 下载飞书消息中的附件到本地
	 */
	async processAttachments(
		channelId: string,
		files: AttachmentInput[],
		timestamp: string
	): Promise<Attachment[]> {
		const attachments: Attachment[] = [];

		for (const file of files) {
			try {
				// 飞书附件处理逻辑
				// 这里简化处理
				attachments.push({
					original: file.name || file.file_key || "unknown",
					local: "", // TODO: 实现下载逻辑
				});
			} catch (error) {
				console.error(
					`Failed to process attachment ${file.name || file.file_key}:`,
					error
				);
			}
		}

		return attachments;
	}
}
