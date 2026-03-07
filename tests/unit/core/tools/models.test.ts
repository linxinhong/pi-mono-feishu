/**
 * Models Tool 单元测试
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createModelsTool, type ModelsToolConfig } from "../../../../src/core/tools/models.js";
import type { ModelManager } from "../../../../src/core/model/manager.js";

// ============================================================================
// Mocks
// ============================================================================

/**
 * 创建 Mock ModelManager
 */
function createMockModelManager(): ModelManager {
	return {
		listModels: vi.fn().mockReturnValue([
			{ id: "claude-3-sonnet", name: "Claude 3 Sonnet", provider: "anthropic", current: true },
			{ id: "gpt-4", name: "GPT-4", provider: "openai", current: false },
			{ id: "qwen-plus", name: "Qwen Plus", provider: "dashscope", current: false },
		]),
		getAllModels: vi.fn().mockReturnValue({
			"claude-3-sonnet": {
				id: "claude-3-sonnet",
				name: "Claude 3 Sonnet",
				provider: "anthropic",
				model: "claude-3-sonnet",
			},
			"gpt-4": {
				id: "gpt-4",
				name: "GPT-4",
				provider: "openai",
				model: "gpt-4",
			},
			"qwen-plus": {
				id: "qwen-plus",
				name: "Qwen Plus",
				provider: "dashscope",
				model: "qwen-plus",
			},
		}),
		switchChannelModel: vi.fn().mockReturnValue(true),
		saveChannelModel: vi.fn(),
	} as unknown as ModelManager;
}

// ============================================================================
// Tests
// ============================================================================

describe("createModelsTool", () => {
	let mockModelManager: ModelManager;
	let toolConfig: ModelsToolConfig;

	beforeEach(() => {
		mockModelManager = createMockModelManager();
		toolConfig = {
			modelManager: mockModelManager,
			channelId: "test-channel-123",
			channelDir: "/tmp/test-channel",
		};
	});

	describe("工具定义", () => {
		it("应该有正确的 name 和 label", () => {
			const tool = createModelsTool(toolConfig);
			expect(tool.name).toBe("models");
			expect(tool.label).toBe("Models");
		});

		it("应该有 description", () => {
			const tool = createModelsTool(toolConfig);
			expect(tool.description).toContain("list");
			expect(tool.description).toContain("switch");
		});

		it("应该有正确的参数 schema", () => {
			const tool = createModelsTool(toolConfig);
			expect(tool.parameters).toBeDefined();
		});
	});

	describe("action: list", () => {
		it("应该返回模型列表", async () => {
			const tool = createModelsTool(toolConfig);
			const result = await tool.execute("test-id", { action: "list" }, undefined, undefined);

			expect(result.content).toHaveLength(1);
			expect(result.content[0].type).toBe("text");

			const data = JSON.parse(result.content[0].text);
			expect(data.models).toHaveLength(3);
			expect(data.models[0].id).toBe("claude-3-sonnet");
			expect(data.current).toBeDefined();
			expect(data.current?.id).toBe("claude-3-sonnet");
		});

		it("应该标记当前模型", async () => {
			const tool = createModelsTool(toolConfig);
			const result = await tool.execute("test-id", { action: "list" }, undefined, undefined);

			const data = JSON.parse(result.content[0].text);
			expect(data.current?.id).toBe("claude-3-sonnet");
		});

		it("应该返回 modelCount 详情", async () => {
			const tool = createModelsTool(toolConfig);
			const result = await tool.execute("test-id", { action: "list" }, undefined, undefined);

			expect(result.details).toEqual({ modelCount: 3 });
		});
	});

	describe("action: switch", () => {
		it("成功切换模型时应该返回成功信息", async () => {
			const tool = createModelsTool(toolConfig);
			const result = await tool.execute(
				"test-id",
				{ action: "switch", modelId: "gpt-4" },
				undefined,
				undefined,
			);

			expect(mockModelManager.switchChannelModel).toHaveBeenCalledWith(
				"test-channel-123",
				"gpt-4",
			);
			expect(mockModelManager.saveChannelModel).toHaveBeenCalled();

			const data = JSON.parse(result.content[0].text);
			expect(data.success).toBe(true);
			expect(data.model.id).toBe("gpt-4");
			expect(data.model.provider).toBe("openai");
		});

		it("应该支持大写模型 ID（自动转小写）", async () => {
			const tool = createModelsTool(toolConfig);
			const result = await tool.execute(
				"test-id",
				{ action: "switch", modelId: "GPT-4" },
				undefined,
				undefined,
			);

			expect(mockModelManager.switchChannelModel).toHaveBeenCalledWith(
				"test-channel-123",
				"gpt-4",
			);

			const data = JSON.parse(result.content[0].text);
			expect(data.success).toBe(true);
		});

		it("模型不存在时应该返回错误", async () => {
			const tool = createModelsTool(toolConfig);
			const result = await tool.execute(
				"test-id",
				{ action: "switch", modelId: "non-existent" },
				undefined,
				undefined,
			);

			const data = JSON.parse(result.content[0].text);
			expect(data.error).toContain("Model not found");
			expect(data.availableModels).toBeDefined();
			expect(result.details).toEqual({ success: false });
		});

		it("没有 modelId 时应该返回错误", async () => {
			const tool = createModelsTool(toolConfig);
			const result = await tool.execute(
				"test-id",
				{ action: "switch" },
				undefined,
				undefined,
			);

			const data = JSON.parse(result.content[0].text);
			expect(data.error).toContain("modelId is required");
			expect(result.details).toEqual({ success: false });
		});

		it("切换失败时应该返回错误", async () => {
			const failMockManager = createMockModelManager();
			(failMockManager.switchChannelModel as ReturnType<typeof vi.fn>).mockReturnValue(false);

			const tool = createModelsTool({
				...toolConfig,
				modelManager: failMockManager,
			});

			const result = await tool.execute(
				"test-id",
				{ action: "switch", modelId: "gpt-4" },
				undefined,
				undefined,
			);

			const data = JSON.parse(result.content[0].text);
			expect(data.error).toContain("Failed to switch model");
			expect(result.details).toEqual({ success: false });
		});
	});

	describe("未知 action", () => {
		it("应该返回错误（TypeScript 会阻止这种情况，但运行时测试）", async () => {
			const tool = createModelsTool(toolConfig);
			// @ts-expect-error 测试未知 action
			const result = await tool.execute("test-id", { action: "unknown" }, undefined, undefined);

			const data = JSON.parse(result.content[0].text);
			expect(data.error).toContain("Unknown action");
		});
	});
});
