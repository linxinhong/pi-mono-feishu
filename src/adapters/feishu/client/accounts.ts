/**
 * 飞书多账户管理
 *
 * 账户配置覆盖在 cfg.feishu.accounts 中
 * 每个账户可以覆盖顶级飞书配置字段，未设置的字段回退到顶级默认值
 */

import type {
	FeishuAdapterConfig,
	FeishuAccountConfig,
	LarkAccount,
	ConfiguredLarkAccount,
	UnconfiguredLarkAccount,
	LarkBrand,
} from "../types.js";

// ============================================================================
// 常量
// ============================================================================

export const DEFAULT_ACCOUNT_ID = "default";

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 规范化账户 ID
 */
export function normalizeAccountId(
	accountId?: string | null
): string | undefined {
	if (!accountId) return undefined;
	const trimmed = accountId.trim();
	return trimmed || undefined;
}

/**
 * 将 domain 字符串转换为 LarkBrand，默认为 "feishu"
 */
function toBrand(domain?: string): LarkBrand {
	return (domain as LarkBrand) ?? "feishu";
}

// ============================================================================
// 公共 API
// ============================================================================

/**
 * 获取配置中定义的所有账户 ID
 */
export function getLarkAccountIds(config?: FeishuAdapterConfig): string[] {
	if (!config?.accounts || config.accounts.length === 0) {
		return [DEFAULT_ACCOUNT_ID];
	}
	return config.accounts.map((a) => a.accountId);
}

/**
 * 获取默认账户 ID
 */
export function getDefaultLarkAccountId(config?: FeishuAdapterConfig): string {
	return getLarkAccountIds(config)[0];
}

/**
 * 解析单个账户配置
 */
export function getLarkAccount(
	config: FeishuAdapterConfig | undefined,
	accountId?: string
): LarkAccount {
	const requestedId =
		normalizeAccountId(accountId) ?? DEFAULT_ACCOUNT_ID;

	if (!config?.accounts || config.accounts.length === 0) {
		return {
			accountId: requestedId,
			enabled: false,
			configured: false,
			brand: "feishu",
			config: {},
		};
	}

	// 查找账户配置
	const accountConfig = config.accounts.find(
		(a) => a.accountId === requestedId
	);

	if (!accountConfig) {
		return {
			accountId: requestedId,
			enabled: false,
			configured: false,
			brand: "feishu",
			config: {},
		};
	}

	return accountConfigToLarkAccount(accountConfig);
}

/**
 * 将 FeishuAccountConfig 转换为 LarkAccount
 */
function accountConfigToLarkAccount(cfg: FeishuAccountConfig): LarkAccount {
	const { appId, appSecret } = cfg;
	const configured = !!(appId && appSecret);

	// 处理品牌
	let brand: LarkBrand;
	if (cfg.extra?.domain) {
		brand = `https://open.${cfg.extra.domain}`;
	} else {
		brand = toBrand(cfg.brand);
	}

	if (configured) {
		return {
			accountId: cfg.accountId,
			enabled: true,
			configured: true,
			name: cfg.name,
			appId: appId!,
			appSecret: appSecret!,
			encryptKey: cfg.encryptKey,
			verificationToken: cfg.verificationToken,
			brand,
			config: { ...cfg },
			extra: cfg.extra,
		} satisfies ConfiguredLarkAccount;
	}

	return {
		accountId: cfg.accountId,
		enabled: false,
		configured: false,
		name: cfg.name,
		appId,
		appSecret,
		encryptKey: cfg.encryptKey,
		verificationToken: cfg.verificationToken,
		brand,
		config: { ...cfg },
		extra: cfg.extra,
	} satisfies UnconfiguredLarkAccount;
}

/**
 * 获取所有已配置且启用的账户
 */
export function getEnabledLarkAccounts(
	config: FeishuAdapterConfig | undefined
): ConfiguredLarkAccount[] {
	const ids = getLarkAccountIds(config);
	const results: ConfiguredLarkAccount[] = [];

	for (const id of ids) {
		const account = getLarkAccount(config, id);
		if (account.enabled && account.configured) {
			results.push(account as ConfiguredLarkAccount);
		}
	}

	return results;
}

/**
 * 从配置片段提取 API 凭证
 */
export function getLarkCredentials(
	accountConfig?: FeishuAccountConfig
): {
	appId: string;
	appSecret: string;
	encryptKey?: string;
	verificationToken?: string;
	brand: LarkBrand;
} | null {
	if (!accountConfig) return null;

	const { appId, appSecret } = accountConfig;
	if (!appId || !appSecret) return null;

	return {
		appId,
		appSecret,
		encryptKey: accountConfig.encryptKey,
		verificationToken: accountConfig.verificationToken,
		brand: toBrand(accountConfig.brand),
	};
}

/**
 * 类型守卫：判断是否为已配置的账户
 */
export function isConfigured(
	account: LarkAccount
): account is ConfiguredLarkAccount {
	return account.configured;
}
