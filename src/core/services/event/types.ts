/**
 * Event Types - 事件类型定义
 */

/**
 * 即时事件
 */
export interface ImmediateEvent {
	type: "immediate";
	channelId: string;
	text: string;
}

/**
 * 一次性事件
 */
export interface OneShotEvent {
	type: "one-shot";
	channelId: string;
	text: string;
	at: string;
}

/**
 * 周期性事件
 */
export interface PeriodicEvent {
	type: "periodic";
	channelId: string;
	text: string;
	schedule: string;
	timezone: string;
}

/**
 * 调度事件
 */
export type ScheduledEvent = ImmediateEvent | OneShotEvent | PeriodicEvent;

/**
 * 事件回调函数
 */
export type EventCallback = (channelId: string, text: string) => Promise<void>;
