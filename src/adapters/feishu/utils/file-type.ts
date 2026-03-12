/**
 * File Type Utilities
 *
 * 飞书文件类型检测工具
 */

import { extname } from "path";

// ============================================================================
// Constants
// ============================================================================

/** 飞书支持的文件类型 */
export type FeishuFileType = "opus" | "mp4" | "pdf" | "doc" | "xls" | "ppt" | "stream";

/** 扩展名到飞书文件类型映射 */
const EXTENSION_TYPE_MAP: Record<string, FeishuFileType> = {
	// 音频
	".opus": "opus",
	".ogg": "opus",
	// 视频
	".mp4": "mp4",
	".mov": "mp4",
	".avi": "mp4",
	".mkv": "mp4",
	".webm": "mp4",
	// 文档
	".pdf": "pdf",
	".doc": "doc",
	".docx": "doc",
	// 表格
	".xls": "xls",
	".xlsx": "xls",
	".csv": "xls",
	// 演示
	".ppt": "ppt",
	".pptx": "ppt",
};

/** 图片扩展名 */
const IMAGE_EXTENSIONS = new Set([
	".jpg",
	".jpeg",
	".png",
	".gif",
	".bmp",
	".webp",
	".ico",
	".tiff",
	".tif",
	".heic",
]);

/** 音频扩展名 */
const AUDIO_EXTENSIONS = new Set([
	".mp3",
	".wav",
	".aac",
	".flac",
	".m4a",
	".opus",
	".ogg",
	".wma",
]);

/** 视频扩展名 */
const VIDEO_EXTENSIONS = new Set([
	".mp4",
	".mov",
	".avi",
	".mkv",
	".webm",
	".flv",
	".wmv",
	".m4v",
]);

// ============================================================================
// Functions
// ============================================================================

/**
 * 检测文件类型（飞书格式）
 * @param filePath 文件路径
 * @returns 飞书文件类型
 */
export function detectFileType(filePath: string): FeishuFileType {
	const ext = extname(filePath).toLowerCase();
	return EXTENSION_TYPE_MAP[ext] || "stream";
}

/**
 * 检查是否为图片文件
 * @param filePath 文件路径
 */
export function isImageFile(filePath: string): boolean {
	const ext = extname(filePath).toLowerCase();
	return IMAGE_EXTENSIONS.has(ext);
}

/**
 * 检查是否为音频文件
 * @param filePath 文件路径
 */
export function isAudioFile(filePath: string): boolean {
	const ext = extname(filePath).toLowerCase();
	return AUDIO_EXTENSIONS.has(ext);
}

/**
 * 检查是否为视频文件
 * @param filePath 文件路径
 */
export function isVideoFile(filePath: string): boolean {
	const ext = extname(filePath).toLowerCase();
	return VIDEO_EXTENSIONS.has(ext);
}

/**
 * 检查是否为飞书原生支持的音频格式（OGG/Opus）
 * @param filePath 文件路径
 */
export function isNativeAudioFormat(filePath: string): boolean {
	const ext = extname(filePath).toLowerCase();
	return ext === ".opus" || ext === ".ogg";
}

/**
 * 获取文件 MIME 类型（粗略估计）
 * @param filePath 文件路径
 */
export function getMimeType(filePath: string): string {
	const ext = extname(filePath).toLowerCase();
	
	const mimeMap: Record<string, string> = {
		".jpg": "image/jpeg",
		".jpeg": "image/jpeg",
		".png": "image/png",
		".gif": "image/gif",
		".webp": "image/webp",
		".mp3": "audio/mpeg",
		".wav": "audio/wav",
		".ogg": "audio/ogg",
		".opus": "audio/opus",
		".mp4": "video/mp4",
		".pdf": "application/pdf",
		".doc": "application/msword",
		".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		".xls": "application/vnd.ms-excel",
		".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		".ppt": "application/vnd.ms-powerpoint",
		".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
	};

	return mimeMap[ext] || "application/octet-stream";
}
