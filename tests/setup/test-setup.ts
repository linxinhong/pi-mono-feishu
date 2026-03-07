/**
 * Vitest 全局测试设置
 *
 * 在每个测试前执行，确保测试环境干净
 */

import { vi } from 'vitest';

// 每个测试前重置全局状态
beforeEach(() => {
	// 清除所有 mocks
	vi.clearAllMocks();
});

// 设置测试环境变量
process.env.FEISHU_APP_ID = 'test-app-id';
process.env.FEISHU_APP_SECRET = 'test-app-secret';
process.env.NODE_ENV = 'test';
