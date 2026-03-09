/**
 * TUI Module Entry
 *
 * TUI 模块入口
 */

export { PiClawTUI } from "./app.js";
export * from "./types.js";
export { darkTheme, createTheme } from "./theme.js";

// CoreAgent 集成
export { TUIAdapter } from "./adapter.js";
export type { TUIAdapterConfig } from "./adapter.js";
export { TUIStore } from "./store.js";
export { createTUIBot } from "./factory.js";
export type { CreateTUIBotConfig } from "./factory.js";
export { TUIPlatformContext, createTUIPlatformContext } from "./context.js";
export type { TUIPlatformContextOptions } from "./context.js";

// 自注册到 Adapter Registry
import { adapterRegistry } from "../../core/adapter/index.js";
import type { AdapterFactory, BotConfig, Bot } from "../../core/adapter/index.js";

// TUI Adapter 工厂（占位符）
const tuiAdapterFactory: AdapterFactory = {
	meta: {
		id: "tui",
		name: "TUI (Terminal UI)",
		version: "1.0.0",
		description: "Terminal-based interactive interface",
	},

	async createBot(_config: BotConfig): Promise<Bot> {
		throw new Error("TUI mode must be started via 'pi-claw tui' command");
	},
};

// 自注册
adapterRegistry.register(tuiAdapterFactory);
