/**
 * Feishu Platform Context
 *
 * 飞书平台上下文 - 实现 PlatformContext 接口
 */

import type { PlatformContext, UserInfo, ChannelInfo } from "../../core/platform/context.js";
import type { FeishuAdapter } from "./adapter.js";
import { StatusManager } from "./status-manager.js";

/**
 * 飞书平台上下文
 *
 * 实现 PlatformContext 接口，提供飞书平台特定能力
 */
export class FeishuPlatformContext implements PlatformContext {
	readonly platform = "feishu" as const;

	private chatId: string;
	private adapter: FeishuAdapter;
	private statusManager: StatusManager;

	constructor(chatId: string, adapter: FeishuAdapter) {
		this.chatId = chatId;
		this.adapter = adapter;
		this.statusManager = new StatusManager(chatId, adapter);
	}

	/**
	 * 发送文本消息
	 *
	 * 检测工具状态消息并路由到状态管理器
	 */
	async sendText(chatId: string, text: string): Promise<string> {
		// 检测工具状态消息（以 _ -> 或 _Error: 开头）
		if (text.startsWith("_ -> ") || text.startsWith("_Error:")) {
			// 工具状态 → 状态管理器
			return this.statusManager.updateToolStatus(text);
		}

		// 普通消息 → 完成并发送最终卡片
		return this.statusManager.finish(text);
	}

	/**
	 * 显示思考过程
	 */
	async showThinking(content: string): Promise<void> {
		await this.statusManager.showThinking(content);
	}

	/**
	 * 追加思考内容
	 */
	appendThinking(content: string): void {
		this.statusManager.appendThinking(content);
	}

	/**
	 * 完成响应
	 */
	async finishStatus(finalContent: string): Promise<string> {
		return this.statusManager.finish(finalContent);
	}

	/**
	 * 错误响应
	 */
	async errorStatus(errorText: string): Promise<string> {
		return this.statusManager.error(errorText);
	}

	/**
	 * 更新消息
	 */
	async updateMessage(messageId: string, content: string): Promise<void> {
		await this.adapter.updateMessage(messageId, {
			type: "text",
			content,
		});
	}

	/**
	 * 删除消息
	 */
	async deleteMessage(messageId: string): Promise<void> {
		await this.adapter.deleteMessage(messageId);
	}

	/**
	 * 上传文件
	 */
	async uploadFile(filePath: string, chatId: string): Promise<void> {
		const fileKey = await this.adapter.uploadFile(filePath);
		// 飞书需要单独发送文件消息
		// 这里简化处理，实际需要调用 sendFileLark
	}

	/**
	 * 上传图片
	 */
	async uploadImage(imagePath: string): Promise<string> {
		return this.adapter.uploadImage(imagePath);
	}

	/**
	 * 发送图片
	 */
	async sendImage(chatId: string, imageKey: string): Promise<string> {
		const result = await this.adapter.sendCard(chatId, {
			schema: "2.0",
			config: { wide_screen_mode: true },
			body: {
				elements: [
					{
						tag: "img",
						img_key: imageKey,
					},
				],
			},
		});
		return result.messageId;
	}

	/**
	 * 发送语音消息
	 */
	async sendVoiceMessage(chatId: string, filePath: string): Promise<string> {
		// 飞书语音消息需要先上传再发送
		throw new Error("Voice message not implemented");
	}

	/**
	 * 在话题中回复
	 */
	async postInThread(chatId: string, parentMessageId: string, text: string): Promise<string> {
		const result = await this.adapter.sendText(chatId, text);
		return result.messageId;
	}

	/**
	 * 获取用户信息
	 */
	async getUserInfo(userId: string): Promise<UserInfo | undefined> {
		return this.adapter.getUserInfo(userId);
	}

	/**
	 * 获取所有用户
	 */
	async getAllUsers(): Promise<UserInfo[]> {
		return this.adapter.getAllUsers();
	}

	/**
	 * 获取频道信息
	 */
	async getChannelInfo(channelId: string): Promise<ChannelInfo | undefined> {
		return this.adapter.getChannelInfo(channelId);
	}

	/**
	 * 获取所有频道
	 */
	async getAllChannels(): Promise<ChannelInfo[]> {
		return this.adapter.getAllChannels();
	}
}
