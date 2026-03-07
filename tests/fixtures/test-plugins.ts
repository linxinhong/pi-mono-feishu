/**
 * 测试用插件 Mock 工具
 */

import type { FeishuPlugin, PluginConfig, PluginInitContext, FeishuPluginContext, MessageEvent, PluginEvent } from '../../src/plugins/types.js';
import type { AgentTool } from '@mariozechner/pi-agent-core';

/**
 * 创建一个基础 Mock 插件
 */
export function createMockPlugin(overrides?: Partial<FeishuPlugin>): FeishuPlugin {
	return {
		meta: {
			id: 'test-plugin',
			name: 'Test Plugin',
			version: '1.0.0',
			description: 'A test plugin',
		},
		init: vi.fn().mockResolvedValue(undefined),
		destroy: vi.fn().mockResolvedValue(undefined),
		getTools: vi.fn().mockResolvedValue([]),
		onEvent: vi.fn().mockResolvedValue(undefined),
		preprocessMessage: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};
}

/**
 * 创建一个带依赖的 Mock 插件
 */
export function createPluginWithDependencies(dependencies: string[]): FeishuPlugin {
	return {
		meta: {
			id: `plugin-${dependencies.join('-') || 'independent'}`,
			name: `Plugin with deps: ${dependencies.join(', ')}`,
			version: '1.0.0',
			dependencies,
		},
		init: vi.fn().mockResolvedValue(undefined),
		destroy: vi.fn().mockResolvedValue(undefined),
		getTools: vi.fn().mockResolvedValue([]),
		onEvent: vi.fn().mockResolvedValue(undefined),
	};
}

/**
 * 创建一个会抛出错误的 Mock 插件
 */
export function createFailingPlugin(errorPhase: 'init' | 'destroy' | 'getTools' | 'onEvent'): FeishuPlugin {
	const plugin = createMockPlugin();
	switch (errorPhase) {
		case 'init':
			plugin.init = vi.fn().mockRejectedValue(new Error('Init failed'));
			break;
		case 'destroy':
			plugin.destroy = vi.fn().mockRejectedValue(new Error('Destroy failed'));
			break;
		case 'getTools':
			plugin.getTools = vi.fn().mockRejectedValue(new Error('Get tools failed'));
			break;
		case 'onEvent':
			plugin.onEvent = vi.fn().mockRejectedValue(new Error('Event handler failed'));
			break;
	}
	return plugin;
}

/**
 * 创建一个返回工具的 Mock 插件
 */
export function createPluginWithTools(tools: AgentTool<any>[]): FeishuPlugin {
	return {
		...createMockPlugin(),
		getTools: vi.fn().mockResolvedValue(tools),
	};
}

/**
 * 创建一个会过滤消息的 Mock 插件
 */
export function createMessageFilterPlugin(shouldFilter: boolean): FeishuPlugin {
	return {
		...createMockPlugin(),
		preprocessMessage: vi.fn().mockResolvedValue(shouldFilter ? null : ({} as MessageEvent)),
	};
}

/**
 * 创建 Mock 插件上下文
 */
export function createMockPluginContext(): FeishuPluginContext {
	return {
		message: {
			text: 'test message',
			rawText: 'test message',
			user: 'test-user',
			userName: 'Test User',
			channel: 'test-channel',
			ts: '1234567890.123456',
			attachments: [],
		},
		channelName: 'test-channel',
		channels: [],
		users: [],
		respond: vi.fn().mockResolvedValue(undefined),
		replaceMessage: vi.fn().mockResolvedValue(undefined),
		respondInThread: vi.fn().mockResolvedValue(undefined),
		setTyping: vi.fn().mockResolvedValue(undefined),
		setWorking: vi.fn().mockResolvedValue(undefined),
		uploadFile: vi.fn().mockResolvedValue(undefined),
		uploadImage: vi.fn().mockResolvedValue('image-key'),
		sendImage: vi.fn().mockResolvedValue('image-key'),
		sendVoiceMessage: vi.fn().mockResolvedValue('voice-key'),
		deleteMessage: vi.fn().mockResolvedValue(undefined),
		sendErrorCard: vi.fn().mockResolvedValue(undefined),
		workspaceDir: '/tmp/test-workspace',
		channelDir: '/tmp/test-workspace/test-channel',
	};
}

/**
 * 创建 Mock 初始化上下文
 */
export function createMockInitContext(config?: Partial<PluginConfig>): PluginInitContext {
	return {
		workspaceDir: '/tmp/test-workspace',
		config: {
			enabled: true,
			...config,
		},
		log: vi.fn(),
		sandboxConfig: { type: 'host' },
	};
}

/**
 * 创建 Mock 消息事件
 */
export function createMockMessageEvent(overrides?: Partial<MessageEvent>): MessageEvent {
	return {
		type: 'message',
		channel: 'test-channel',
		ts: '1234567890.123456',
		user: 'test-user',
		userName: 'Test User',
		text: 'test message',
		rawText: 'test message',
		attachments: [],
		...overrides,
	};
}

/**
 * 创建 Mock 系统事件
 */
export function createMockSystemEvent(action: 'startup' | 'shutdown' | 'error' = 'startup'): PluginEvent {
	return {
		type: 'system',
		action,
	};
}
