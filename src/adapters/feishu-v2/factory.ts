/**
 * Feishu V2 Adapter Factory
 *
 * 飞书平台 V2 的 Adapter 工厂实现
 */

import type { AdapterFactory, BotConfig, Bot } from "../../core/adapter/index.js";
import { UnifiedBot, type UnifiedBotConfig } from "../../core/unified-bot.js";
import { PluginManager } from "../../core/plugin/manager.js";
import { FeishuAdapter } from "./adapter.js";
import type { FeishuAdapterConfig } from "./types.js";
import type { SandboxConfig } from "../../core/sandbox/index.js";
import { PiLogger } from "../../utils/logger/index.js";
import type { Logger } from "../../utils/logger/index.js";
import { FeishuStore } from "./store.js";

// ============================================================================
// Types
// ============================================================================

/**
 * 飞书 V2 特定的 Bot 配置
 */
export interface FeishuV2BotConfig extends BotConfig {
	/** 飞书 App ID */
	appId: string;
	/** 飞书 App Secret */
	appSecret: string;
	/** 是否使用 WebSocket */
	useWebSocket?: boolean;
	/** 默认模型 */
	model?: string;
}

// ============================================================================
// Feishu V2 Adapter Factory
// ============================================================================

/**
 * 飞书 V2 Adapter 工厂
 */
export const feishuV2AdapterFactory: AdapterFactory = {
	meta: {
		id: "feishu-v2",
		name: "Feishu V2",
		version: "2.0.0",
		description: "飞书机器人适配器 V2 - 支持完整消息收发、卡片、表情反应、线程回复",
	},

	/**
	 * 创建飞书 V2 Bot 实例
	 */
	async createBot(config: FeishuV2BotConfig): Promise<Bot> {
		// 验证必要配置
		if (!config.appId || !config.appSecret) {
			throw new Error("Feishu V2 adapter requires appId and appSecret");
		}

		// 1. 创建 Logger
		const logger = new PiLogger("feishu-v2", {
			enabled: config.logging?.enabled ?? true,
			level: config.logging?.level || "info",
			dir: config.logging?.dir,
			console: config.logging?.console ?? true,
		});

		logger.info("Creating Feishu V2 bot", { workspaceDir: config.workspaceDir });

		// 合并 sandbox 配置
		const sandboxConfig: SandboxConfig = config.sandbox || { type: "host" };

		// 2. 创建飞书适配器（传入 logger）
		const adapter = new FeishuAdapter({
			appId: config.appId,
			appSecret: config.appSecret,
			workingDir: config.workspaceDir,
			platform: "feishu",
			enabled: true,
			useWebSocket: config.useWebSocket,
			port: config.port,
			logger: logger.child("adapter"),
			model: config.model,
		} as FeishuAdapterConfig);

		// 初始化适配器
		await adapter.initialize({
			platform: "feishu",
			enabled: true,
		});

		// 3. 创建插件管理器（传入 logger）
		const pluginManager = new PluginManager({
			workspaceDir: config.workspaceDir,
			pluginsConfig: config.plugins || {},
			logger: logger.child("plugin"),
		});

		// 设置平台为飞书
		pluginManager.setPlatform("feishu");

		// 初始化插件
		await pluginManager.initialize({
			sandboxConfig,
			platform: "feishu",
		});

		logger.info("Feishu V2 bot created successfully");

		// 4. 创建 Store
		const store = new FeishuStore({
			workspaceDir: config.workspaceDir,
			client: (adapter as any).client,
		});

		// 5. 创建统一机器人
		const bot = new UnifiedBot({
			adapter,
			workingDir: config.workspaceDir,
			store,
			pluginManager,
			port: config.port,
			defaultModel: config.model,
		});

		return bot;
	},

	/**
	 * 验证配置
	 */
	validateConfig(config: any): boolean {
		return !!(config && config.appId && config.appSecret && config.workspaceDir);
	},

	/**
	 * 获取默认配置
	 */
	getDefaultConfig(): Partial<FeishuV2BotConfig> {
		return {
			useWebSocket: true,
			port: 3000,
			plugins: {
				agent: { enabled: true },
				voice: { enabled: true, defaultVoice: "Cherry" },
				memory: { enabled: true, maxHistoryMessages: 10 },
				card: { enabled: true },
				event: { enabled: false },
			},
			sandbox: { type: "host" },
		};
	},
};
