/**
 * Feishu Platform Context
 *
 * 飞书平台上下文 - 提供飞书特定的能力
 */

import type { PlatformContext } from "../../core/platform/context.js";
import { buildStatusCard, autoBuildCard, buildProgressCard, buildTextCard } from "./cards/index.js";

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
	private statusMessageId: string | null = null; // 状态消息 ID
	private toolHistory: string[] = []; // 工具执行历史
	private updateTimer: ReturnType<typeof setTimeout> | null = null; // 防抖定时器
	private pendingUpdate: boolean = false; // 是否有待处理的更新

	constructor(config: FeishuContextConfig) {
		this.config = config;
	}

	/**
	 * 防抖更新状态卡片
	 * 合并频繁的更新请求，避免触发飞书 API 频率限制
	 */
	private async debouncedUpdate(): Promise<void> {
		this.pendingUpdate = true;

		if (this.updateTimer) {
			return; // 已有待处理的更新
		}

		this.updateTimer = setTimeout(async () => {
			this.updateTimer = null;
			if (this.pendingUpdate && this.statusMessageId) {
				this.pendingUpdate = false;
				const progressCard = JSON.stringify(buildProgressCard("🤔 处理中...", this.toolHistory));
				try {
					await this.config.updateMessage(this.statusMessageId, progressCard);
				} catch (error) {
					console.error("[FeishuContext] 更新状态卡片失败:", error);
				}
			}
		}, 500); // 500ms 防抖
	}

	/**
	 * 解析工具状态文本
	 * @returns 解析结果：{ type: 'start' | 'end', toolName, status? }
	 */
	private parseToolStatus(text: string): { type: "start" | "end"; toolName: string; status?: "OK" | "X" } | null {
		// 匹配开始状态: "-> tool_name"
		const startMatch = text.match(/^-> (.+)$/);
		if (startMatch) {
			return { type: "start", toolName: startMatch[1] };
		}

		// 匹配结束状态: "-> OK tool_name" 或 "-> X tool_name"
		const endMatch = text.match(/^-> (OK|X) (.+)$/);
		if (endMatch) {
			return { type: "end", toolName: endMatch[2], status: endMatch[1] as "OK" | "X" };
		}

		return null;
	}

	async sendText(chatId: string, text: string): Promise<string> {
		// 如果是工具状态消息（以 "_ ->" 开头），记录到历史
		if (text.startsWith("_ -> ") || text.startsWith("_Error:")) {
			const cleanText = text.replace(/^_/, "").replace(/_$/, "");

			// 解析工具状态
			const parsed = this.parseToolStatus(cleanText);

			if (parsed) {
				if (parsed.type === "start") {
					// 工具开始：添加新行，显示进行中状态
					this.toolHistory.push(`⏳ ${parsed.toolName}`);
				} else if (parsed.type === "end") {
					// 工具结束：查找并更新对应的工具行（从后向前查找）
					let lastIdx = -1;
					for (let i = this.toolHistory.length - 1; i >= 0; i--) {
						if (this.toolHistory[i].includes(parsed.toolName)) {
							lastIdx = i;
							break;
						}
					}
					if (lastIdx >= 0) {
						const icon = parsed.status === "OK" ? "✓" : "✗";
						this.toolHistory[lastIdx] = `${icon} ${parsed.toolName}`;
					} else {
						// 如果找不到开始行，直接添加结果
						const icon = parsed.status === "OK" ? "✓" : "✗";
						this.toolHistory.push(`${icon} ${parsed.toolName}`);
					}
				}
			} else {
				// 其他状态消息直接添加
				this.toolHistory.push(cleanText);
			}
		}

		// 如果还没有状态消息，先创建一个
		if (!this.statusMessageId) {
			const initialCard = JSON.stringify(buildProgressCard("🤔 处理中...", []));
			this.statusMessageId = await this.config.postMessage(chatId, initialCard);
		}

		// 使用防抖更新状态卡片
		if (this.toolHistory.length > 0) {
			await this.debouncedUpdate();
		}

		return this.statusMessageId;
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
	 * 重置状态（用于新会话）
	 */
	resetStatus(): void {
		// 清除待处理的定时器
		if (this.updateTimer) {
			clearTimeout(this.updateTimer);
			this.updateTimer = null;
		}
		this.pendingUpdate = false;
		this.statusMessageId = null;
		this.toolHistory = [];
	}

	/**
	 * 完成状态（用于处理完成后更新状态）
	 * @param finalMessage 最终消息，如果不提供则删除状态消息
	 */
	async finishStatus(finalMessage?: string): Promise<void> {
		if (finalMessage) {
			// 使用智能卡片构建器
			const card = autoBuildCard(finalMessage);
			const cardContent = JSON.stringify(card);

			if (this.statusMessageId) {
				// 有状态消息，更新它
				await this.config.updateMessage(this.statusMessageId, cardContent);
			} else {
				// 没有状态消息（没有工具调用），创建新消息
				this.statusMessageId = await this.config.postMessage(this.config.chatId, cardContent);
			}
		} else if (this.statusMessageId) {
			// 没有最终消息，删除状态消息
			await this.config.deleteMessage(this.statusMessageId);
		}
		this.statusMessageId = null;
		this.toolHistory = [];
	}

	/**
	 * 获取飞书平台特定功能
	 */
	getPlatformFeature<T = any>(feature: string): T {
		switch (feature) {
			case "buildCard": {
				// 返回飞书卡片构建函数
				const fn = (content: string) => JSON.stringify(buildTextCard(content));
				return fn as T;
			}
			case "autoBuildCard": {
				// 返回智能卡片构建函数
				const fn = (content: string) => JSON.stringify(autoBuildCard(content));
				return fn as T;
			}
			default:
				throw new Error(`Unknown feature: ${feature}`);
		}
	}
}
