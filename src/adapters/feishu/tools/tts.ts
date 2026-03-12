/**
 * TTS Tool
 *
 * AI 工具：文字转语音并发送
 */

import type { PlatformTool } from "../../../core/platform/tools/types.js";
import type { FeishuPlatformContext } from "../context.js";
import { getVoiceManager } from "../../../core/voice/index.js";
import { join } from "path";
import { tmpdir } from "os";

/**
 * 创建 TTS 工具
 */
export function createTTSTool(context: FeishuPlatformContext): PlatformTool {
	return {
		name: "speak",
		label: "🔊 文字转语音",
		description: "将文字转换为语音并发送到聊天。使用微软 Edge TTS（免费），支持多种中文音色。",
		parameters: {
			type: "object",
			properties: {
				text: {
					type: "string",
					description: "要转换为语音的文本（建议 500 字以内）",
				},
				voice: {
					type: "string",
					description: "音色 ID。可选: zh-CN-XiaoxiaoNeural(晓晓,女), zh-CN-YunyangNeural(云扬,男), zh-CN-XiaoyiNeural(晓伊,女), zh-CN-YunjianNeural(云健,男)。默认晓晓",
					default: "zh-CN-XiaoxiaoNeural",
				},
				speed: {
					type: "number",
					description: "语速，范围 0.5-2.0，默认 1.0",
					default: 1.0,
				},
			},
			required: ["text"],
		},
		platformMeta: {
			platform: "feishu",
			category: "voice",
			localName: "tts",
		},
		execute: async (_toolCallId: string, params: any) => {
			try {
				const { text, voice = "zh-CN-XiaoxiaoNeural", speed = 1.0 } = params;
				const chatId = context["chatId"];

				// 限制文本长度
				if (text.length > 1000) {
					return {
						content: [{ type: "text", text: "文本过长，请控制在 1000 字以内" }],
						details: { success: false, error: "Text too long" },
					};
				}

				// 生成临时文件路径
				const tempPath = join(tmpdir(), `tts-${Date.now()}.opus`);

				// 使用 VoiceManager 合成语音
				const voiceManager = getVoiceManager();
				const result = await voiceManager.synthesize({
					text,
					voice,
					speed,
					outputPath: tempPath,
					format: "opus",
				});

				// 发送语音消息
				const messageId = await context.sendVoiceMessage(
					chatId,
					result.audioPath,
					result.duration
				);

				return {
					content: [{ type: "text", text: `语音已发送，时长: ${Math.round(result.duration / 1000)}秒` }],
					details: { success: true, messageId, duration: result.duration },
				};
			} catch (error: any) {
				// 检查是否是 edge-tts 未安装
				if (error?.message?.includes("edge-tts")) {
					return {
						content: [{ type: "text", text: "TTS 服务未配置。请在服务器上安装 edge-tts:\n  pip install edge-tts" }],
						details: { success: false, error: "TTS not configured" },
					};
				}
				return {
					content: [{ type: "text", text: `语音合成失败: ${error?.message || String(error)}` }],
					details: { success: false, error: error?.message },
				};
			}
		},
	};
}

/**
 * 创建列出可用音色工具
 */
export function createListVoicesTool(): PlatformTool {
	return {
		name: "list_voices",
		label: "🎵 列出音色",
		description: "列出所有可用的 TTS 音色",
		parameters: {
			type: "object",
			properties: {},
		},
		platformMeta: {
			platform: "feishu",
			category: "voice",
			localName: "list_voices",
		},
		execute: async () => {
			try {
				const voiceManager = getVoiceManager();
				const voices = voiceManager.getAllVoices();

				const voiceList = voices
					.filter((v) => v.provider === "edge")
					.map((v) => `${v.voice}: ${v.name}${v.description ? ` (${v.description})` : ""}`)
					.join("\n");

				return {
					content: [{ type: "text", text: `可用音色:\n${voiceList}` }],
					details: { success: true, voices },
				};
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `获取音色列表失败: ${error?.message || String(error)}` }],
					details: { success: false, error: error?.message },
				};
			}
		},
	};
}
