/**
 * 飞书消息去重
 *
 * 基于 message_id 的滑动窗口去重，防止重复处理同一消息
 */

// ============================================================================
// 类型
// ============================================================================

export interface MessageDeduplicator {
	/** 检查消息是否已处理过 */
	has(messageId: string): boolean;
	/** 标记消息为已处理 */
	add(messageId: string): void;
	/** 清除所有记录 */
	clear(): void;
	/** 当前大小 */
	readonly size: number;
}

// ============================================================================
// 实现
// ============================================================================

const DEFAULT_MAX_SIZE = 1000;
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 分钟

interface Entry {
	messageId: string;
	timestamp: number;
}

/**
 * 创建消息去重器
 */
export function createMessageDeduplicator(
	maxSize = DEFAULT_MAX_SIZE,
	ttlMs = DEFAULT_TTL_MS
): MessageDeduplicator {
	const entries: Entry[] = new Map<string, number>();
	const orderedIds: string[] = [];

	function cleanup(): void {
		const now = Date.now();
		const cutoff = now - ttlMs;

		// 移除过期条目
		while (orderedIds.length > 0) {
			const oldest = orderedIds[0];
			const timestamp = entries.get(oldest);
			if (timestamp && timestamp < cutoff) {
				entries.delete(oldest);
				orderedIds.shift();
			} else {
				break;
			}
		}

		// 如果超过最大大小，移除最老的
		while (orderedIds.length > maxSize) {
			const oldest = orderedIds.shift();
			if (oldest) {
				entries.delete(oldest);
			}
		}
	}

	return {
		has(messageId: string): boolean {
			return entries.has(messageId);
		},

		add(messageId: string): void {
			if (entries.has(messageId)) return;

			const now = Date.now();
			entries.set(messageId, now);
			orderedIds.push(messageId);

			// 定期清理
			if (orderedIds.length % 100 === 0) {
				cleanup();
			}
		},

		clear(): void {
			entries.clear();
			orderedIds.length = 0;
		},

		get size(): number {
			return entries.size;
		},
	};
}

// ============================================================================
// 带过期清理的去重器
// ============================================================================

/**
 * 可自动清理的消息去重器
 */
export class AutoCleaningDeduplicator implements MessageDeduplicator {
	private dedup: MessageDeduplicator;
	private cleanupInterval?: ReturnType<typeof setInterval>;

	constructor(
		maxSize = DEFAULT_MAX_SIZE,
		ttlMs = DEFAULT_TTL_MS,
		autoCleanupIntervalMs = 60 * 1000 // 每分钟清理一次
	) {
		this.dedup = createMessageDeduplicator(maxSize, ttlMs);

		if (autoCleanupIntervalMs > 0) {
			this.cleanupInterval = setInterval(() => {
				// 触发清理
				this.dedup.add("__cleanup__");
				this.dedup.has("__cleanup__") && this.dedup.clear();
			}, autoCleanupIntervalMs);
		}
	}

	has(messageId: string): boolean {
		return this.dedup.has(messageId);
	}

	add(messageId: string): void {
		this.dedup.add(messageId);
	}

	clear(): void {
		this.dedup.clear();
	}

	get size(): number {
		return this.dedup.size;
	}

	/** 停止自动清理 */
	dispose(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = undefined;
		}
		this.clear();
	}
}
