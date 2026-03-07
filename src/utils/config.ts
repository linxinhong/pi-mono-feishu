/**
 * Config - 配置管理
 */

import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { PluginsConfig } from "../plugins/types.js";
import type { SandboxConfig } from "../core/sandbox/index.js";

// ============================================================================
// 路径常量
// ============================================================================

/** 项目根目录 */
export const PROJECT_ROOT = join(homedir(), ".pi-claw");

/** 工作目录 (等同于项目根目录) */
export const WORKSPACE_DIR = PROJECT_ROOT;

/** 配置文件路径 */
export const CONFIG_FILE = join(PROJECT_ROOT, "config.json");

/** Agent 配置目录 */
export const AGENT_DIR = join(PROJECT_ROOT, "agent");

/** Boot 目录 (agent.md, soul.md 等) */
export const BOOT_DIR = join(PROJECT_ROOT, "boot");

/** Events 目录 (定时任务) */
export const EVENTS_DIR = join(PROJECT_ROOT, "events");

/** Logs 目录 */
export const LOGS_DIR = join(PROJECT_ROOT, "logs");

/** Memory 目录 */
export const MEMORY_DIR = join(PROJECT_ROOT, "memory");

/** Skills 目录 */
export const SKILLS_DIR = join(PROJECT_ROOT, "skills");

/** Channels 目录 */
export const CHANNELS_DIR = join(PROJECT_ROOT, "channels");

// ============================================================================
// 配置类型
// ============================================================================

/** 通用配置（保留字段，不应被平台配置覆盖） */
const RESERVED_CONFIG_KEYS = [
	"workspaceDir",
	"port",
	"plugins",
	"sandbox",
	"model",
] as const;

/** 通用配置 */
export interface CommonConfig {
	workspaceDir?: string;
	port?: number;
	plugins?: PluginsConfig;
	sandbox?: SandboxConfig;
	model?: string;
}

/** 平台配置基础接口 */
export interface PlatformConfigBase {
	/** adapter 级别默认模型 */
	model?: string;
}

/** 平台配置（任意平台可扩展） */
export interface PlatformConfig extends PlatformConfigBase {
	[key: string]: unknown;
}

/**
 * 完整应用配置
 *
 * 支持任意平台配置块，例如：
 * - feishu: { appId, appSecret, ... }
 * - wechat: { token, encodingAESKey, ... }
 *
 * 平台配置由各 adapter 自行定义和解析
 */
export interface AppConfig extends CommonConfig {
	/** 任意平台配置（索引签名） */
	[platform: string]: unknown;
}

/** 飞书平台配置（仅作文档参考，实际使用 PlatformConfig） */
export interface FeishuPlatformConfig extends PlatformConfig {
	appId: string;
	appSecret: string;
	useWebSocket?: boolean;
}

/** 微信平台配置（仅作文档参考，实际使用 PlatformConfig） */
export interface WechatPlatformConfig extends PlatformConfig {
	token: string;
	encodingAESKey: string;
	appId?: string;
}

/** @deprecated 使用 AppConfig 代替 */
export type FeishuConfig = AppConfig & FeishuPlatformConfig;

const DEFAULT_PLUGINS: PluginsConfig = {
	agent: { enabled: true },
	voice: { enabled: true, defaultVoice: "Cherry" },
	memory: { enabled: true, maxHistoryMessages: 10 },
	card: { enabled: true },
	event: { enabled: false },
};

export function loadConfig(configPath?: string): AppConfig {
	// 按优先级查找配置文件
	const searchPaths = [
		configPath,
		join(process.cwd(), "config.json"),
		CONFIG_FILE,
	].filter(Boolean) as string[];

	for (const path of searchPaths) {
		if (existsSync(path)) {
			try {
				const content = readFileSync(path, "utf-8");
				const config = JSON.parse(content) as AppConfig;
				console.log(`[Config] Loaded from ${path}`);
				return resolveConfig(config);
			} catch (error) {
				console.error(`[Config] Failed to load ${path}:`, error);
			}
		}
	}

	// 尝试从环境变量加载（兼容旧版配置）
	const envConfig = loadConfigFromEnv();
	const feishuEnv = envConfig.feishu as FeishuPlatformConfig | undefined;
	if (feishuEnv?.appId && feishuEnv?.appSecret) {
		console.log("[Config] Loaded from environment variables");
		return resolveConfig(envConfig);
	}

	throw new Error(
		`No configuration found. Create ${CONFIG_FILE} or set FEISHU_APP_ID and FEISHU_APP_SECRET environment variables.`,
	);
}

function loadConfigFromEnv(): AppConfig {
	return {
		model: process.env.FEISHU_MODEL || process.env.PI_MODEL,
		workspaceDir: process.env.FEISHU_WORKING_DIR,
		port: process.env.FEISHU_PORT ? parseInt(process.env.FEISHU_PORT, 10) : undefined,
		// 飞书配置从环境变量
		feishu: {
			appId: process.env.FEISHU_APP_ID || "",
			appSecret: process.env.FEISHU_APP_SECRET || "",
			useWebSocket: process.env.FEISHU_USE_WEBSOCKET !== "false",
		},
	};
}

function resolveConfig(config: AppConfig): AppConfig {
	// 合并默认插件配置
	const plugins: PluginsConfig = {
		...DEFAULT_PLUGINS,
		...config.plugins,
	};

	// 为每个插件合并默认值
	for (const [id, defaultConfig] of Object.entries(DEFAULT_PLUGINS)) {
		if (plugins[id]) {
			plugins[id] = { ...defaultConfig, ...plugins[id] };
		}
	}

	return {
		...config,
		plugins,
		workspaceDir: config.workspaceDir || WORKSPACE_DIR,
		port: config.port || 3000,
		// 确保飞书配置中的 useWebSocket 默认值
		feishu: config.feishu ? {
			useWebSocket: true,
			...config.feishu,
		} : undefined,
	};
}

// ============================================================================
// 路径获取函数
// ============================================================================

/** 获取默认工作目录 */
export function getDefaultWorkingDir(): string {
	return WORKSPACE_DIR;
}

/** 获取配置文件路径 */
export function getConfigFile(): string {
	return CONFIG_FILE;
}

/** 获取 Agent 目录 */
export function getAgentDir(): string {
	return AGENT_DIR;
}

/** 获取 Boot 目录 */
export function getBootDir(): string {
	return BOOT_DIR;
}

/** 获取 Events 目录 */
export function getEventsDir(): string {
	return EVENTS_DIR;
}

/** 获取 Logs 目录 */
export function getLogsDir(): string {
	return LOGS_DIR;
}

/** 获取 Memory 目录 */
export function getMemoryDir(): string {
	return MEMORY_DIR;
}

/** 获取 Skills 目录 */
export function getSkillsDir(): string {
	return SKILLS_DIR;
}

/** 获取 Channels 目录 */
export function getChannelsDir(): string {
	return CHANNELS_DIR;
}

/** 获取指定频道的目录 */
export function getChannelDir(channelId: string): string {
	return join(CHANNELS_DIR, channelId);
}

// ============================================================================
// 平台配置工具
// ============================================================================

/** 保留的配置键名（非平台配置） */
export const RESERVED_KEYS = RESERVED_CONFIG_KEYS;

/**
 * 获取已配置的平台列表
 *
 * 自动检测配置中的平台配置块（排除保留字段）
 * 或者根据提供的已知平台列表进行匹配
 *
 * @param config 应用配置
 * @param knownPlatforms 可选的已知平台列表（从 adapterRegistry 获取）
 * @returns 已配置的平台 ID 数组
 */
export function getConfiguredPlatforms(
	config: AppConfig,
	knownPlatforms?: string[],
): string[] {
	const platforms: string[] = [];

	if (knownPlatforms && knownPlatforms.length > 0) {
		// 如果提供了已知平台列表，只匹配这些平台
		for (const platform of knownPlatforms) {
			if (config[platform] && typeof config[platform] === "object") {
				platforms.push(platform);
			}
		}
	} else {
		// 自动检测：排除保留字段，其余为平台配置
		for (const [key, value] of Object.entries(config)) {
			if (!RESERVED_KEYS.includes(key as typeof RESERVED_CONFIG_KEYS[number])) {
				if (value && typeof value === "object") {
					platforms.push(key);
				}
			}
		}
	}

	return platforms;
}
