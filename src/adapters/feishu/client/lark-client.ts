/**
 * Feishu SDK 客户端封装
 */

import * as lark from "@larksuiteoapi/node-sdk";

// ============================================================================
// 类型
// ============================================================================

export interface LarkClientConfig {
	appId: string;
	appSecret: string;
	domain?: string;
}

export interface ProbeResult {
	ok: boolean;
	appId?: string;
	botName?: string;
	botOpenId?: string;
	error?: string;
}

// ============================================================================
// LarkClient
// ============================================================================

export class LarkClient {
	private client: lark.Client;
	public botOpenId?: string;
	public botName?: string;

	private constructor(config: LarkClientConfig) {
		this.client = new lark.Client({
			appId: config.appId,
			appSecret: config.appSecret,
			domain: config.domain as lark.Domain,
		});
	}

	static fromAccount(account: { appId: string; appSecret: string; brand?: string; extra?: { domain?: string } }): LarkClient {
		const domain = account.brand === "lark" ? lark.Domain.Lark : lark.Domain.Feishu;
		return new LarkClient({
			appId: account.appId,
			appSecret: account.appSecret,
			domain,
		});
	}

	/**
	 * 探测 Bot 身份
	 */
	async probe(): Promise<ProbeResult> {
		try {
			const result = await this.client.im.bot.getInfo({
				path: { bot_id: "cli_" + this.client.appId }
			})

			if (result.data?.bot) {
				this.botOpenId = result.data.bot.open_id
				this.botName = result.data.bot.app_name
				return {
					ok: true,
					appId: this.client.appId,
					botName: this.botName,
					botOpenId: this.botOpenId,
				}
			}

			return { ok: true, appId: this.client.appId }
		} catch (error) {
			return {
				ok: false,
				error: error instanceof Error ? error.message : String(error),
			}
		}
	}

	/**
	 * 获取 SDK 客户端
	 */
	getClient(): lark.Client {
		return this.client
	}

	/**
	 * 断开连接
	 */
	disconnect(): void {
		// 清理资源
	}
}
