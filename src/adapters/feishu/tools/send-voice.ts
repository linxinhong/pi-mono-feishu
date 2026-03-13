/**
 * Send Voice Tool
 *
 * AI 工具：发送语音消息到飞书聊天
 */

import type { PlatformTool } from "../../../core/platform/tools/types.js";
import type { FeishuPlatformContext } from "../context.js";
import { parseAudioDuration } from "../utils/audio-utils.js";

/**
 * 创建发送语音工具
 */
export function createSendVoiceTool(context: FeishuPlatformContext): PlatformTool {
	return {
		name: "send_voice",
		label: "🎤 发送语音",
		description: "【已有音频文件时使用】发送已有的语音文件到当前聊天。如果你需要将文字转为语音，请优先使用 `speak` 工具。支持 MP3、WAV、OGG、OPUS 格式。",
		parameters: {
			type: "object",
			properties: {
				file_path: {
					type: "string",
					description: "语音文件路径（绝对路径）。支持 mp3, wav, ogg, opus 格式",
				},
				duration: {
					type: "number",
					description: "语音时长（毫秒）。如果不提供，将自动检测",
				},
			},
			required: ["file_path"],
		},
		platformMeta: {
			platform: "feishu",
			category: "voice",
			localName: "send",
		},
		execute: async (_toolCallId: string, params: any) => {
			try {
				const { file_path, duration } = params;
				const chatId = context["chatId"];

				// 自动检测时长（如果未提供）
				let actualDuration = duration;
				if (actualDuration === undefined) {
					actualDuration = await parseAudioDuration(file_path);
				}

				// 发送语音消息
				const messageId = await context.sendVoiceMessage(chatId, file_path, actualDuration);

				return {
					content: [{ type: "text", text: `语音消息已发送，时长: ${actualDuration ? Math.round(actualDuration / 1000) + "秒" : "未知"}` }],
					details: { success: true, messageId, duration: actualDuration },
				};
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `发送语音失败: ${error?.message || String(error)}` }],
					details: { success: false, error: error?.message },
				};
			}
		},
	};
}
