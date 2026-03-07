/**
 * 子进程 Mock 工具
 * 用于测试 Executor
 */

import { vi } from 'vitest';
import { EventEmitter } from 'events';

/**
 * 创建 Mock 子进程
 */
export function createMockChildProcess(options?: {
	exitCode?: number;
	stdout?: string;
	stderr?: string;
	delay?: number;
}) {
	const {
		exitCode = 0,
		stdout = 'mock stdout',
		stderr = '',
		delay = 10,
	} = options || {};

	const mockProcess = new EventEmitter() as any;
	mockProcess.pid = 12345;
	mockProcess.stdout = new EventEmitter();
	mockProcess.stderr = new EventEmitter();
	mockProcess.killed = false;

	// 模拟进程输出
	setTimeout(() => {
		if (stdout) {
			mockProcess.stdout.emit('data', Buffer.from(stdout));
		}
	}, delay);

	// 模拟错误输出
	setTimeout(() => {
		if (stderr) {
			mockProcess.stderr.emit('data', Buffer.from(stderr));
		}
	}, delay);

	// 模拟进程退出
	setTimeout(() => {
		mockProcess.emit('close', exitCode);
	}, delay + 5);

	// Mock kill 方法
	mockProcess.kill = vi.fn().mockImplementation((signal?: string) => {
		mockProcess.killed = true;
		mockProcess.emit('close', null);
	});

	return mockProcess;
}

/**
 * 创建 Mock spawn 函数
 */
export function createMockSpawn(mockProcess?: any) {
	return vi.fn().mockReturnValue(mockProcess || createMockChildProcess());
}

/**
 * 创建会超时的 Mock 子进程
 */
export function createMockTimeoutProcess(timeoutMs: number = 5000) {
	const mockProcess = new EventEmitter() as any;
	mockProcess.pid = 12345;
	mockProcess.stdout = new EventEmitter();
	mockProcess.stderr = new EventEmitter();
	mockProcess.killed = false;

	// 永不关闭，直到被 kill
	return mockProcess;
}

/**
 * 创建会 abort 的 Mock 子进程
 */
export function createMockAbortableProcess() {
	const mockProcess = new EventEmitter() as any;
	mockProcess.pid = 12345;
	mockProcess.stdout = new EventEmitter();
	mockProcess.stderr = new EventEmitter();
	mockProcess.killed = false;

	// 正常启动，等待外部 kill
	setTimeout(() => {
		mockProcess.stdout.emit('data', Buffer.from('started'));
	}, 10);

	return mockProcess;
}
