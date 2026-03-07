/**
 * Feishu Store
 *
 * 飞书平台特定的存储实现
 * 提供 token 管理和附件下载功能
 */

import { existsSync, mkdirSync } from "fs";
import { writeFile } from "fs/promises";
import { join } from "path";
import { BaseStore } from "../../core/store/base.js";
import type { Attachment, AttachmentInput, DownloadRequest } from "../../core/store/types.js";

// ============================================================================
// Types
// ============================================================================

/**
 * 飞书存储配置
 */
export interface FeishuStoreConfig {
	workspaceDir: string;
	appId: string;
	appSecret: string;
}

// ============================================================================
// Feishu Store
// ============================================================================

/**
 * 飞书存储实现
 *
 * 继承 BaseStore，添加飞书特定的功能：
 * - 租户访问令牌管理
 * - 附件下载队列
 */
export class FeishuStore extends BaseStore {
	private appId: string;
	private appSecret: string;
	private pendingDownloads: DownloadRequest[] = [];
	private isDownloading = false;
	private tenantAccessToken: string | null = null;
	private tokenExpiresAt: number = 0;

	constructor(config: FeishuStoreConfig) {
		super({ workspaceDir: config.workspaceDir });
		this.appId = config.appId;
		this.appSecret = config.appSecret;
	}

	// ========== 附件处理 ==========

	/**
	 * 处理附件
	 * 将附件添加到下载队列并异步下载
	 */
	processAttachments(
		channelId: string,
		files: AttachmentInput[],
		timestamp: string
	): Attachment[] {
		const attachments: Attachment[] = [];

		for (const file of files) {
			if (!file.file_key || !file.name) continue;

			const filename = this.generateLocalFilename(file.name, timestamp);
			const localPath = `chats/${channelId}/attachments/${filename}`;

			attachments.push({
				original: file.name,
				local: localPath,
			});

			this.pendingDownloads.push({
				channelId,
				localPath,
				fileKey: file.file_key,
				fileToken: file.file_token,
				messageId: file.message_id,
				type: file.type,
			});
		}

		this.processDownloadQueue();
		return attachments;
	}

	/**
	 * 立即下载附件（同步等待）
	 */
	async downloadAttachmentNow(
		file: AttachmentInput,
		channelId: string,
		timestamp: string
	): Promise<Attachment | null> {
		if (!file.file_key || !file.name) return null;

		const filename = this.generateLocalFilename(file.name, timestamp);
		const localPath = `chats/${channelId}/attachments/${filename}`;

		try {
			await this.downloadFile(
				localPath,
				file.file_key,
				file.message_id,
				file.type
			);
			return { original: file.name, local: localPath };
		} catch {
			return null;
		}
	}

	// ========== Token 管理 ==========

	/**
	 * 获取租户访问令牌
	 */
	private async getTenantAccessToken(): Promise<string> {
		if (this.tenantAccessToken && Date.now() < this.tokenExpiresAt) {
			return this.tenantAccessToken;
		}

		const response = await fetch(
			"https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					app_id: this.appId,
					app_secret: this.appSecret,
				}),
			}
		);

		const data = (await response.json()) as {
			tenant_access_token?: string;
			expire?: number;
		};

		if (!data.tenant_access_token) {
			throw new Error("Failed to get tenant access token");
		}

		this.tenantAccessToken = data.tenant_access_token;
		this.tokenExpiresAt = Date.now() + ((data.expire || 7200) - 300) * 1000;
		return this.tenantAccessToken;
	}

	// ========== 下载队列 ==========

	/**
	 * 处理下载队列
	 */
	private async processDownloadQueue(): Promise<void> {
		if (this.isDownloading || this.pendingDownloads.length === 0) return;

		this.isDownloading = true;

		while (this.pendingDownloads.length > 0) {
			const item = this.pendingDownloads.shift();
			if (!item) break;

			try {
				await this.downloadFile(
					item.localPath,
					item.fileKey,
					item.messageId,
					item.type
				);
			} catch (error) {
				console.error(
					`[FeishuStore] Failed to download ${item.localPath}:`,
					error
				);
			}
		}

		this.isDownloading = false;
	}

	/**
	 * 下载文件
	 */
	private async downloadFile(
		localPath: string,
		fileKey: string,
		messageId?: string,
		type?: string
	): Promise<void> {
		const filePath = join(this.getWorkspaceDir(), localPath);
		const lastSlash = localPath.lastIndexOf("/");
		const dir = join(this.getWorkspaceDir(), localPath.substring(0, lastSlash));

		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}

		const token = await this.getTenantAccessToken();

		let url: string;
		if (type === "image" && messageId) {
			url = `https://open.feishu.cn/open-apis/im/v1/messages/${messageId}/resources/${fileKey}?type=image`;
		} else if (messageId) {
			url = `https://open.feishu.cn/open-apis/im/v1/messages/${messageId}/resources/${fileKey}?type=file`;
		} else {
			url = `https://open.feishu.cn/open-apis/im/v1/messages/${fileKey}/resources`;
		}

		const response = await fetch(url, {
			headers: { Authorization: `Bearer ${token}` },
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const buffer = await response.arrayBuffer();
		await writeFile(filePath, Buffer.from(buffer));
	}
}
