/**
 * Feishu Adapter Module
 *
 * 飞书平台适配器模块入口
 */

// 导出主要类
export { FeishuAdapter } from "./adapter.js";
export type {
	FeishuAdapterConfig,
	MentionInfo,
	ToolCallInfo,
	CardState,
	CardBuildOptions,
	MessageContext,
} from "./types.js";
export { FeishuPlatformContext } from "./context.js";
export { StatusManager } from "./status-manager.js";
export { FeishuStore } from "./store.js";
export { createFeishuBot, type CreateFeishuBotConfig } from "./factory.js";

// 导出卡片构建工具
export {
	buildFeishuCard,
	buildThinkingCard,
	buildStreamingCard,
	buildCompleteCard,
	parseToolStatusText,
	STREAMING_ELEMENT_ID,
	REASONING_ELEMENT_ID,
	splitReasoningText,
	formatReasoningDuration,
	formatElapsed,
} from "./card-builder.js";

// 自注册到 Adapter Registry
import { adapterRegistry } from "../../core/adapter/index.js";
import type { AdapterFactory, BotConfig, Bot } from "../../core/adapter/index.js";
import { FeishuAdapter } from "./adapter.js";

// Feishu Adapter 工厂
const feishuAdapterFactory: AdapterFactory = {
	meta: {
		id: "feishu",
		name: "Feishu (飞书)",
		version: "1.0.0",
		description: "Feishu/Lark platform adapter with card support",
	},

	async createBot(config: BotConfig): Promise<Bot> {
		const { workspaceDir, ...feishuConfig } = config;

		// 验证必要的配置
		if (!feishuConfig.appId || !feishuConfig.appSecret) {
			throw new Error("Feishu adapter requires appId and appSecret");
		}

		// 动态导入 factory 函数避免循环依赖
		const { createFeishuBot } = await import("./factory.js");

		return createFeishuBot({
			workspaceDir: workspaceDir || process.cwd(),
			feishuConfig: {
				platform: "feishu",
				enabled: true,
				appId: feishuConfig.appId,
				appSecret: feishuConfig.appSecret,
				encryptKey: feishuConfig.encryptKey,
				verificationToken: feishuConfig.verificationToken,
				brand: feishuConfig.brand || "feishu",
			},
			model: feishuConfig.model,
		});
	},
};

// 自注册
adapterRegistry.register(feishuAdapterFactory);
