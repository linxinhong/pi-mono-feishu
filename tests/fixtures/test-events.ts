/**
 * 测试用事件数据
 */

import type { MessageEvent, ScheduledEvent, SystemEvent } from '../../src/plugins/types.js';

/**
 * 创建测试用的消息事件
 */
export function createTestMessageEvent(overrides?: Partial<MessageEvent>): MessageEvent {
	return {
		type: 'message',
		channel: 'oc_test_channel_id',
		ts: '1234567890.123456',
		user: 'ou_test_user_id',
		userName: 'Test User',
		text: 'Hello, bot!',
		rawText: 'Hello, bot!',
		attachments: [],
		...overrides,
	};
}

/**
 * 创建测试用的图片消息事件
 */
export function createImageMessageEvent(overrides?: Partial<MessageEvent>): MessageEvent {
	return {
		type: 'message',
		channel: 'oc_test_channel_id',
		ts: '1234567890.123456',
		user: 'ou_test_user_id',
		userName: 'Test User',
		text: '[图片]',
		rawText: '<at user_id="ou_test_user_id"></at> [图片]',
		attachments: [
			{
				original: 'image_v1_test_key',
				local: 'attachments/test_image.jpg',
			},
		],
		...overrides,
	};
}

/**
 * 创建测试用的文件消息事件
 */
export function createFileMessageEvent(overrides?: Partial<MessageEvent>): MessageEvent {
	return {
		type: 'message',
		channel: 'oc_test_channel_id',
		ts: '1234567890.123456',
		user: 'ou_test_user_id',
		userName: 'Test User',
		text: '[文件]',
		rawText: '[文件]',
		attachments: [
			{
				original: 'file_v1_test_key',
				local: 'attachments/test_file.pdf',
			},
		],
		...overrides,
	};
}

/**
 * 创建测试用的语音消息事件
 */
export function createVoiceMessageEvent(overrides?: Partial<MessageEvent>): MessageEvent {
	return {
		type: 'message',
		channel: 'oc_test_channel_id',
		ts: '1234567890.123456',
		user: 'ou_test_user_id',
		userName: 'Test User',
		text: '[语音]',
		rawText: '[语音]',
		attachments: [
			{
				original: 'voice_v1_test_key',
				local: 'attachments/test_voice.ogg',
			},
		],
		...overrides,
	};
}

/**
 * 创建测试用的定时事件
 */
export function createTestScheduledEvent(overrides?: Partial<ScheduledEvent>): ScheduledEvent {
	return {
		type: 'scheduled',
		channel: 'oc_test_channel_id',
		eventId: 'test_event_id',
		eventType: 'periodic',
		scheduleInfo: '0 9 * * 1-5',
		text: 'Daily reminder',
		...overrides,
	};
}

/**
 * 创建测试用的一次性事件
 */
export function createOneShotEvent(scheduledTime: string): ScheduledEvent {
	return {
		type: 'scheduled',
		channel: 'oc_test_channel_id',
		eventId: 'one_shot_test_id',
		eventType: 'one-shot',
		scheduleInfo: scheduledTime,
		text: 'One-time reminder',
	};
}

/**
 * 创建测试用的立即事件
 */
export function createImmediateEvent(): ScheduledEvent {
	return {
		type: 'scheduled',
		channel: 'oc_test_channel_id',
		eventId: 'immediate_test_id',
		eventType: 'immediate',
		scheduleInfo: '',
		text: 'Immediate action',
	};
}

/**
 * 创建测试用的系统启动事件
 */
export function createStartupEvent(): SystemEvent {
	return {
		type: 'system',
		action: 'startup',
	};
}

/**
 * 创建测试用的系统关闭事件
 */
export function createShutdownEvent(): SystemEvent {
	return {
		type: 'system',
		action: 'shutdown',
	};
}

/**
 * 创建测试用的系统错误事件
 */
export function createErrorEvent(error: Error): SystemEvent {
	return {
		type: 'system',
		action: 'error',
		error,
	};
}

/**
 * 旧消息事件（用于测试过滤）
 */
export function createOldMessageEvent(): MessageEvent {
	const oldDate = new Date();
	oldDate.setHours(oldDate.getHours() - 25); // 超过24小时

	return {
		type: 'message',
		channel: 'oc_test_channel_id',
		ts: `${Math.floor(oldDate.getTime() / 1000)}.000000`,
		user: 'ou_test_user_id',
		userName: 'Test User',
		text: 'Old message',
		rawText: 'Old message',
		attachments: [],
	};
}
