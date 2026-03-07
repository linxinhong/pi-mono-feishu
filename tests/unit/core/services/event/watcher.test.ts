/**
 * EventsWatcher 单元测试
 *
 * 测试核心事件监控服务
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventsWatcher } from '../../../../../src/core/services/event/watcher.js';
import { existsSync, unlinkSync, rmdirSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

describe('EventsWatcher', () => {
	let watcher: EventsWatcher;
	let testEventsDir: string;
	let onEventCallback: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		// 创建临时事件目录
		testEventsDir = join(process.cwd(), 'test-temp', `events-test-${Date.now()}`);
		mkdirSync(testEventsDir, { recursive: true });

		onEventCallback = vi.fn();

		watcher = new EventsWatcher({
			eventsDir: testEventsDir,
			onEvent: onEventCallback,
		});
	});

	afterEach(() => {
		// 停止监控
		watcher.stop();

		// 清理临时目录
		try {
			const fs = require('fs');
			const files = fs.readdirSync(testEventsDir);
			for (const file of files) {
				unlinkSync(join(testEventsDir, file));
			}
			rmdirSync(testEventsDir);
		} catch {}
	});

	describe('基础功能', () => {
		it('constructor 创建实例', () => {
			expect(watcher).toBeDefined();
		});

		it('start() 启动监控', () => {
			watcher.start();
			expect(existsSync(testEventsDir)).toBe(true);
		});

		it('stop() 停止监控', () => {
			watcher.start();
			watcher.stop();
			// 应该没有错误抛出
		});
	});

	describe('immediate 事件', () => {
		it('处理 immediate 事件（新文件）', (done) => {
			watcher.start();

			// 创建新的事件文件
			const eventFile = join(testEventsDir, 'test-immediate.json');
			const eventData = JSON.stringify({
				type: 'immediate',
				channelId: 'test-channel',
				text: '立即执行的消息',
			});
			writeFileSync(eventFile, eventData);

			// 等待文件被处理
			setTimeout(() => {
				expect(onEventCallback).toHaveBeenCalledWith('test-channel', '立即执行的消息');
				done();
			}, 200);
		});

		it('执行后删除 immediate 事件文件', (done) => {
			watcher.start();

			const eventFile = join(testEventsDir, 'test-immediate.json');
			const eventData = JSON.stringify({
				type: 'immediate',
				channelId: 'test-channel',
				text: '测试消息',
			});
			writeFileSync(eventFile, eventData);

			setTimeout(() => {
				expect(existsSync(eventFile)).toBe(false);
				done();
			}, 200);
		});
	});

	describe('one-shot 事件', () => {
		it('处理 one-shot 事件（未来时间）', (done) => {
			watcher.start();

			const futureTime = new Date(Date.now() + 100).toISOString();
			const eventFile = join(testEventsDir, 'test-oneshot.json');
			const eventData = JSON.stringify({
				type: 'one-shot',
				channelId: 'test-channel',
				text: '定时消息',
				at: futureTime,
			});
			writeFileSync(eventFile, eventData);

			setTimeout(() => {
				expect(onEventCallback).toHaveBeenCalledWith('test-channel', '定时消息');
				done();
			}, 200);
		});

		it('删除过期的 one-shot 事件', (done) => {
			watcher.start();

			const pastTime = new Date(Date.now() - 1000).toISOString();
			const eventFile = join(testEventsDir, 'test-expired.json');
			const eventData = JSON.stringify({
				type: 'one-shot',
				channelId: 'test-channel',
				text: '过期消息',
				at: pastTime,
			});
			writeFileSync(eventFile, eventData);

			setTimeout(() => {
				expect(existsSync(eventFile)).toBe(false);
				expect(onEventCallback).not.toHaveBeenCalled();
				done();
			}, 200);
		});
	});

	describe('periodic 事件', () => {
		it('处理 periodic 事件', (done) => {
			watcher.start();

			const eventFile = join(testEventsDir, 'test-periodic.json');
			const eventData = JSON.stringify({
				type: 'periodic',
				channelId: 'test-channel',
				text: '周期消息',
				schedule: '* * * * *',
				timezone: 'Asia/Shanghai',
			});
			writeFileSync(eventFile, eventData);

			// 给 cron 时间启动
			setTimeout(() => {
				// cron 应该已经设置（虽然可能还没触发）
				expect(existsSync(eventFile)).toBe(true);
				done();
			}, 100);
		});
	});

	describe('无效事件处理', () => {
		it('忽略无效的 JSON', (done) => {
			watcher.start();

			const eventFile = join(testEventsDir, 'invalid.json');
			writeFileSync(eventFile, '{ invalid json }');

			setTimeout(() => {
				// 文件应该被删除
				expect(existsSync(eventFile)).toBe(false);
				expect(onEventCallback).not.toHaveBeenCalled();
				done();
			}, 200);
		});

		it('忽略缺少必需字段的事件', (done) => {
			watcher.start();

			const eventFile = join(testEventsDir, 'incomplete.json');
			const eventData = JSON.stringify({
				type: 'immediate',
				// 缺少 channelId 和 text
			});
			writeFileSync(eventFile, eventData);

			setTimeout(() => {
				expect(existsSync(eventFile)).toBe(false);
				expect(onEventCallback).not.toHaveBeenCalled();
				done();
			}, 200);
		});

		it('忽略无效的事件类型', (done) => {
			watcher.start();

			const eventFile = join(testEventsDir, 'unknown-type.json');
			const eventData = JSON.stringify({
				type: 'unknown-type',
				channelId: 'test-channel',
				text: '消息',
			});
			writeFileSync(eventFile, eventData);

			setTimeout(() => {
				expect(existsSync(eventFile)).toBe(false);
				expect(onEventCallback).not.toHaveBeenCalled();
				done();
			}, 200);
		});
	});

	describe('文件变更监控', () => {
		it('检测到文件修改时重新处理', (done) => {
			watcher.start();

			const eventFile = join(testEventsDir, 'modify-test.json');
			// 先写入一个未来的 one-shot 事件
			const futureTime = new Date(Date.now() + 10000).toISOString();
			const initialData = JSON.stringify({
				type: 'one-shot',
				channelId: 'channel-1',
				text: '原始消息',
				at: futureTime,
			});
			writeFileSync(eventFile, initialData);

			// 等待文件被读取
			setTimeout(() => {
				// 修改为 immediate 事件
				const modifiedData = JSON.stringify({
					type: 'immediate',
					channelId: 'channel-2',
					text: '修改后的消息',
				});
				writeFileSync(eventFile, modifiedData);

				setTimeout(() => {
					expect(onEventCallback).toHaveBeenCalledWith('channel-2', '修改后的消息');
					done();
				}, 200);
			}, 100);
		});

		it('检测到文件删除时取消调度', (done) => {
			watcher.start();

			const futureTime = new Date(Date.now() + 10000).toISOString();
			const eventFile = join(testEventsDir, 'delete-test.json');
			const eventData = JSON.stringify({
				type: 'one-shot',
				channelId: 'test-channel',
				text: '待删除的消息',
				at: futureTime,
			});
			writeFileSync(eventFile, eventData);

			// 等待文件被读取
			setTimeout(() => {
				// 删除文件
				unlinkSync(eventFile);

				setTimeout(() => {
					// 应该没有触发回调
					expect(onEventCallback).not.toHaveBeenCalled();
					done();
				}, 100);
			}, 100);
		});
	});

	describe('边界测试', () => {
		it('空目录正常启动', () => {
			watcher.start();
			expect(onEventCallback).not.toHaveBeenCalled();
		});

		it('scanExisting() 扫描现有文件', (done) => {
			// 在启动前创建文件
			const eventFile = join(testEventsDir, 'existing.json');
			const eventData = JSON.stringify({
				type: 'immediate',
				channelId: 'test-channel',
				text: '现有文件消息',
			});
			writeFileSync(eventFile, eventData);

			// 修改文件时间以确保被处理
			const now = new Date();
			const fs = require('fs');
			fs.utimesSync(eventFile, now, now);

			watcher.start();

			setTimeout(() => {
				expect(onEventCallback).toHaveBeenCalledWith('test-channel', '现有文件消息');
				done();
			}, 200);
		});

		it('忽略非 .json 文件', (done) => {
			watcher.start();

			const txtFile = join(testEventsDir, 'test.txt');
			writeFileSync(txtFile, 'not an event');

			setTimeout(() => {
				expect(existsSync(txtFile)).toBe(true);
				expect(onEventCallback).not.toHaveBeenCalled();
				done();
			}, 100);
		});
	});

	describe('stop() 清理', () => {
		it('stop() 清除所有定时器', (done) => {
			watcher.start();

			const futureTime = new Date(Date.now() + 5000).toISOString();
			const eventFile = join(testEventsDir, 'cleanup-test.json');
			const eventData = JSON.stringify({
				type: 'one-shot',
				channelId: 'test-channel',
				text: '清理测试',
				at: futureTime,
			});
			writeFileSync(eventFile, eventData);

			setTimeout(() => {
				watcher.stop();

				// 等待超过原定触发时间
				setTimeout(() => {
					expect(onEventCallback).not.toHaveBeenCalled();
					done();
				}, 1000);
			}, 100);
		});

		it('stop() 停止文件监控', (done) => {
			watcher.start();
			watcher.stop();

			const eventFile = join(testEventsDir, 'after-stop.json');
			const eventData = JSON.stringify({
				type: 'immediate',
				channelId: 'test-channel',
				text: '停止后的消息',
			});
			writeFileSync(eventFile, eventData);

			setTimeout(() => {
				expect(onEventCallback).not.toHaveBeenCalled();
				done();
			}, 200);
		});
	});
});
