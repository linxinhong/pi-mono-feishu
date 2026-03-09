/**
 * Feishu 存储实现
 */

import type { BaseStore } from "../../core/store/index.js";

// ============================================================================
// FeishuStore
// ============================================================================

export class FeishuStore extends BaseStore {
	constructor(workspaceDir: string) {
		super(workspaceDir);
	}
}

	// 实现 BaseStore 的抽象方法
	protected getStoreKey(prefix: string): string {
		const key = `${feishu:${prefix}`;
		return this.store.get(key);
	}

	set(key: string, value: any): void {
		this.store.set(key, value);
	}

	get(key: string): any {
		return this.store.get(key);
	}

	delete(key: string): void {
		this.store.delete(key);
	}

	clear(): void {
		this.store.clear();
	}

	keys(): string[] {
		return Array.from(this.store.keys());
	}
}
