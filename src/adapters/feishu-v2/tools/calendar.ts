/**
 * Feishu V2 Tools - Calendar
 *
 * 飞书日历工具
 */

import type * as lark from "@larksuiteoapi/node-sdk";

// ============================================================================
// Types
// ============================================================================

/**
 * 日历事件
 */
export interface CalendarEvent {
	eventId: string;
	calendarId: string;
	summary: string;
	description?: string;
	startTime: number;
	endTime: number;
	location?: string;
	status?: "confirmed" | "tentative" | "cancelled";
	organizer?: {
		userId: string;
		displayName?: string;
	};
	attendees?: Array<{
		userId: string;
		displayName?: string;
		status?: "accepted" | "declined" | "tentative" | "needsAction";
	}>;
	visibility?: "default" | "public" | "private";
	reminders?: Array<{
		method: "popup" | "email";
		minutes: number;
	}>;
	createTime?: number;
	updateTime?: number;
}

/**
 * 日历信息
 */
export interface CalendarInfo {
	calendarId: string;
	summary: string;
	description?: string;
	timeZone?: string;
	role?: "owner" | "writer" | "reader" | "freeBusyReader";
}

// ============================================================================
// Calendar Tool
// ============================================================================

/**
 * 飞书日历工具
 */
export class FeishuCalendarTool {
	private client: lark.Client;

	constructor(client: lark.Client) {
		this.client = client;
	}

	/**
	 * 获取日历列表
	 */
	async listCalendars(): Promise<CalendarInfo[]> {
		const result = await (this.client.calendar as any).calendar?.list?.({});

		if (result?.code !== 0) {
			throw new Error(`Failed to list calendars: ${result?.msg}`);
		}

		return (result.data?.calendars || []).map((item: any) => ({
			calendarId: item.calendar_id,
			summary: item.summary,
			description: item.description,
			timeZone: item.time_zone,
			role: item.role,
		}));
	}

	/**
	 * 获取日历信息
	 */
	async getCalendar(calendarId: string): Promise<CalendarInfo> {
		const result = await (this.client.calendar as any).calendar?.get?.({
			path: {
				calendar_id: calendarId,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to get calendar: ${result?.msg}`);
		}

		return {
			calendarId: result.data?.calendar?.calendar_id,
			summary: result.data?.calendar?.summary,
			description: result.data?.calendar?.description,
			timeZone: result.data?.calendar?.time_zone,
			role: result.data?.calendar?.role,
		};
	}

	/**
	 * 获取事件列表
	 */
	async listEvents(
		calendarId: string,
		options?: {
			startTime?: number;
			endTime?: number;
			pageSize?: number;
			pageToken?: string;
		},
	): Promise<{ events: CalendarEvent[]; pageToken?: string; hasMore: boolean }> {
		const result = await (this.client.calendar as any).calendarEvent?.list?.({
			path: {
				calendar_id: calendarId,
			},
			params: {
				start_time: options?.startTime,
				end_time: options?.endTime,
				page_size: options?.pageSize || 250,
				page_token: options?.pageToken,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to list events: ${result?.msg}`);
		}

		return {
			events: (result.data?.events || []).map((item: any) => this.parseEvent(item)),
			pageToken: result.data?.page_token,
			hasMore: result.data?.has_more || false,
		};
	}

	/**
	 * 获取事件详情
	 */
	async getEvent(calendarId: string, eventId: string): Promise<CalendarEvent> {
		const result = await (this.client.calendar as any).calendarEvent?.get?.({
			path: {
				calendar_id: calendarId,
				event_id: eventId,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to get event: ${result?.msg}`);
		}

		return this.parseEvent(result.data?.event);
	}

	/**
	 * 创建事件
	 */
	async createEvent(
		calendarId: string,
		options: {
			summary: string;
			description?: string;
			startTime: number;
			endTime: number;
			location?: string;
			attendees?: string[];
			visibility?: "default" | "public" | "private";
			reminders?: Array<{ method: "popup" | "email"; minutes: number }>;
		},
	): Promise<CalendarEvent> {
		const result = await (this.client.calendar as any).calendarEvent?.create?.({
			path: {
				calendar_id: calendarId,
			},
			data: {
				summary: options.summary,
				description: options.description,
				start_time: {
					unix_timestamp: options.startTime,
				},
				end_time: {
					unix_timestamp: options.endTime,
				},
				location: options.location,
				visibility: options.visibility,
				attendees: options.attendees?.map((id) => ({
					type: "user",
					user_id: id,
				})),
				reminder: options.reminders?.map((r) => ({
					method: r.method,
					minutes: r.minutes,
				})),
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to create event: ${result?.msg}`);
		}

		return this.parseEvent(result.data?.event);
	}

	/**
	 * 更新事件
	 */
	async updateEvent(
		calendarId: string,
		eventId: string,
		options: {
			summary?: string;
			description?: string;
			startTime?: number;
			endTime?: number;
			location?: string;
		},
	): Promise<CalendarEvent> {
		const result = await (this.client.calendar as any).calendarEvent?.patch?.({
			path: {
				calendar_id: calendarId,
				event_id: eventId,
			},
			data: {
				summary: options.summary,
				description: options.description,
				start_time: options.startTime ? { unix_timestamp: options.startTime } : undefined,
				end_time: options.endTime ? { unix_timestamp: options.endTime } : undefined,
				location: options.location,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to update event: ${result?.msg}`);
		}

		return this.parseEvent(result.data?.event);
	}

	/**
	 * 删除事件
	 */
	async deleteEvent(calendarId: string, eventId: string): Promise<void> {
		const result = await (this.client.calendar as any).calendarEvent?.delete?.({
			path: {
				calendar_id: calendarId,
				event_id: eventId,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to delete event: ${result?.msg}`);
		}
	}

	/**
	 * 搜索事件
	 */
	async searchEvents(
		options: {
			query: string;
			startTime?: number;
			endTime?: number;
			pageSize?: number;
			pageToken?: string;
		},
	): Promise<{ events: CalendarEvent[]; pageToken?: string; hasMore: boolean }> {
		const result = await (this.client.calendar as any).calendarEvent?.search?.({
			data: {
				query: options.query,
				start_time: options.startTime,
				end_time: options.endTime,
				page_size: options.pageSize || 250,
				page_token: options.pageToken,
			},
		});

		if (result?.code !== 0) {
			throw new Error(`Failed to search events: ${result?.msg}`);
		}

		return {
			events: (result.data?.events || []).map((item: any) => this.parseEvent(item)),
			pageToken: result.data?.page_token,
			hasMore: result.data?.has_more || false,
		};
	}

	// ==========================================================================
	// Helper Methods
	// ==========================================================================

	private parseEvent(data: any): CalendarEvent {
		return {
			eventId: data?.event_id,
			calendarId: data?.calendar_id,
			summary: data?.summary,
			description: data?.description,
			startTime: data?.start_time?.unix_timestamp || data?.start_time,
			endTime: data?.end_time?.unix_timestamp || data?.end_time,
			location: data?.location,
			status: data?.status,
			organizer: data?.organizer
				? {
						userId: data.organizer.user_id || data.organizer.id,
						displayName: data.organizer.display_name || data.organizer.name,
					}
				: undefined,
			attendees: (data?.attendees || []).map((a: any) => ({
				userId: a.user_id || a.id,
				displayName: a.display_name || a.name,
				status: a.status,
			})),
			visibility: data?.visibility,
			reminders: (data?.reminder || []).map((r: any) => ({
				method: r.method,
				minutes: r.minutes,
			})),
			createTime: data?.create_time,
			updateTime: data?.update_time,
		};
	}
}
