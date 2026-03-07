/**
 * Feishu Platform Context
 *
 * 飞书平台上下文 - 提供飞书特定的能力
 */

import type { PlatformContext } from "../../core/platform/context.js";

// ============================================================================
// Types
// ============================================================================

/**
 * 飞书上下文配置
 */
export interface FeishuContextConfig {
	/** 飞书客户端 */
	client: any;
	/** 频道 ID */
	chatId: string;
	/** 发送文本消息的函数 */
	postMessage: (chatId: string, text: string) => Promise<string>;
	/** 更新消息的函数 */
	updateMessage: (messageId: string, text: string) => Promise<void>;
	/** 删除消息的函数 */
	deleteMessage: (messageId: string) => Promise<void>;
	/** 上传文件的函数 */
	uploadFile: (chatId: string, filePath: string, title?: string) => Promise<void>;
	/** 上传图片的函数 */
	uploadImage: (imagePath: string) => Promise<string>;
	/** 发送图片的函数 */
	sendImage: (chatId: string, imageKey: string) => Promise<string>;
	/** 发送语音消息的函数 */
	sendVoiceMessage: (chatId: string, filePath: string) => Promise<string>;
	/** 在线程中回复的函数 */
	postInThread: (chatId: string, parentMessageId: string, text: string) => Promise<string>;
}

// ============================================================================
// Feishu Platform Context
// ============================================================================

/**
 * 飞书平台上下文实现
 */
export class FeishuPlatformContext implements PlatformContext {
	readonly platform = "feishu";
	private config: FeishuContextConfig;

	constructor(config: FeishuContextConfig) {
		this.config = config;
	}

	async sendText(chatId: string, text: string): Promise<string> {
		return this.config.postMessage(chatId, text);
	}

	async updateMessage(messageId: string, content: string): Promise<void> {
		return this.config.updateMessage(messageId, content);
	}

	async deleteMessage(messageId: string): Promise<void> {
		return this.config.deleteMessage(messageId);
	}

	async uploadFile(filePath: string, chatId: string): Promise<void> {
		return this.config.uploadFile(chatId, filePath);
	}

	async uploadImage(imagePath: string): Promise<string> {
		return this.config.uploadImage(imagePath);
	}

	async sendImage(chatId: string, imageKey: string): Promise<string> {
		return this.config.sendImage(chatId, imageKey);
	}

	async sendVoiceMessage(chatId: string, filePath: string): Promise<string> {
		return this.config.sendVoiceMessage(chatId, filePath);
	}

	async postInThread(chatId: string, parentMessageId: string, text: string): Promise<string> {
		return this.config.postInThread(chatId, parentMessageId, text);
	}

	/**
	 * 获取飞书平台特定功能
	 */
	getPlatformFeature<T = any>(feature: string): T {
		switch (feature) {
			case "buildCard": {
				// 返回飞书卡片构建函数
				const fn = (content: string) => {
					return JSON.stringify({
						schema: "2.0",
						config: { width_mode: "fill", update_multi: true },
						body: {
							elements: [{ tag: "div", text: { tag: "lark_md", content } }],
						},
					});
				};
				return fn as T;
			}
			default:
				throw new Error(`Unknown feature: ${feature}`);
		}
	}
}
