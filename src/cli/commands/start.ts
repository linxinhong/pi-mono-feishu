/**
 * start 命令 - 启动机器人
 */

import { Command } from "commander";
import { parseSandboxArg, validateSandbox, type SandboxConfig } from "../../core/sandbox/index.js";
import { adapterRegistry, loadAdapters, type BotConfig } from "../../core/adapter/index.js";
import { loadConfig } from "../../utils/config.js";
import * as log from "../../utils/logger/index.js";

export function registerStartCommand(program: Command): void {
	program
		.command("start")
		.description("启动飞书机器人")
		.option("--sandbox <type>", "Sandbox 类型: host 或 docker:<container>")
		.option("--config <path>", "配置文件路径")
		.action(async (options) => {
			try {
				// 加载配置
				const config = loadConfig(options.config);

				// 解析 sandbox 配置（CLI 参数优先）
				let sandboxConfig: SandboxConfig;
				if (options.sandbox) {
					sandboxConfig = parseSandboxArg(options.sandbox);
				} else if (config.sandbox) {
					sandboxConfig = config.sandbox as SandboxConfig;
				} else {
					sandboxConfig = { type: "host" };
				}

				console.log(`[pi-claw] Starting pi-claw...`);
				console.log(`[pi-claw] Sandbox mode: ${sandboxConfig.type}${sandboxConfig.type === "docker" ? `:${sandboxConfig.container}` : ""}`);
				console.log(`[pi-claw] Working directory: ${config.workspaceDir}`);
				console.log(`[pi-claw] Port: ${config.port}`);

				// 验证 sandbox
				await validateSandbox(sandboxConfig);

				// 加载所有适配器
				await loadAdapters();

				// 获取 feishu 工厂
				const factory = adapterRegistry.get("feishu");
				if (!factory) {
					throw new Error("Feishu adapter not found in registry");
				}

				// 构建配置
				const feishuConfig = config.feishu as Record<string, any> || {};
				const botConfig: BotConfig = {
					workspaceDir: config.workspaceDir!,
					plugins: config.plugins,
					sandbox: sandboxConfig,
					port: config.port,
					...feishuConfig,
				};

				// 创建并启动机器人
				const bot = await factory.createBot(botConfig);
				await bot.start(config.port!);

				log.logConnected();
			} catch (error: any) {
				console.error(`[pi-claw] Error: ${error.message}`);
				process.exit(1);
			}
		});
}
