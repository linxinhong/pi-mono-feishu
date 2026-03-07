/**
 * pi-claw - 多平台机器人网关
 *
 * 通过 Adapter Registry 加载配置指定的平台
 * 添加新平台只需创建 adapter 目录，无需修改此文件
 */

import {
	adapterRegistry,
	loadAdapters,
	getConfiguredPlatforms,
} from "./core/adapter/index.js";
import type { BotConfig, Bot } from "./core/adapter/index.js";
import { loadConfig } from "./utils/config.js";
import type { SandboxConfig } from "./core/sandbox/index.js";
import * as log from "./utils/log.js";

// 重新导出主要入口函数和类型（供外部使用）
export { createFeishuBot } from "./adapters/feishu/index.js";
export type { SandboxConfig } from "./core/sandbox/index.js";
export { adapterRegistry } from "./core/adapter/index.js";

/**
 * 主入口 - 启动机器人
 */
export async function main(): Promise<void> {
	const config = loadConfig();

	// 1. 自动发现并加载所有 adapter
	await loadAdapters();

	// 2. 确定要启动的平台（有配置的平台）
	const platforms = getConfiguredPlatforms(config);

	log.logInfo("Starting pi-claw...");
	log.logInfo(`Available adapters: ${adapterRegistry.listIds().join(", ")}`);
	log.logInfo(`Configured platforms: ${platforms.join(", ")}`);
	log.logInfo(`Working directory: ${config.workspaceDir}`);
	log.logInfo(`Port: ${config.port}`);

	if (platforms.length === 0) {
		throw new Error("No platform configured. Please configure at least one platform in config.json");
	}

	// 3. 为每个平台创建并启动 bot
	const bots: Bot[] = [];

	for (const platform of platforms) {
		const factory = adapterRegistry.get(platform);
		if (!factory) {
			log.logWarning(`No adapter registered for platform: ${platform}`);
			continue;
		}

		// 构建平台特定的 Bot 配置
		const platformConfig = config[platform as keyof typeof config] as Record<string, any>;
		const botConfig: BotConfig = {
			workspaceDir: config.workspaceDir!,
			plugins: config.plugins,
			sandbox: config.sandbox,
			port: config.port,
			...platformConfig, // 合并平台特定配置
		};

		const bot = await factory.createBot(botConfig);
		bots.push(bot);

		log.logInfo(`Created bot for platform: ${platform}`);
	}

	// 4. 启动所有 bot（并行）
	await Promise.all(bots.map((bot) => bot.start(config.port)));

	log.logConnected();
}

// 如果直接运行
if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((error) => {
		log.logError("Failed to start:", error);
		process.exit(1);
	});
}
