/**
 * Feishu V2 Tools - Drive
 *
 * 飞书云盘工具
 */

import type * as lark from "@larksuiteoapi/node-sdk";

// ============================================================================
// Types
// ============================================================================

/**
 * 云盘文件
 */
export interface DriveFile {
	fileToken: string;
	name: string;
	type: "file" | "folder" | "doc" | "docx" | "sheet" | "bitable" | "mindnote" | "slides";
	size?: number;
	parentToken?: string;
	createTime?: number;
	updateTime?: number;
	creator?: string;
	owner?: string;
	url?: string;
}

/**
 * 云盘文件夹
 */
export interface DriveFolder extends DriveFile {
	type: "folder";
	children?: DriveFile[];
}

// ============================================================================
// Drive Tool
// ============================================================================

/**
 * 飞书云盘工具
 */
export class FeishuDriveTool {
	private client: lark.Client;

	constructor(client: lark.Client) {
		this.client = client;
	}

	/**
	 * 获取文件信息
	 */
	async getFileInfo(fileToken: string): Promise<DriveFile> {
		const result = await (this.client.drive as any).file?.get?.({
			path: {
				file_token: fileToken,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to get file info: ${result?.msg}`);
		}

		return this.parseFile(result.data?.file);
	}

	/**
	 * 获取文件夹内容列表
	 */
	async listFolder(
		folderToken: string,
		options?: {
			pageSize?: number;
			pageToken?: string;
			orderBy?: "name" | "created_time" | "modified_time" | "size";
			orderByDesc?: boolean;
		},
	): Promise<{ files: DriveFile[]; pageToken?: string; hasMore: boolean }> {
		const result = await (this.client.drive as any).file?.list?.({
			path: {
				folder_token: folderToken,
			},
			params: {
				page_size: options?.pageSize || 50,
				page_token: options?.pageToken,
				order_by: options?.orderBy,
				order_by_desc: options?.orderByDesc,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to list folder: ${result?.msg}`);
		}

		return {
			files: (result.data?.files || []).map((item: any) => this.parseFile(item)),
			pageToken: result.data?.page_token,
			hasMore: result.data?.has_more || false,
		};
	}

	/**
	 * 创建文件夹
	 */
	async createFolder(
		parentToken: string,
		name: string,
	): Promise<DriveFolder> {
		const result = await (this.client.drive as any).file?.create?.({
			path: {
				folder_token: parentToken,
			},
			data: {
				name: name,
				type: "folder",
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to create folder: ${result?.msg}`);
		}

		return this.parseFile(result.data?.file) as DriveFolder;
	}

	/**
	 * 重命名文件/文件夹
	 */
	async renameFile(fileToken: string, newName: string): Promise<DriveFile> {
		const result = await (this.client.drive as any).file?.patch?.({
			path: {
				file_token: fileToken,
			},
			data: {
				name: newName,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to rename file: ${result?.msg}`);
		}

		return this.parseFile(result.data?.file);
	}

	/**
	 * 移动文件/文件夹
	 */
	async moveFile(
		fileToken: string,
		targetFolderToken: string,
	): Promise<DriveFile> {
		const result = await (this.client.drive as any).file?.move?.({
			path: {
				file_token: fileToken,
			},
			data: {
				folder_token: targetFolderToken,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to move file: ${result?.msg}`);
		}

		return this.parseFile(result.data?.file);
	}

	/**
	 * 复制文件/文件夹
	 */
	async copyFile(
		fileToken: string,
		targetFolderToken: string,
		newName?: string,
	): Promise<DriveFile> {
		const result = await (this.client.drive as any).file?.copy?.({
			path: {
				file_token: fileToken,
			},
			data: {
				folder_token: targetFolderToken,
				name: newName,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to copy file: ${result?.msg}`);
		}

		return this.parseFile(result.data?.file);
	}

	/**
	 * 删除文件/文件夹
	 */
	async deleteFile(fileToken: string): Promise<void> {
		const result = await (this.client.drive as any).file?.delete?.({
			path: {
				file_token: fileToken,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to delete file: ${result?.msg}`);
		}
	}

	/**
	 * 搜索文件
	 */
	async searchFiles(
		options: {
			query: string;
			folderToken?: string;
			pageSize?: number;
			pageToken?: string;
		},
	): Promise<{ files: DriveFile[]; pageToken?: string; hasMore: boolean }> {
		const result = await (this.client.drive as any).file?.search?.({
			data: {
				query: options.query,
				folder_token: options.folderToken,
				page_size: options.pageSize || 50,
				page_token: options.pageToken,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to search files: ${result?.msg}`);
		}

		return {
			files: (result.data?.files || []).map((item: any) => this.parseFile(item)),
			pageToken: result.data?.page_token,
			hasMore: result.data?.has_more || false,
		};
	}

	/**
	 * 上传文件
	 */
	async uploadFile(
		folderToken: string,
		fileName: string,
		fileContent: Buffer,
		options?: {
			parentType?: "explorer" | "ccm";
		},
	): Promise<DriveFile> {
		const result = await (this.client.drive as any).file?.upload?.({
			path: {
				folder_token: folderToken,
			},
			data: {
				file_name: fileName,
				file: fileContent,
				parent_type: options?.parentType || "explorer",
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to upload file: ${result?.msg}`);
		}

		return this.parseFile(result.data?.file);
	}

	/**
	 * 下载文件
	 */
	async downloadFile(fileToken: string): Promise<Buffer> {
		const result = await (this.client.drive as any).file?.download?.({
			path: {
				file_token: fileToken,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to download file: ${result?.msg}`);
		}

		return result.data;
	}

	/**
	 * 获取文件下载链接
	 */
	async getFileDownloadUrl(fileToken: string): Promise<string> {
		const result = await (this.client.drive as any).file?.downloadUrl?.get?.({
			path: {
				file_token: fileToken,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to get download url: ${result?.msg}`);
		}

		return result.data?.download_url || "";
	}

	/**
	 * 获取文件夹所有子文件（递归）
	 */
	async getAllFiles(folderToken: string): Promise<DriveFile[]> {
		const allFiles: DriveFile[] = [];
		let pageToken: string | undefined;

		do {
			const result = await this.listFolder(folderToken, {
				pageSize: 50,
				pageToken,
			});

			allFiles.push(...result.files);
			pageToken = result.hasMore ? result.pageToken : undefined;
		} while (pageToken);

		return allFiles;
	}

	/**
	 * 获取我的空间根目录
	 */
	async getMyDriveRoot(): Promise<DriveFolder> {
		const result = await (this.client.drive as any).root?.get?.({});

		if (result?.code !== 0) {
			throw new Error(`Failed to get my drive root: ${result?.msg}`);
		}

		return this.parseFile(result.data?.folder) as DriveFolder;
	}

	// ==========================================================================
	// Helper Methods
	// ==========================================================================

	private parseFile(data: any): DriveFile {
		return {
			fileToken: data?.file_token,
			name: data?.name,
			type: data?.type || "file",
			size: data?.size,
			parentToken: data?.parent_token,
			createTime: data?.created_time || data?.create_time,
			updateTime: data?.modified_time || data?.update_time,
			creator: data?.creator,
			owner: data?.owner,
			url: data?.url,
		};
	}
}
