/**
 * Model Manager 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Mock 依赖
vi.mock("../../../../src/utils/logger/index.js", () => ({
	logInfo: vi.fn(),
	logWarning: vi.fn(),
	logError: vi.fn(),
}));

vi.mock("../../../../src/utils/config.js", () => ({
	PROJECT_ROOT: "/test-project",
}));

// ============================================================================
// Tests
// ============================================================================

describe("ModelManager", () => {
	let tempDir: string;
	let configPath: string;

	beforeEach(() => {
		// 创建临时目录和配置文件
		tempDir = join(tmpdir(), `model-manager-test-${Date.now()}`);
		mkdirSync(tempDir, { recursive: true });
		configPath = join(tempDir, "models.json");

		// 写入测试配置
		writeFileSync(
			configPath,
			JSON.stringify({
				providers: {
					anthropic: {
						baseUrl: "https://api.anthropic.com",
						apiKey: "test-key",
						api: "openai",
						models: [
							{
								id: "claude-3-sonnet",
								name: "Claude 3 Sonnet",
								input: ["text", "image"],
								cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
								contextWindow: 200000,
								maxTokens: 4096,
							},
							{
								id: "claude-3-haiku",
								name: "Claude 3 Haiku",
								input: ["text"],
								cost: { input: 0.25, output: 1.25 },
								contextWindow: 200000,
								maxTokens: 4096,
							},
						],
					},
					openai: {
						baseUrl: "https://api.openai.com",
						apiKey: "openai-key",
						api: "openai",
						models: [
							{
								id: "gpt-4",
								name: "GPT-4",
								input: ["text"],
								cost: { input: 30, output: 60 },
								contextWindow: 128000,
								maxTokens: 4096,
							},
						],
					},
				},
			}),
		);
	});

	afterEach(() => {
		// 清理临时目录
		try {
			rmSync(tempDir, { recursive: true, force: true });
		} catch (e) {
			// ignore cleanup errors
		}
	});

	describe("getAllModels", () => {
		it("应该返回所有配置的模型", async () => {
			const { ModelManager } = await import("../../../../src/core/model/manager.js");
			const manager = new ModelManager(configPath);
			const models = manager.getAllModels();

			expect(Object.keys(models).length).toBe(3);
			expect(models["claude-3-sonnet"]).toBeDefined();
			expect(models["gpt-4"]).toBeDefined();
			expect(models["claude-3-haiku"]).toBeDefined();
		});

		it("模型配置应该包含正确的信息", async () => {
			const { ModelManager } = await import("../../../../src/core/model/manager.js");
			const manager = new ModelManager(configPath);
			const models = manager.getAllModels();

			expect(models["claude-3-sonnet"].provider).toBe("anthropic");
			expect(models["claude-3-sonnet"].name).toBe("Claude 3 Sonnet");
			expect(models["gpt-4"].provider).toBe("openai");
		});
	});

	describe("getModelConfig", () => {
		it("应该返回指定模型的配置", async () => {
			const { ModelManager } = await import("../../../../src/core/model/manager.js");
			const manager = new ModelManager(configPath);
			const config = manager.getModelConfig("gpt-4");

			expect(config).toBeDefined();
			expect(config?.id).toBe("gpt-4");
			expect(config?.provider).toBe("openai");
		});

		it("模型不存在时应该返回 undefined", async () => {
			const { ModelManager } = await import("../../../../src/core/model/manager.js");
			const manager = new ModelManager(configPath);
			const config = manager.getModelConfig("nonexistent");

			expect(config).toBeUndefined();
		});
	});

	describe("switchModel", () => {
		it("应该成功切换全局模型", async () => {
			const { ModelManager } = await import("../../../../src/core/model/manager.js");
			const manager = new ModelManager(configPath);

			const result = manager.switchModel("gpt-4");
			expect(result).toBe(true);

			const currentConfig = manager.getCurrentModelConfig();
			expect(currentConfig.id).toBe("gpt-4");
		});

		it("模型不存在时切换应该失败", async () => {
			const { ModelManager } = await import("../../../../src/core/model/manager.js");
			const manager = new ModelManager(configPath);

			const result = manager.switchModel("nonexistent");
			expect(result).toBe(false);
		});

		it("应该支持 provider/model 格式", async () => {
			const { ModelManager } = await import("../../../../src/core/model/manager.js");
			const manager = new ModelManager(configPath);

			const result = manager.switchModel("openai/gpt-4");
			expect(result).toBe(true);

			const currentConfig = manager.getCurrentModelConfig();
			expect(currentConfig.id).toBe("gpt-4");
		});
	});

	describe("switchChannelModel", () => {
		it("应该成功切换频道模型", async () => {
			const { ModelManager } = await import("../../../../src/core/model/manager.js");
			const manager = new ModelManager(configPath);

			const result = manager.switchChannelModel("channel-123", "gpt-4");
			expect(result).toBe(true);

			const modelId = manager.getChannelModelId("channel-123");
			expect(modelId).toBe("gpt-4");
		});

		it("频道模型不影响全局模型", async () => {
			const { ModelManager } = await import("../../../../src/core/model/manager.js");
			const manager = new ModelManager(configPath);

			manager.switchChannelModel("channel-123", "gpt-4");

			const globalConfig = manager.getCurrentModelConfig();
			expect(globalConfig.id).toBe("claude-3-sonnet"); // 默认模型

			const channelModelId = manager.getChannelModelId("channel-123");
			expect(channelModelId).toBe("gpt-4");
		});

		it("不同频道应该有独立的模型设置", async () => {
			const { ModelManager } = await import("../../../../src/core/model/manager.js");
			const manager = new ModelManager(configPath);

			manager.switchChannelModel("channel-1", "gpt-4");
			manager.switchChannelModel("channel-2", "claude-3-haiku");

			expect(manager.getChannelModelId("channel-1")).toBe("gpt-4");
			expect(manager.getChannelModelId("channel-2")).toBe("claude-3-haiku");
		});
	});

	describe("resetChannelModel", () => {
		it("重置后应该使用全局模型", async () => {
			const { ModelManager } = await import("../../../../src/core/model/manager.js");
			const manager = new ModelManager(configPath);

			manager.switchChannelModel("channel-123", "gpt-4");
			expect(manager.getChannelModelId("channel-123")).toBe("gpt-4");

			manager.resetChannelModel("channel-123");
			expect(manager.getChannelModelId("channel-123")).toBe("claude-3-sonnet");
		});
	});

	describe("getChannelModelId", () => {
		it("没有频道设置时应该返回全局模型", async () => {
			const { ModelManager } = await import("../../../../src/core/model/manager.js");
			const manager = new ModelManager(configPath);

			const modelId = manager.getChannelModelId("new-channel");
			expect(modelId).toBe("claude-3-sonnet");
		});

		it("应该优先使用 adapter 默认模型", async () => {
			const { ModelManager } = await import("../../../../src/core/model/manager.js");
			const manager = new ModelManager(configPath);

			const modelId = manager.getChannelModelId("new-channel", "claude-3-haiku");
			expect(modelId).toBe("claude-3-haiku");
		});

		it("频道模型优先级最高", async () => {
			const { ModelManager } = await import("../../../../src/core/model/manager.js");
			const manager = new ModelManager(configPath);

			manager.switchChannelModel("channel-123", "gpt-4");
			const modelId = manager.getChannelModelId("channel-123", "claude-3-haiku");
			expect(modelId).toBe("gpt-4");
		});
	});

	describe("listModels", () => {
		it("应该列出所有模型并标记当前模型", async () => {
			const { ModelManager } = await import("../../../../src/core/model/manager.js");
			const manager = new ModelManager(configPath);

			const models = manager.listModels();
			expect(models.length).toBe(3);

			const currentModel = models.find((m) => m.current);
			expect(currentModel?.id).toBe("claude-3-sonnet");
		});

		it("切换模型后当前标记应该更新", async () => {
			const { ModelManager } = await import("../../../../src/core/model/manager.js");
			const manager = new ModelManager(configPath);

			manager.switchModel("gpt-4");
			const models = manager.listModels();

			const currentModel = models.find((m) => m.current);
			expect(currentModel?.id).toBe("gpt-4");
		});
	});

	describe("saveChannelModel / loadChannelModels", () => {
		it("应该保存和加载频道模型配置", async () => {
			const { ModelManager } = await import("../../../../src/core/model/manager.js");
			const manager = new ModelManager(configPath);

			const modelConfigPath = join(tempDir, "channel-config.json");
			manager.switchChannelModel("channel-123", "gpt-4");
			manager.saveChannelModel("channel-123", "gpt-4", modelConfigPath);

			// 验证文件已创建
			expect(existsSync(modelConfigPath)).toBe(true);

			// 创建新的 manager 并加载配置
			const manager2 = new ModelManager(configPath);
			manager2.loadChannelModels(modelConfigPath);

			expect(manager2.getChannelModelId("channel-123")).toBe("gpt-4");
		});
	});

	describe("默认模型", () => {
		it("应该使用指定的默认模型", async () => {
			const { ModelManager } = await import("../../../../src/core/model/manager.js");
			const manager = new ModelManager(configPath, "gpt-4");

			const currentConfig = manager.getCurrentModelConfig();
			expect(currentConfig.id).toBe("gpt-4");
		});

		it("默认模型不存在时应该使用第一个模型", async () => {
			const { ModelManager } = await import("../../../../src/core/model/manager.js");
			const manager = new ModelManager(configPath, "nonexistent");

			const currentConfig = manager.getCurrentModelConfig();
			expect(currentConfig.id).toBe("claude-3-sonnet");
		});
	});
});
