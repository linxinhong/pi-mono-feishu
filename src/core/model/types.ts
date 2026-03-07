/**
 * Model Types
 *
 * 模型相关的类型定义
 */

// ============================================================================
// Types
// ============================================================================

/**
 * 模型能力声明
 */
export interface ModelCapabilities {
	/** 是否支持视觉 */
	vision?: boolean;
	/** 是否支持工具调用 */
	tools?: boolean;
	/** 是否支持流式输出 */
	streaming?: boolean;
}

/**
 * 模型默认参数
 */
export interface ModelDefaultParams {
	/** 温度参数 */
	temperature?: number;
	/** 最大 token 数 */
	maxTokens?: number;
	/** Top-p 采样 */
	topP?: number;
}

/**
 * 模型配置
 */
export interface ModelConfig {
	/** 模型标识（如 "qwen", "glm", "kimi"） */
	id: string;
	/** 模型名称 */
	name: string;
	/** 提供商（如 "dashscope", "zhipu", "moonshot"） */
	provider: string;
	/** API 基础 URL */
	baseUrl?: string;
	/** API Key 环境变量名 */
	apiKeyEnv?: string;
	/** API Key */
	apiKey?: string;
	/** 模型 ID（用于 API 调用） */
	model: string;
	/** 能力声明 */
	capabilities?: ModelCapabilities;
	/** 默认参数 */
	defaultParams?: ModelDefaultParams;
}

/**
 * 模型配置文件格式
 */
export interface ModelsConfig {
	/** 默认模型 ID */
	default: string;
	/** 模型配置映射 */
	models: Record<string, ModelConfig>;
}
