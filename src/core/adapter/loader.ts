/**
 * Adapter Loader - Adapter 自动发现和加载
 *
 * 自动发现 adapters 目录下的所有 adapter 模块并加载
 */

import { readdirSync, existsSync } from "fs";
import { join, basename } from "path";
import { fileURLToPath } from "url";
import { adapterRegistry } from "./registry.js";
import type { AppConfig } from "../../utils/config.js";

// ============================================================================
// Constants
// ============================================================================

/** Adapters 目录路径 */
const ADAPTERS_DIR = join(process.cwd(), "src", "adapters");

// ============================================================================
// Adapter Discovery
// ============================================================================

/**
 * 发现所有可用的 adapter 目录
 * @param adaptersDir adapters 目录路径
 * @returns adapter 目录名数组
 */
export function discoverAdapters(adaptersDir: string = ADAPTERS_DIR): string[] {
	if (!existsSync(adaptersDir)) {
		console.warn(`[AdapterLoader] Adapters directory not found: ${adaptersDir}`);
		return [];
	}

	const entries = readdirSync(adaptersDir, { withFileTypes: true });
	const adapters: string[] = [];

	for (const entry of entries) {
		if (entry.isDirectory()) {
			// 检查是否有 index.ts 或 index.js
			const indexPath = join(adaptersDir, entry.name, "index.ts");
			const indexPathJs = join(adaptersDir, entry.name, "index.js");

			if (existsSync(indexPath) || existsSync(indexPathJs)) {
				adapters.push(entry.name);
			}
		}
	}

	return adapters;
}

// ============================================================================
// Adapter Loading
// ============================================================================

/**
 * 加载所有 adapter 模块（触发自注册）
 * @param adaptersDir adapters 目录路径
 */
export async function loadAdapters(adaptersDir: string = ADAPTERS_DIR): Promise<void> {
	const adapterNames = discoverAdapters(adaptersDir);

	console.log(`[AdapterLoader] Found adapters: ${adapterNames.join(", ")}`);

	for (const name of adapterNames) {
		try {
			// 动态 import adapter 模块（触发自注册）
			const modulePath = join(adaptersDir, name, "index.js");
			await import(modulePath);
			console.log(`[AdapterLoader] Loaded adapter: ${name}`);
		} catch (error) {
			console.error(`[AdapterLoader] Failed to load adapter ${name}:`, error);
		}
	}
}

// ============================================================================
// Platform Configuration
// ============================================================================

/**
 * 获取已配置的平台列表
 *
 * 从 adapterRegistry 获取已知平台列表，然后检查配置中哪些平台有配置
 *
 * @param config 应用配置
 * @returns 已配置的平台 ID 数组
 */
export function getConfiguredPlatforms(config: AppConfig): string[] {
	// 从 registry 获取已注册的平台列表
	const knownPlatforms = adapterRegistry.listIds();

	// 如果没有 adapter 注册，返回空
	if (knownPlatforms.length === 0) {
		console.warn("[AdapterLoader] No adapters registered");
		return [];
	}

	// 检查哪些平台有配置
	const platforms: string[] = [];
	for (const platform of knownPlatforms) {
		if (config[platform] && typeof config[platform] === "object") {
			platforms.push(platform);
		}
	}

	// 如果没有配置任何平台，但有 adapter 注册，使用第一个注册的（向后兼容）
	if (platforms.length === 0 && knownPlatforms.length > 0) {
		const firstPlatform = knownPlatforms[0];
		console.log(`[AdapterLoader] No platform configured, using first available: ${firstPlatform}`);
		platforms.push(firstPlatform);
	}

	return platforms;
}
