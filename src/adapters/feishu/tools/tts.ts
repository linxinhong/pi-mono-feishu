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
		description: "将文字转换为语音并发送到聊天。支持两种引擎：\n1. Edge TTS（免费，无需配置）- 音色：晓晓、云扬等\n2. DashScope TTS（阿里云）- 音色：Cherry、Serena、Ethan等\n默认使用 Edge TTS，如需使用 DashScope 请设置 provider 参数。",
		parameters: {
			type: "object",
			properties: {
				text: {
					type: "string",
					description: "要转换为语音的文本（建议 500 字以内）",
				},
				voice: {
					type: "string",
					description: "音色 ID。Edge: zh-CN-XiaoxiaoNeural(晓晓), zh-CN-YunyangNeural(云扬)等; DashScope: Cherry, Serena, Ethan等。默认晓晓",
					default: "zh-CN-XiaoxiaoNeural",
				},
				speed: {
					type: "number",
					description: "语速，范围 0.5-2.0，默认 1.0",
					default: 1.0,
				},
				provider: {
					type: "string",
					description: "TTS 引擎提供商: 'dashscope'(阿里云,推荐中文) 或 'edge'(免费,英文)",
					default: "dashscope",
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
				const { text, voice = "zh-CN-XiaoxiaoNeural", speed = 1.0, provider = "dashscope" } = params;
				const chatId = context["chatId"];

				// 限制文本长度
				if (text.length > 1000) {
					return {
						content: [{ type: "text", text: "文本过长，请控制在 1000 字以内" }],
						details: { success: false, error: "Text too long" },
					};
				}

				// 生成临时文件路径（使用 .opus，飞书语音需要此格式）
				const tempPath = join(tmpdir(), `tts-${Date.now()}.opus`);

				// 使用 VoiceManager 合成语音
				const voiceManager = getVoiceManager();
				const result = await voiceManager.synthesize({
					text,
					voice,
					speed,
					outputPath: tempPath,
					format: "opus",
					provider,
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

				// 按提供商分组
				const edgeVoices = voices.filter((v) => v.provider === "edge");
				const dashscopeVoices = voices.filter((v) => v.provider === "dashscope");

				let message = "**Edge TTS（免费，无需配置）**\n";
				message += edgeVoices
					.map((v) => `- ${v.voice}: ${v.name}${v.description ? ` (${v.description})` : ""}`)
					.join("\n");

				message += "\n\n**DashScope TTS（阿里云，需配置 API Key）**\n";
				message += dashscopeVoices
					.map((v) => `- ${v.voice}: ${v.name}${v.description ? ` (${v.description})` : ""}`)
					.join("\n");

				return {
					content: [{ type: "text", text: message }],
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
