/**
 * Plugin Loader - Plugin 自动发现和加载
 *
 * 自动发现 plugins 目录下的所有 plugin 模块并加载
 * 根据配置决定哪些插件启用
 */

import { readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { Plugin, PluginsConfig } from "./types.js";
import type { PluginManager } from "./manager.js";

// ============================================================================
// Constants
// ============================================================================

/** 获取当前文件所在目录 */
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Plugins 目录路径
 * 从 core/plugin/ 目录向上两级，然后进入 plugins
 */
const PLUGINS_DIR = join(__dirname, "..", "..", "plugins");

// ============================================================================
// Plugin Discovery
// ============================================================================

/**
 * 发现所有可用的 plugin 目录
 * @param pluginsDir plugins 目录路径
 * @returns plugin 目录名数组
 */
export function discoverPlugins(pluginsDir: string = PLUGINS_DIR): string[] {
	if (!existsSync(pluginsDir)) {
		console.warn(`[PluginLoader] Plugins directory not found: ${pluginsDir}`);
		return [];
	}

	const entries = readdirSync(pluginsDir, { withFileTypes: true });
	const plugins: string[] = [];

	for (const entry of entries) {
		if (entry.isDirectory()) {
			// 检查是否有 index.ts 或 index.js
			const indexPath = join(pluginsDir, entry.name, "index.ts");
			const indexPathJs = join(pluginsDir, entry.name, "index.js");

			if (existsSync(indexPath) || existsSync(indexPathJs)) {
				plugins.push(entry.name);
			}
		}
	}

	return plugins;
}

// ============================================================================
// Plugin Loading
// ============================================================================

/**
 * 加载单个 plugin 模块并注册到 PluginManager
 * @param pluginName plugin 目录名
 * @param manager PluginManager 实例
 * @param pluginsDir plugins 目录路径
 */
export async function loadPlugin(
	pluginName: string,
	manager: PluginManager,
	pluginsDir: string = PLUGINS_DIR
): Promise<void> {
	try {
		// 动态 import plugin 模块
		const modulePath = join(pluginsDir, pluginName, "index.js");
		const module = await import(modulePath);

		// 查找导出的 plugin 实例
		// 支持多种导出格式:
		// - export const plugin = {...}
		// - export default {...}
		// - export const xxxPlugin = {...}
		let plugin: Plugin | undefined;

		if (module.default && isPlugin(module.default)) {
			plugin = module.default;
		} else {
			// 查找以 Plugin 结尾的导出
			for (const key of Object.keys(module)) {
				if (key.toLowerCase().endsWith("plugin") && isPlugin(module[key])) {
					plugin = module[key];
					break;
				}
			}
			// 如果没找到，尝试第一个符合 Plugin 接口的对象
			if (!plugin) {
				for (const key of Object.keys(module)) {
					if (isPlugin(module[key])) {
						plugin = module[key];
						break;
					}
				}
			}
		}

		if (plugin) {
			manager.register(plugin);
			console.log(`[PluginLoader] Loaded plugin: ${pluginName}`);
		} else {
			console.warn(`[PluginLoader] No valid plugin export found in ${pluginName}`);
		}
	} catch (error) {
		console.error(`[PluginLoader] Failed to load plugin ${pluginName}:`, error);
	}
}

/**
 * 检查对象是否符合 Plugin 接口
 */
function isPlugin(obj: unknown): obj is Plugin {
	if (!obj || typeof obj !== "object") return false;
	const p = obj as Record<string, unknown>;
	return (
		typeof p.meta === "object" &&
		p.meta !== null &&
		typeof (p.meta as Record<string, unknown>).id === "string" &&
		typeof (p.meta as Record<string, unknown>).name === "string" &&
		typeof (p.meta as Record<string, unknown>).version === "string"
	);
}

/**
 * 加载所有 plugin 模块并注册到 PluginManager
 * 只加载配置中启用的插件
 * @param manager PluginManager 实例
 * @param config 插件配置
 * @param pluginsDir plugins 目录路径
 */
export async function loadPlugins(
	manager: PluginManager,
	config: PluginsConfig,
	pluginsDir: string = PLUGINS_DIR
): Promise<void> {
	const pluginNames = discoverPlugins(pluginsDir);

	console.log(`[PluginLoader] Found plugins: ${pluginNames.join(", ")}`);

	// 获取配置中启用的插件列表
	const enabledPlugins = pluginNames.filter((name) => {
		const pluginConfig = config[name];
		return pluginConfig && pluginConfig.enabled === true;
	});

	console.log(`[PluginLoader] Enabled plugins: ${enabledPlugins.join(", ")}`);

	// 只加载启用的插件
	for (const name of enabledPlugins) {
		await loadPlugin(name, manager, pluginsDir);
	}
}
