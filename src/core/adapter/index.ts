/**
 * Adapter Module - Adapter 模块导出
 *
 * 提供 Adapter 注册和工厂接口
 */

// Types
export type {
	AdapterMeta,
	BotConfig,
	Bot,
	AdapterFactory,
	AdapterContext,
} from "./types.js";

// Registry
export { AdapterRegistry, adapterRegistry } from "./registry.js";

// Loader
export {
	discoverAdapters,
	loadAdapters,
	getConfiguredPlatforms,
} from "./loader.js";
