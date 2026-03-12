/**
 * STT Tool
 *
 * AI 工具：语音转文字
 */

import type { PlatformTool } from "../../../core/platform/tools/types.js";
import { getVoiceManager } from "../../../core/voice/index.js";

/**
 * 创建 STT 工具
 */
export function createSTTTool(): PlatformTool {
	return {
		name: "transcribe",
		label: "📝 语音转文字",
		description: "将语音文件转换为文字。支持中文、英文等多种语言。需要本地安装 whisper.cpp 或配置 OpenAI API。",
		parameters: {
			type: "object",
			properties: {
				audio_path: {
					type: "string",
					description: "音频文件路径（绝对路径）。支持 mp3, wav, ogg, opus 格式",
				},
				language: {
					type: "string",
					description: "音频语言代码，如 'zh'(中文), 'en'(英文)。默认自动检测",
				},
			},
			required: ["audio_path"],
		},
		platformMeta: {
			platform: "feishu",
			category: "voice",
			localName: "stt",
		},
		execute: async (_toolCallId: string, params: any) => {
			try {
				const { audio_path, language = "zh" } = params;

				// 使用 VoiceManager 进行识别
				const voiceManager = getVoiceManager();
				const result = await voiceManager.transcribe({
					audioPath: audio_path,
					language,
				});

				// 格式化结果
				let message = `识别结果:\n${result.text}`;
				
				if (result.segments && result.segments.length > 0) {
					message += "\n\n分段详情:\n";
					for (const seg of result.segments) {
						const start = formatTime(seg.startTime);
						const end = formatTime(seg.endTime);
						message += `[${start}-${end}] ${seg.text}\n`;
					}
				}

				return {
					content: [{ type: "text", text: message }],
					details: { success: true, text: result.text, confidence: result.confidence },
				};
			} catch (error: any) {
				// 检查是否是未配置错误
				if (error?.message?.includes("requires")) {
					return {
						content: [{ type: "text", text: `STT 服务未配置。${error.message}` }],
						details: { success: false, error: "STT not configured" },
					};
				}
				return {
					content: [{ type: "text", text: `语音识别失败: ${error?.message || String(error)}` }],
					details: { success: false, error: error?.message },
				};
			}
		},
	};
}

/**
 * 格式化时间（毫秒 -> mm:ss）
 */
function formatTime(ms: number): string {
	const seconds = Math.floor(ms / 1000);
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
