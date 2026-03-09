/**
 * Plugin Loader - Plugin 自动发现和加载
 *
 * 自动发现 plugins 目录下的所有 plugin 模块并加载
 * 根据配置决定哪些插件启用
 */

import { readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { Plugin } from "./types.js";
import type { PluginsConfig } from "./types.js";
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
 * 发现 plugins 目录下的所有插件模块
 * @param pluginsDir plugins 目录路径
 * @returns 插件名称数组
 */
export function discoverPlugins(pluginsDir: string = PLUGINS_DIR): string[] {
	const plugins: string[] = [];

	if (!existsSync(pluginsDir)) {
		return plugins;
	}

	const entries = readdirSync(pluginsDir, { withFileTypes: true });

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;

		// 检查是否有 index.ts 或 index.js
		const indexPath = join(pluginsDir, entry.name, "index.ts");
		const indexPathJs = join(pluginsDir, entry.name, "index.js");

		if (existsSync(indexPath) || existsSync(indexPathJs)) {
			plugins.push(entry.name);
		}
	}

	return plugins;
}

// ============================================================================
// Plugin Loading
// ============================================================================

/**
 * 动态加载插件模块
 * @param pluginName 插件名称
 * @param pluginsDir plugins 目录路径
 * @returns Plugin 实例或 null
 */
export async function loadPlugin(
	pluginName: string,
	pluginsDir: string = PLUGINS_DIR
): Promise<Plugin | null> {
	try {
		const modulePath = join(pluginsDir, pluginName, "index.js");
		const module = await import(modulePath);

		// 插件模块应该导出名为 xxxPlugin 的变量
		const pluginExportName = `${pluginName}Plugin`;
		const plugin = module[pluginExportName];

		if (!plugin) {
			console.error(
				`[PluginLoader] Plugin module "${pluginName}" does not export "${pluginExportName}"`
			);
			return null;
		}

		return plugin as Plugin;
	} catch (error) {
		console.error(`[PluginLoader] Failed to load plugin ${pluginName}:`, error);
		return null;
	}
}

/**
 * 加载所有启用的插件
 * @param pluginManager 插件管理器
 * @param pluginsConfig 插件配置
 * @param pluginsDir plugins 目录路径
 */
export async function loadPlugins(
	pluginManager: PluginManager,
	pluginsConfig: PluginsConfig,
	pluginsDir: string = PLUGINS_DIR
): Promise<void> {
	const discoveredPlugins = discoverPlugins(pluginsDir);

	console.log(`[PluginLoader] Found plugins: ${discoveredPlugins.join(", ")}`);

	for (const pluginName of discoveredPlugins) {
		const config = pluginsConfig[pluginName];

		// 跳过未启用的插件
		if (!config?.enabled) {
			console.log(`[PluginLoader] Plugin "${pluginName}" is disabled, skipping`);
			continue;
		}

		const plugin = await loadPlugin(pluginName, pluginsDir);
		if (plugin) {
			pluginManager.register(plugin);
		}
	}
}
