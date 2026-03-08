/**
 * TUI 命令 - 启动 TUI 界面
 */

import { Command } from "commander";
import { PiClawTUI } from "../../adapters/tui/index.js";
import type { TUIMode } from "../../adapters/tui/types.js";
import { randomUUID } from "crypto";

export function registerTUICommand(program: Command): void {
	program
		.command("tui")
		.description("启动 TUI 界面")
		.option("-m, --mode <mode>", "运行模式: chat, monitor, both", "chat")
		.option("-c, --config <path>", "配置文件路径")
		.option("-w, --workdir <path>", "工作目录")
		.action(async (options) => {
			try {
				console.log("[pi-claw] Starting TUI...");

				const tui = new PiClawTUI({
					workingDir: options.workdir,
					configPath: options.config,
					initialMode: options.mode as TUIMode,
				});

				// Handle events
				tui.addEventListener((event) => {
					if (event.type === "message-send") {
						// 添加用户消息到聊天面板
						tui.addChatMessage({
							id: randomUUID(),
							role: "user",
							content: event.content,
							timestamp: new Date(),
							channelId: event.channelId,
						});

						// 模拟 AI 响应（后续可以集成 CoreAgent）
						tui.addChatMessage({
							id: randomUUID(),
							role: "assistant",
							content: `[TUI Mode] You said: "${event.content}"\n\nNote: CoreAgent integration coming soon. This is a placeholder response.`,
							timestamp: new Date(),
							channelId: event.channelId,
						});

						// 添加日志
						tui.addLog({
							id: randomUUID(),
							level: "info",
							message: `Message sent: ${event.content.substring(0, 50)}...`,
							timestamp: new Date(),
							source: "chat",
						});
					}

					if (event.type === "exit") {
						tui.stop();
						process.exit(0);
					}
				});

				// 添加启动日志
				tui.addLog({
					id: randomUUID(),
					level: "info",
					message: `TUI started in ${options.mode} mode`,
					timestamp: new Date(),
					source: "tui",
				});

				// 初始化 adapter 状态
				tui.updateAdapterStatus({
					name: "TUI",
					type: "local",
					status: "running",
					channels: 1,
					messages: 0,
				});

				// Handle graceful shutdown
				const shutdown = () => {
					console.log("\n[pi-claw] Shutting down...");
					tui.stop();
					process.exit(0);
				};

				process.on("SIGINT", shutdown);
				process.on("SIGTERM", shutdown);

				await tui.start();
			} catch (error: any) {
				console.error(`[pi-claw] Error: ${error.message}`);
				process.exit(1);
			}
		});
}
