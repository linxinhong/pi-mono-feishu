/**
 * 飞书 Lark 客户端 Mock
 */

import { vi } from 'vitest';

/**
 * 创建 Mock Lark 客户端
 */
export function createMockLarkClient() {
	return {
		im: {
			message: {
				// 发送消息
				create: vi.fn().mockResolvedValue({
					code: 0,
					msg: 'success',
					data: {
						message_id: 'mock_msg_id',
					},
				}),
				// 更新消息
				patch: vi.fn().mockResolvedValue({
					code: 0,
					msg: 'success',
				}),
				// 删除消息
				delete: vi.fn().mockResolvedValue({
					code: 0,
					msg: 'success',
				}),
				// 在线程中回复
				reply: vi.fn().mockResolvedValue({
					code: 0,
					msg: 'success',
					data: {
						message_id: 'mock_reply_id',
					},
				}),
			},
			// 获取频道列表
			chat: {
				list: vi.fn().mockResolvedValue({
					code: 0,
					msg: 'success',
					data: {
						items: [
							{
								chat_id: 'test-channel-1',
								name: '测试频道1',
								description: '测试频道描述',
							},
							{
								chat_id: 'test-channel-2',
								name: '测试频道2',
								description: '测试频道描述2',
							},
						],
						page_token: null,
					},
				}),
				// 获取频道信息
				get: vi.fn().mockResolvedValue({
					code: 0,
					msg: 'success',
					data: {
						chat_id: 'test-channel',
						name: '测试频道',
						description: '测试频道描述',
					},
				}),
			},
			// 文件上传
			file: {
				create: vi.fn().mockResolvedValue({
					code: 0,
					msg: 'success',
					data: {
						file_key: 'mock_file_key',
					},
				}),
				// 获取文件下载链接
				get: vi.fn().mockResolvedValue({
					code: 0,
					msg: 'success',
					data: {
						url: 'https://mock-file-url.com/file.txt',
						token: 'mock_token',
						type: 'file',
					},
				}),
			},
			// 图片上传
			image: {
				create: vi.fn().mockResolvedValue({
					code: 0,
					msg: 'success',
					data: {
						image_key: 'mock_image_key',
					},
				}),
				// 获取图片
				get: vi.fn().mockReturnValue({
					getReadableStream: () => {
						const { Readable } = require('stream');
						return Readable.from(Buffer.from('mock image data'));
					},
				}),
			},
		},
		contact: {
			// 获取用户列表
			user: {
				list: vi.fn().mockResolvedValue({
					code: 0,
					msg: 'success',
					data: {
						items: [
							{
								user_id: 'test-user-1',
								name: '测试用户1',
								en_name: 'Test User 1',
							},
							{
								user_id: 'test-user-2',
								name: '测试用户2',
								en_name: 'Test User 2',
							},
						],
						page_token: null,
					},
				}),
				// 获取用户信息
				get: vi.fn().mockResolvedValue({
					code: 0,
					msg: 'success',
					data: {
						user: {
							user_id: 'test-user',
							name: '测试用户',
							en_name: 'Test User',
							avatar: {
									avatar_72: 'https://mock-avatar.com/avatar.jpg',
							},
						},
					},
				}),
			},
		},
		// 获取访问令牌
		auth: {
			getTenantAccessToken: vi.fn().mockResolvedValue({
				code: 0,
				msg: 'success',
				tenant_access_token: 'mock_tenant_access_token',
				expire: 7200,
			}),
		},
		// 获取机器人信息
		getUserInfo: vi.fn().mockResolvedValue({
			code: 0,
			msg: 'success',
			data: {
				user: {
					user_id: 'bot-id',
					name: 'Test Bot',
					en_name: 'Test Bot',
				},
			},
		}),
	};
}

/**
 * 创建 Mock Lark 客户端（带错误）
 */
export function createMockLarkClientWithError(method: string, error: Error) {
	const client = createMockLarkClient();

	const methods = method.split('.');
	let target: any = client;
	for (const key of methods.slice(0, -1)) {
		target = target[key];
	}
	target[methods[methods.length - 1]] = vi.fn().mockRejectedValue(error);

	return client;
}

/**
 * 创建 Mock Lark 客户端（带特定返回值）
 */
export function createMockLarkClientWithResponse(method: string, response: any) {
	const client = createMockLarkClient();

	const methods = method.split('.');
	let target: any = client;
	for (const key of methods.slice(0, -1)) {
		target = target[key];
	}
	target[methods[methods.length - 1]] = vi.fn().mockResolvedValue(response);

	return client;
}
