#!/usr/bin/env node
/**
 * pi-claw CLI
 *
 * pi-claw - Pi Claw 多平台机器人命令行工具
 */

import { Command } from "commander";
import { join } from "path";
import { parseSandboxArg, validateSandbox, type SandboxConfig } from "./core/sandbox/index.js";
import { createFeishuBot } from "./adapters/feishu/bot.js";
import { loadConfig, WORKSPACE_DIR, type AppConfig } from "./utils/config.js";
import * as log from "./utils/log.js";

const program = new Command();

program
	.name("pi-claw")
	.description("Pi Claw - 多平台机器人 CLI")
	.version("1.0.0");

// start 命令（默认）
program
	.command("start", { isDefault: true })
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

			// 启动机器人
			const bot = await createFeishuBot({
				configPath: options.config,
				sandboxConfig,
			});
			await bot.start(config.port!);

			log.logConnected();
		} catch (error: any) {
			console.error(`[pi-claw] Error: ${error.message}`);
			process.exit(1);
		}
	});

// docker 命令
program
	.command("docker")
	.description("Docker 容器管理")
	.argument("<action>", "create|start|stop|remove|status|shell")
	.option("--data-dir <path>", "数据目录")
	.option("--container <name>", "容器名称 (默认: pi-claw-sandbox)")
	.action(async (action, options) => {
		const containerName = options.container || "pi-claw-sandbox";
		const dataDir = options.dataDir || WORKSPACE_DIR;

		const validActions = ["create", "start", "stop", "remove", "status", "shell"];
		if (!validActions.includes(action)) {
			console.error(`Error: Invalid action '${action}'. Valid actions: ${validActions.join(", ")}`);
			process.exit(1);
		}

		// 执行 docker.sh 脚本
		const scriptPath = join(import.meta.dirname, "..", "scripts", "docker.sh");
		const args = [action, "--container", containerName];

		if (action === "create") {
			args.push("--data-dir", dataDir);
		}

		try {
			const { spawn } = await import("child_process");
			const child = spawn("bash", [scriptPath, ...args], {
				stdio: "inherit",
			});

			child.on("close", (code) => {
				process.exit(code || 0);
			});
		} catch (error: any) {
			console.error(`Error executing docker.sh: ${error.message}`);
			process.exit(1);
		}
	});

program.parse();
