/**
 * Adapter Registry - Adapter 注册表
 *
 * 管理所有已注册的 Adapter 工厂
 */

import type { AdapterFactory, AdapterMeta } from "./types.js";

// ============================================================================
// Adapter Registry
// ============================================================================

/**
 * Adapter 注册表
 *
 * 单例模式，管理所有平台的 Adapter 工厂
 */
export class AdapterRegistry {
	private factories = new Map<string, AdapterFactory>();

	/**
	 * 注册 adapter 工厂
	 * @param factory Adapter 工厂
	 * @throws 如果已存在相同 ID 的工厂
	 */
	register(factory: AdapterFactory): void {
		const id = factory.meta.id;

		if (this.factories.has(id)) {
			console.warn(`[AdapterRegistry] Adapter "${id}" is already registered, replacing...`);
		}

		this.factories.set(id, factory);
		console.log(`[AdapterRegistry] Registered adapter: ${factory.meta.name} (${id}) v${factory.meta.version}`);
	}

	/**
	 * 获取 adapter 工厂
	 * @param platform 平台标识
	 * @returns Adapter 工厂或 undefined
	 */
	get(platform: string): AdapterFactory | undefined {
		return this.factories.get(platform);
	}

	/**
	 * 列出所有已注册的 adapter 元数据
	 * @returns Adapter 元数据数组
	 */
	list(): AdapterMeta[] {
		return Array.from(this.factories.values()).map((f) => f.meta);
	}

	/**
	 * 列出所有已注册的 adapter ID
	 * @returns 平台 ID 数组
	 */
	listIds(): string[] {
		return Array.from(this.factories.keys());
	}

	/**
	 * 检查是否已注册
	 * @param platform 平台标识
	 */
	has(platform: string): boolean {
		return this.factories.has(platform);
	}

	/**
	 * 注销 adapter
	 * @param platform 平台标识
	 * @returns 是否成功注销
	 */
	unregister(platform: string): boolean {
		return this.factories.delete(platform);
	}

	/**
	 * 清空所有注册
	 */
	clear(): void {
		this.factories.clear();
	}

	/**
	 * 获取注册数量
	 */
	get size(): number {
		return this.factories.size;
	}
}

// ============================================================================
// Global Singleton
// ============================================================================

/**
 * 全局 Adapter 注册表实例
 */
export const adapterRegistry = new AdapterRegistry();
