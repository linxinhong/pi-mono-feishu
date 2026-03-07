/**
 * PluginManager 单元测试
 *
 * 测试插件管理器功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginManager } from '../../../src/core/plugin/manager.js';
import type { FeishuPlugin, PluginConfig, PluginsConfig, FeishuPluginContext, PluginEvent } from '../../../src/plugins/types.js';
import type { AgentTool } from '@mariozechner/pi-agent-core';

// Mock 插件工厂
const createMockPlugin = (id: string, name: string, dependencies?: string[]): FeishuPlugin => ({
	meta: {
		id,
		name,
		version: '1.0.0',
		description: `Mock plugin ${name}`,
		dependencies,
	},
});

const createPluginWithHooks = (
	id: string,
	name: string,
	hooks: {
		init?: (ctx: any) => Promise<void> | void;
		destroy?: () => Promise<void> | void;
		getTools?: (ctx: any) => AgentTool<any>[] | Promise<AgentTool<any>[]>;
		onEvent?: (event: PluginEvent, ctx: any) => Promise<void> | void;
		preprocessMessage?: (event: any, ctx: any) => Promise<any> | any;
	},
	dependencies?: string[]
): FeishuPlugin => ({
	meta: {
		id,
		name,
		version: '1.0.0',
		dependencies,
	},
	...hooks,
});

describe('PluginManager', () => {
	let manager: PluginManager;
	let pluginsConfig: PluginsConfig;
	let mockWorkspaceDir: string;

	beforeEach(() => {
		mockWorkspaceDir = '/tmp/test-workspace';

		pluginsConfig = {
			'plugin-a': { enabled: true },
			'plugin-b': { enabled: true, customSetting: 'value' },
			'plugin-c': { enabled: false },
		};

		manager = new PluginManager({
			workspaceDir: mockWorkspaceDir,
			pluginsConfig,
		});
	});

	describe('插件注册', () => {
		it('register() 注册单个插件', () => {
			const plugin = createMockPlugin('test-plugin', 'Test Plugin');
			manager.register(plugin);

			const retrieved = manager.getPlugin('test-plugin');
			expect(retrieved).toBe(plugin);
		});

		it('register() 替换已存在的插件', () => {
			const plugin1 = createMockPlugin('test', 'Plugin 1');
			const plugin2 = createMockPlugin('test', 'Plugin 2');

			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			manager.register(plugin1);
			manager.register(plugin2);

			const retrieved = manager.getPlugin('test');
			expect(retrieved).toBe(plugin2);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('already registered')
			);

			consoleSpy.mockRestore();
		});

		it('registerAll() 批量注册插件', () => {
			const plugin1 = createMockPlugin('p1', 'Plugin 1');
			const plugin2 = createMockPlugin('p2', 'Plugin 2');
			const plugin3 = createMockPlugin('p3', 'Plugin 3');

			manager.registerAll([plugin1, plugin2, plugin3]);

			expect(manager.getAllPlugins().length).toBe(3);
			expect(manager.getPlugin('p1')).toBe(plugin1);
			expect(manager.getPlugin('p2')).toBe(plugin2);
			expect(manager.getPlugin('p3')).toBe(plugin3);
		});
	});

	describe('插件查询', () => {
		beforeEach(() => {
			const plugin1 = createMockPlugin('enabled-1', 'Enabled 1');
			const plugin2 = createMockPlugin('enabled-2', 'Enabled 2');
			const plugin3 = createMockPlugin('disabled-1', 'Disabled 1');

			manager.registerAll([plugin1, plugin2, plugin3]);

			// 更新配置
			pluginsConfig['enabled-1'] = { enabled: true };
			pluginsConfig['enabled-2'] = { enabled: true };
			pluginsConfig['disabled-1'] = { enabled: false };
		});

		it('getPlugin() 获取指定插件', () => {
			const plugin = manager.getPlugin('enabled-1');
			expect(plugin).toBeDefined();
			expect(plugin?.meta.name).toBe('Enabled 1');
		});

		it('getPlugin() 获取不存在的插件返回 undefined', () => {
			const plugin = manager.getPlugin('non-existent');
			expect(plugin).toBeUndefined();
		});

		it('getAllPlugins() 返回所有插件', () => {
			const allPlugins = manager.getAllPlugins();
			expect(allPlugins.length).toBe(3);
		});

		it('getEnabledPlugins() 只返回启用的插件', () => {
			const enabledPlugins = manager.getEnabledPlugins();
			expect(enabledPlugins.length).toBe(2);
			expect(enabledPlugins.every(p => pluginsConfig[p.meta.id].enabled)).toBe(true);
		});
	});

	describe('插件配置', () => {
		it('getPluginConfig() 返回插件配置', () => {
			const config = manager.getPluginConfig('plugin-a');
			expect(config).toEqual({ enabled: true });
		});

		it('getPluginConfig() 返回自定义配置', () => {
			const config = manager.getPluginConfig('plugin-b');
			expect(config.customSetting).toBe('value');
		});

		it('getPluginConfig() 对未配置的插件返回默认配置', () => {
			const config = manager.getPluginConfig('new-plugin');
			expect(config).toEqual({ enabled: false });
		});
	});

	describe('插件初始化', () => {
		it('initialize() 调用插件的 init 钩子', async () => {
			const initSpy = vi.fn();
			const plugin = createPluginWithHooks('test', 'Test', { init: initSpy });

			pluginsConfig['test'] = { enabled: true };
			manager.register(plugin);

			await manager.initialize();

			expect(initSpy).toHaveBeenCalledTimes(1);
			expect(initSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					workspaceDir: mockWorkspaceDir,
					config: { enabled: true },
				})
			);
		});

		it('initialize() 按依赖顺序初始化插件', async () => {
			const order: string[] = [];

			const pluginA = createPluginWithHooks('a', 'A', {
				init: async () => { order.push('a'); },
			});
			const pluginB = createPluginWithHooks('b', 'B', {
				init: async () => { order.push('b'); },
				dependencies: ['a'],
			});
			const pluginC = createPluginWithHooks('c', 'C', {
				init: async () => { order.push('c'); },
				dependencies: ['b'],
			});

			pluginsConfig['a'] = { enabled: true };
			pluginsConfig['b'] = { enabled: true };
			pluginsConfig['c'] = { enabled: true };

			manager.registerAll([pluginA, pluginB, pluginC]); // 按顺序注册

			await manager.initialize();

			expect(order).toEqual(['a', 'b', 'c']);
		});

		it('initialize() 跳过未启用的插件', async () => {
			const initSpy = vi.fn();
			const plugin = createPluginWithHooks('disabled', 'Disabled', { init: initSpy });

			pluginsConfig['disabled'] = { enabled: false };
			manager.register(plugin);

			await manager.initialize();

			expect(initSpy).not.toHaveBeenCalled();
		});

		it('initialize() 依赖未启用时抛出错误', async () => {
			const plugin = createPluginWithHooks('dependent', 'Dependent', {}, ['missing-dep']);

			pluginsConfig['dependent'] = { enabled: true };
			pluginsConfig['missing-dep'] = { enabled: false };
			manager.register(plugin);

			await expect(manager.initialize()).rejects.toThrow('missing-dep');
		});

		it('initialize() 依赖未注册时抛出错误', async () => {
			const plugin = createPluginWithHooks('orphan', 'Orphan', {}, ['non-existent']);

			pluginsConfig['orphan'] = { enabled: true };
			manager.register(plugin);

			await expect(manager.initialize()).rejects.toThrow('non-existent');
		});

		it('initialize() 只初始化一次', async () => {
			const initSpy = vi.fn();
			const plugin = createPluginWithHooks('test', 'Test', { init: initSpy });

			pluginsConfig['test'] = { enabled: true };
			manager.register(plugin);

			await manager.initialize();
			await manager.initialize();

			expect(initSpy).toHaveBeenCalledTimes(1);
		});

		it('initialize() init 失败时抛出错误', async () => {
			const plugin = createPluginWithHooks('failing', 'Failing', {
				init: async () => { throw new Error('Init failed'); },
			});

			pluginsConfig['failing'] = { enabled: true };
			manager.register(plugin);

			await expect(manager.initialize()).rejects.toThrow('Init failed');
		});
	});

	describe('插件销毁', () => {
		it('destroy() 调用插件的 destroy 钩子', async () => {
			const destroySpy = vi.fn();
			const plugin = createPluginWithHooks('test', 'Test', { destroy: destroySpy });

			pluginsConfig['test'] = { enabled: true };
			manager.register(plugin);
			await manager.initialize();

			await manager.destroy();

			expect(destroySpy).toHaveBeenCalledTimes(1);
		});

		it('destroy() 错误不阻止其他插件销毁', async () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const plugin1 = createPluginWithHooks('p1', 'P1', {
				destroy: async () => { throw new Error('Destroy error'); },
			});
			const plugin2 = createPluginWithHooks('p2', 'P2', {
				destroy: vi.fn(),
			});

			pluginsConfig['p1'] = { enabled: true };
			pluginsConfig['p2'] = { enabled: true };
			manager.registerAll([plugin1, plugin2]);
			await manager.initialize();

			await manager.destroy();

			expect(plugin2.destroy).toHaveBeenCalled();
			expect(consoleSpy).toHaveBeenCalled();

			consoleSpy.mockRestore();
		});
	});

	describe('工具聚合', () => {
		it('getTools() 返回所有启用插件的工具', async () => {
			const mockContext = {} as FeishuPluginContext;

			const tool1: AgentTool = { name: 'tool1', description: '', params: {}, execute: async () => ({}) };
			const tool2: AgentTool = { name: 'tool2', description: '', params: {}, execute: async () => ({}) };

			const plugin1 = createPluginWithHooks('p1', 'P1', {
				getTools: async () => [tool1],
			});
			const plugin2 = createPluginWithHooks('p2', 'P2', {
				getTools: async () => [tool2],
			});

			pluginsConfig['p1'] = { enabled: true };
			pluginsConfig['p2'] = { enabled: true };
			manager.registerAll([plugin1, plugin2]);
			await manager.initialize();

			const tools = await manager.getTools(mockContext);

			expect(tools).toContain(tool1);
			expect(tools).toContain(tool2);
		});

		it('getTools() 跳过未启用的插件', async () => {
			const mockContext = {} as FeishuPluginContext;

			const tool: AgentTool = { name: 'tool1', description: '', params: {}, execute: async () => ({}) };

			const plugin = createPluginWithHooks('disabled', 'Disabled', {
				getTools: async () => [tool],
			});

			pluginsConfig['disabled'] = { enabled: false };
			manager.register(plugin);
			await manager.initialize();

			const tools = await manager.getTools(mockContext);

			expect(tools).not.toContain(tool);
		});

		it('getTools() 错误被捕获并记录', async () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const mockContext = {} as FeishuPluginContext;

			const tool: AgentTool = { name: 'tool1', description: '', params: {}, execute: async () => ({}) };

			const plugin1 = createPluginWithHooks('p1', 'P1', {
				getTools: async () => { throw new Error('Tools error'); },
			});
			const plugin2 = createPluginWithHooks('p2', 'P2', {
				getTools: async () => [tool],
			});

			pluginsConfig['p1'] = { enabled: true };
			pluginsConfig['p2'] = { enabled: true };
			manager.registerAll([plugin1, plugin2]);
			await manager.initialize();

			const tools = await manager.getTools(mockContext);

			expect(tools).toContain(tool);
			expect(consoleSpy).toHaveBeenCalled();

			consoleSpy.mockRestore();
		});
	});

	describe('消息预处理', () => {
		it('preprocessMessage() 按顺序调用插件', async () => {
			const mockContext = {} as FeishuPluginContext;
			const mockEvent: any = { type: 'message', text: 'test' };

			const preprocessSpy1 = vi.fn(async (e: any) => e);
			const preprocessSpy2 = vi.fn(async (e: any) => e);

			const plugin1 = createPluginWithHooks('p1', 'P1', {
				preprocessMessage: preprocessSpy1,
			});
			const plugin2 = createPluginWithHooks('p2', 'P2', {
				preprocessMessage: preprocessSpy2,
			});

			pluginsConfig['p1'] = { enabled: true };
			pluginsConfig['p2'] = { enabled: true };
			manager.registerAll([plugin1, plugin2]);
			await manager.initialize();

			const result = await manager.preprocessMessage(mockEvent, mockContext);

			expect(preprocessSpy1).toHaveBeenCalledWith(mockEvent, mockContext);
			expect(preprocessSpy2).toHaveBeenCalled();
			expect(result).toBe(mockEvent);
		});

		it('preprocessMessage() 返回 null 时终止处理', async () => {
			const mockContext = {} as FeishuPluginContext;
			const mockEvent: any = { type: 'message', text: 'test' };

			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			const plugin1 = createPluginWithHooks('p1', 'P1', {
				preprocessMessage: async () => null, // 过滤消息
			});
			const plugin2 = createPluginWithHooks('p2', 'P2', {
				preprocessMessage: vi.fn(),
			});

			pluginsConfig['p1'] = { enabled: true };
			pluginsConfig['p2'] = { enabled: true };
			manager.registerAll([plugin1, plugin2]);
			await manager.initialize();

			const result = await manager.preprocessMessage(mockEvent, mockContext);

			expect(result).toBeNull();
			expect(plugin2.preprocessMessage).not.toHaveBeenCalled();
			expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('filtered'));

			consoleSpy.mockRestore();
		});

		it('preprocessMessage() 错误被捕获并继续', async () => {
			const mockContext = {} as FeishuPluginContext;
			const mockEvent: any = { type: 'message', text: 'test' };

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const plugin1 = createPluginWithHooks('p1', 'P1', {
				preprocessMessage: async () => { throw new Error('Error'); },
			});
			const plugin2 = createPluginWithHooks('p2', 'P2', {
				preprocessMessage: async (e: any) => ({ ...e, modified: true }),
			});

			pluginsConfig['p1'] = { enabled: true };
			pluginsConfig['p2'] = { enabled: true };
			manager.registerAll([plugin1, plugin2]);
			await manager.initialize();

			const result = await manager.preprocessMessage(mockEvent, mockContext);

			expect(result).toHaveProperty('modified', true);
			expect(consoleSpy).toHaveBeenCalled();

			consoleSpy.mockRestore();
		});
	});

	describe('事件分发', () => {
		it('dispatchEvent() 调用所有插件的 onEvent', async () => {
			const mockContext = {} as FeishuPluginContext;
			const mockEvent: PluginEvent = { type: 'system', action: 'startup' };

			const onEventSpy1 = vi.fn();
			const onEventSpy2 = vi.fn();

			const plugin1 = createPluginWithHooks('p1', 'P1', { onEvent: onEventSpy1 });
			const plugin2 = createPluginWithHooks('p2', 'P2', { onEvent: onEventSpy2 });

			pluginsConfig['p1'] = { enabled: true };
			pluginsConfig['p2'] = { enabled: true };
			manager.registerAll([plugin1, plugin2]);
			await manager.initialize();

			await manager.dispatchEvent(mockEvent, mockContext);

			expect(onEventSpy1).toHaveBeenCalledWith(mockEvent, mockContext);
			expect(onEventSpy2).toHaveBeenCalledWith(mockEvent, mockContext);
		});

		it('dispatchEvent() 错误不阻止其他插件', async () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const mockContext = {} as FeishuPluginContext;
			const mockEvent: PluginEvent = { type: 'system', action: 'startup' };

			const plugin1 = createPluginWithHooks('p1', 'P1', {
				onEvent: async () => { throw new Error('Event error'); },
			});
			const plugin2 = createPluginWithHooks('p2', 'P2', {
				onEvent: vi.fn(),
			});

			pluginsConfig['p1'] = { enabled: true };
			pluginsConfig['p2'] = { enabled: true };
			manager.registerAll([plugin1, plugin2]);
			await manager.initialize();

			await manager.dispatchEvent(mockEvent, mockContext);

			expect(plugin2.onEvent).toHaveBeenCalled();
			expect(consoleSpy).toHaveBeenCalled();

			consoleSpy.mockRestore();
		});
	});

	describe('状态检查', () => {
		it('isInitialized() 初始化前返回 false', () => {
			expect(manager.isInitialized()).toBe(false);
		});

		it('isInitialized() 初始化后返回 true', async () => {
			const plugin = createMockPlugin('test', 'Test');
			pluginsConfig['test'] = { enabled: true };
			manager.register(plugin);

			await manager.initialize();

			expect(manager.isInitialized()).toBe(true);
		});

		it('isInitialized() 销毁后返回 false', async () => {
			const plugin = createMockPlugin('test', 'Test');
			pluginsConfig['test'] = { enabled: true };
			manager.register(plugin);

			await manager.initialize();
			await manager.destroy();

			expect(manager.isInitialized()).toBe(false);
		});
	});
});
