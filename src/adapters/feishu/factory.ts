/**
 * Feishu Bot Factory
 *
 * 创建配置好的 UnifiedBot 实例用于飞书平台
 */

import { join } from "path";
import { UnifiedBot } from "../../core/unified-bot.js";
import { PluginManager } from "../../core/plugin/manager.js";
import { FeishuAdapter } from "./adapter.js";
import { FeishuStore } from "./store.js";
import { ConfigManager } from "../../core/config/manager.js";
import { getHookManager } from "../../core/hook/index.js";
import { PiLogger } from "../../utils/logger/index.js";
import type { FeishuAdapterConfig } from "./types.js";

// ============================================================================
// Types
// ============================================================================

export interface CreateFeishuBotConfig {
	/** 工作目录 */
	workspaceDir: string;
	/** 飞书配置 */
	feishuConfig: FeishuAdapterConfig;
	/** 默认模型 */
	model?: string;
	/** 日志器 */
	logger?: PiLogger;
}

// ============================================================================
// Factory
// ============================================================================

/**
 * 创建飞书 Bot
 *
 * 创建配置好的 UnifiedBot 实例， */
export async function createFeishuBot(config: CreateFeishuBotConfig): Promise<UnifiedBot> {
	const { workspaceDir, feishuConfig, model } = config;

	// 1. 创建 Logger
	const logDir = join(workspaceDir, "logs");
	const logger = config.logger || new PiLogger("feishu", {
		dir: logDir,
		enabled: true,
		level: "info",
		console: true,
	});

	logger.info("Creating Feishu bot", {
		workspaceDir,
		appId: feishuConfig.appId ? "***" : "(not set)",
	});

	// 2. 创建 FeishuAdapter
	const adapter = new FeishuAdapter({
		...feishuConfig,
		defaultModel: model,
		logger,
	});

	// 初始化适配器
	await adapter.initialize({
		platform: "feishu",
		enabled: true,
	});

	// 3. 创建 FeishuStore
	const store = new FeishuStore({
		workspaceDir,
	});

	// 4. 初始化 ConfigManager
	let configManager: ConfigManager | undefined;
	try {
		configManager = ConfigManager.getInstance();
	} catch {
		// ConfigManager 未初始化，使用默认配置
	}

	// 5. 创建 PluginManager
	const pluginsConfig = {
		agent: { enabled: true },
		memory: { enabled: true, maxHistoryMessages: 10 },
	};

	const pluginManager = new PluginManager({
		workspaceDir,
		pluginsConfig,
		logger: logger.child("plugin"),
	});

	// 设置平台
	pluginManager.setPlatform("feishu");

	// 设置 HookManager
	pluginManager.setHookManager(getHookManager());

	// 初始化插件
	await pluginManager.initialize({
		platform: "feishu",
	});

	logger.info("Feishu bot created successfully");

	// 6. 创建 UnifiedBot
	const bot = new UnifiedBot({
		adapter,
		workingDir: workspaceDir,
		store,
		pluginManager,
		defaultModel: model,
	});

	return bot;
}
