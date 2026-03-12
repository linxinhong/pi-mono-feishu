/**
 * Send Image Tool
 *
 * AI 工具：发送图片到飞书聊天
 */

import type { PlatformTool } from "../../../core/platform/tools/types.js";
import type { FeishuPlatformContext } from "../context.js";
import { existsSync } from "fs";
import { resolve, extname } from "path";

/**
 * 创建发送图片工具
 */
export function createSendImageTool(context: FeishuPlatformContext): PlatformTool {
	return {
		name: "send_image",
		label: "🖼️ 发送图片",
		description: "发送图片到当前聊天。支持 JPG、PNG、GIF 等常见图片格式。图片将直接显示在聊天中。",
		parameters: {
			type: "object",
			properties: {
				image_path: {
					type: "string",
					description: "要发送的图片路径（绝对路径）",
				},
				caption: {
					type: "string",
					description: "图片说明文字（可选，显示在图片下方）",
				},
			},
			required: ["image_path"],
		},
		platformMeta: {
			platform: "feishu",
			category: "image",
			localName: "send",
		},
		execute: async (_toolCallId: string, params: any) => {
			try {
				let { image_path, caption } = params;
				const chatId = context["chatId"];

				// 去除路径中的多余空格和引号
				image_path = image_path.trim().replace(/^["']|["']$/g, "");
				
				// 解析为绝对路径（支持中文路径）
				image_path = resolve(image_path);

				// 检查文件是否存在
				if (!existsSync(image_path)) {
					return {
						content: [{ type: "text", text: `图片不存在: ${image_path}` }],
						details: { success: false, error: "Image not found", image_path },
					};
				}

				// 检查文件扩展名
				const ext = extname(image_path).toLowerCase();
				const validExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
				if (!validExtensions.includes(ext)) {
					return {
						content: [{ type: "text", text: `不支持的图片格式: ${ext}。支持的格式: ${validExtensions.join(", ")}` }],
						details: { success: false, error: "Invalid image format", image_path },
					};
				}

				// 上传图片并获取 image_key
				const imageKey = await context.uploadImage(image_path);

				// 发送图片
				await context.sendImage(chatId, imageKey);

				// 如果有说明文字，再发送一条文本消息
				if (caption) {
					await context.sendText(chatId, caption);
				}

				return {
					content: [{ type: "text", text: `图片已发送: ${image_path}` }],
					details: { success: true, image_path, imageKey },
				};
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `发送图片失败: ${error?.message || String(error)}` }],
					details: { success: false, error: error?.message },
				};
			}
		},
	};
}
