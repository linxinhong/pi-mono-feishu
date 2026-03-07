/**
 * Model Config Loader
 *
 * 模型配置加载器
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { ModelConfig, ModelsConfig } from "./types.js";

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MODELS: ModelsConfig = {
	default: "qwen",
	models: {
		qwen: {
			id: "qwen",
			name: "通义千问",
			provider: "dashscope",
			baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
			apiKeyEnv: "DASHSCOPE_API_KEY",
			model: "qwen-plus",
			capabilities: {
				vision: true,
				tools: true,
				streaming: true,
			},
			defaultParams: {
				temperature: 0.7,
				maxTokens: 4000,
			},
		},
		glm: {
			id: "glm",
			name: "智谱 GLM",
			provider: "zhipu",
			baseUrl: "https://open.bigmodel.cn/api/paas/v4",
			apiKeyEnv: "ZHIPU_API_KEY",
			model: "glm-4",
			capabilities: {
				vision: true,
				tools: true,
				streaming: true,
			},
			defaultParams: {
				temperature: 0.7,
				maxTokens: 4000,
			},
		},
		kimi: {
			id: "kimi",
			name: "Moonshot Kimi",
			provider: "moonshot",
			baseUrl: "https://api.moonshot.cn/v1",
			apiKeyEnv: "MOONSHOT_API_KEY",
			model: "moonshot-v1-8k",
			capabilities: {
				vision: false,
				tools: true,
				streaming: true,
			},
			defaultParams: {
				temperature: 0.7,
				maxTokens: 4000,
			},
		},
	},
};

// ============================================================================
// Model Config Loader
// ============================================================================

/**
 * 加载模型配置
 * @param configPath 配置文件路径
 * @returns 模型配置
 */
export function loadModelConfig(configPath: string): ModelsConfig {
	if (!existsSync(configPath)) {
		return DEFAULT_MODELS;
	}

	try {
		const content = readFileSync(configPath, "utf-8");
		const config = JSON.parse(content) as ModelsConfig;

		// 验证配置格式
		if (!config.models || Object.keys(config.models).length === 0) {
			console.warn(`[ModelConfig] Invalid models config in ${configPath}, using defaults`);
			return DEFAULT_MODELS;
		}

		return config;
	} catch (error) {
		console.warn(`[ModelConfig] Failed to load ${configPath}:`, error);
		return DEFAULT_MODELS;
	}
}

/**
 * 获取模型 API Key
 * @param config 模型配置
 * @returns API Key
 */
export function getModelApiKey(config: ModelConfig): string {
	// 优先使用配置中的 apiKey
	if (config.apiKey) {
		return config.apiKey;
	}

	// 从环境变量读取
	if (config.apiKeyEnv) {
		const apiKey = process.env[config.apiKeyEnv];
		if (apiKey) {
			return apiKey;
		}
	}

	throw new Error(`No API key found for model ${config.id}. Set ${config.apiKeyEnv} environment variable or provide apiKey in config.`);
}

/**
 * 解析模型规范
 * @param modelSpec 模型规范（如 "qwen", "dashscope/qwen-plus"）
 * @param config 模型配置
 * @returns 模型配置
 */
export function resolveModelSpec(modelSpec: string, config: ModelsConfig): ModelConfig {
	const slashIndex = modelSpec.indexOf("/");

	if (slashIndex !== -1) {
		const provider = modelSpec.substring(0, slashIndex);
		const modelId = modelSpec.substring(slashIndex + 1);

		// 查找匹配的模型
		for (const model of Object.values(config.models)) {
			if (model.provider === provider && model.model === modelId) {
				return model;
			}
		}
	}

	// 直接查找模型 ID
	const model = config.models[modelSpec];
	if (model) {
		return model;
	}

	// 未找到，返回默认模型
	console.warn(`[ModelConfig] Model not found: ${modelSpec}, using default: ${config.default}`);
	return config.models[config.default];
}
