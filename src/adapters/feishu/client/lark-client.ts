/**
 * Feishu / Lark SDK 客户端管理
 *
 * 提供 LarkClient - 统一管理 Lark SDK 客户端实例、WebSocket 连接、Bot 身份
 */

import * as Lark from "@larksuiteoapi/node-sdk";
import type { LarkAccount, LarkBrand, ProbeResult } from "../types.js";

// ============================================================================
// 常量
// ============================================================================

const BRAND_TO_DOMAIN: Record<string, Lark.Domain> = {
	feishu: Lark.Domain.Feishu,
	lark: Lark.Domain.Lark,
};

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 将品牌映射到 SDK domain 参数
 */
function resolveBrand(brand?: LarkBrand): string {
	if (!brand) return Lark.Domain.Feishu;
	return BRAND_TO_DOMAIN[brand] ?? brand.replace(/\/+$/, "");
}

/**
 * 创建带自定义 headers 的 HTTP 实例
 */
function createHttpInstanceWithHeaders(headers: Record<string, string>) {
	const base = Lark.defaultHttpInstance;
	const wrapper = Object.create(base);
	wrapper.request = ((opts: any) =>
		base.request({
			...opts,
			headers: {
				...opts?.headers,
				...headers,
			},
		})) as typeof base.request;
	return wrapper;
}

// ============================================================================
// LarkClient
// ============================================================================

/** 实例缓存（按 accountId） */
const cache = new Map<string, LarkClient>();

export class LarkClient {
	readonly account: LarkAccount;
	private _sdk: Lark.Client | null = null;
	private _wsClient: Lark.WSClient | null = null;
	private _botOpenId?: string;
	private _botName?: string;

	constructor(account: LarkAccount) {
		this.account = account;
	}

	/** 账户 ID 快捷访问 */
	get accountId(): string {
		return this.account.accountId;
	}

	/** Bot open_id（probe 后可用） */
	get botOpenId(): string | undefined {
		return this._botOpenId;
	}

	/** Bot 名称（probe 后可用） */
	get botName(): string | undefined {
		return this._botName;
	}

	/** WebSocket 是否已连接 */
	get wsConnected(): boolean {
		return this._wsClient !== null;
	}

	// ---- 静态工厂方法 ----

	/**
	 * 从账户获取（或创建）缓存的 LarkClient
	 */
	static fromAccount(account: LarkAccount): LarkClient {
		const existing = cache.get(account.accountId);
		if (
			existing &&
			existing.account.appId === account.appId &&
			existing.account.appSecret === account.appSecret
		) {
			return existing;
		}

		// 凭证变化 - 销毁旧实例
		if (existing) {
			existing.dispose();
		}

		const instance = new LarkClient(account);
		cache.set(account.accountId, instance);
		return instance;
	}

	/**
	 * 从凭证创建临时 LarkClient（不缓存）
	 */
	static fromCredentials(credentials: {
		appId: string;
		appSecret: string;
		accountId?: string;
		brand?: LarkBrand;
	}): LarkClient {
		const account: LarkAccount = {
			accountId: credentials.accountId ?? "default",
			enabled: true,
			configured: true,
			appId: credentials.appId,
			appSecret: credentials.appSecret,
			brand: credentials.brand ?? "feishu",
			config: {},
		};
		return new LarkClient(account);
	}

	/**
	 * 按 accountId 查找缓存实例
	 */
	static get(accountId: string): LarkClient | null {
		return cache.get(accountId) ?? null;
	}

	/**
	 * 清除缓存（单个或全部）
	 */
	static clearCache(accountId?: string): void {
		if (accountId !== undefined) {
			cache.get(accountId)?.dispose();
		} else {
			for (const inst of cache.values()) {
				inst.dispose();
			}
		}
	}

	// ---- SDK 客户端（懒加载） ----

	/** 懒加载的 Lark SDK 客户端 */
	get sdk(): Lark.Client {
		if (!this._sdk) {
			const { appId, appSecret } = this.requireCredentials();
			const httpHeaders = this.account.extra?.httpHeaders;
			const clientOpts: Lark.ClientConfig = {
				appId,
				appSecret,
				appType: Lark.AppType.SelfBuild,
				domain: resolveBrand(this.account.brand),
			};

			if (httpHeaders && Object.keys(httpHeaders).length > 0) {
				clientOpts.httpInstance = createHttpInstanceWithHeaders(httpHeaders);
			}

			this._sdk = new Lark.Client(clientOpts);
		}
		return this._sdk;
	}

	// ---- Bot 身份 ----

	/**
	 * 探测 Bot 身份
	 */
	async probe(): Promise<ProbeResult> {
		if (!this.account.appId || !this.account.appSecret) {
			return { ok: false, error: "missing credentials (appId, appSecret)" };
		}

		try {
			const res = await this.sdk.request({
				method: "GET",
				url: "/open-apis/bot/v3/info",
				data: {},
			});

			if (res.code !== 0) {
				return {
					ok: false,
					appId: this.account.appId,
					error: `API error: ${res.msg || `code ${res.code}`}`,
				};
			}

			const bot = (res as any).bot || (res as any).data?.bot;
			this._botOpenId = bot?.open_id;
			this._botName = bot?.bot_name;

			return {
				ok: true,
				appId: this.account.appId,
				botName: this._botName,
				botOpenId: this._botOpenId,
			};
		} catch (err) {
			return {
				ok: false,
				appId: this.account.appId,
				error: err instanceof Error ? err.message : String(err),
			};
		}
	}

	// ---- WebSocket 生命周期 ----

	/**
	 * 启动 WebSocket 事件监听
	 */
	async startWS(opts: {
		handlers: Record<string, (event: any) => Promise<void> | void>;
		abortSignal?: AbortSignal;
		autoProbe?: boolean;
	}): Promise<void> {
		const { handlers, abortSignal, autoProbe = true } = opts;

		if (autoProbe) {
			await this.probe();
		}

		const dispatcher = new Lark.EventDispatcher({
			encryptKey: this.account.encryptKey ?? "",
			verificationToken: this.account.verificationToken ?? "",
		});
		dispatcher.register(handlers);

		const { appId, appSecret } = this.requireCredentials();
		const httpHeaders = this.account.extra?.httpHeaders;

		// 关闭已存在的 WSClient
		if (this._wsClient) {
			try {
				this._wsClient.close({ force: true });
			} catch {
				// 忽略
			}
			this._wsClient = null;
		}

		const wsOpts: Lark.WSClientConfig = {
			appId,
			appSecret,
			domain: resolveBrand(this.account.brand),
			loggerLevel: Lark.LoggerLevel.info,
		};

		if (httpHeaders && Object.keys(httpHeaders).length > 0) {
			wsOpts.httpInstance = createHttpInstanceWithHeaders(httpHeaders);
		}

		this._wsClient = new Lark.WSClient(wsOpts);

		// Patch: 处理 card 类型消息
		const wsClientAny = this._wsClient as any;
		const origHandleEventData = wsClientAny.handleEventData?.bind(wsClientAny);
		if (origHandleEventData) {
			wsClientAny.handleEventData = (data: any) => {
				const msgType = data.headers?.find?.(
					(h: { key: string }) => h.key === "type"
				)?.value;
				if (msgType === "card") {
					const patchedData = {
						...data,
						headers: data.headers.map((h: { key: string; value: string }) =>
							h.key === "type" ? { ...h, value: "event" } : h
						),
					};
					return origHandleEventData(patchedData);
				}
				return origHandleEventData(data);
			};
		}

		await this.waitForAbort(dispatcher, abortSignal);
	}

	/**
	 * 断开 WebSocket 但保留缓存
	 */
	disconnect(): void {
		if (this._wsClient) {
			try {
				this._wsClient.close({ force: true });
			} catch {
				// 忽略
			}
		}
		this._wsClient = null;
	}

	/**
	 * 断开连接并从缓存移除
	 */
	dispose(): void {
		this.disconnect();
		cache.delete(this.accountId);
	}

	// ---- 私有方法 ----

	/** 断言凭证存在 */
	private requireCredentials(): { appId: string; appSecret: string } {
		const appId = this.account.appId;
		const appSecret = this.account.appSecret;
		if (!appId || !appSecret) {
			throw new Error(
				`LarkClient[${this.accountId}]: appId and appSecret are required`
			);
		}
		return { appId, appSecret };
	}

	/** 等待 abort 信号 */
	private waitForAbort(
		dispatcher: Lark.EventDispatcher,
		signal?: AbortSignal
	): Promise<void> {
		return new Promise((resolve, reject) => {
			if (signal?.aborted) {
				this.disconnect();
				return resolve();
			}

			signal?.addEventListener(
				"abort",
				() => {
					this.disconnect();
					resolve();
				},
				{ once: true }
			);

			try {
				void this._wsClient?.start({ eventDispatcher: dispatcher });
			} catch (err) {
				this.disconnect();
				reject(err);
			}
		});
	}
}
