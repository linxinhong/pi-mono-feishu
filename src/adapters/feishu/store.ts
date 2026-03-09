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

	// 实现 BaseStore 的抽象方法
	protected getStoreKey(prefix: string): string {
		return `feishu:${prefix}`;
	}
}
