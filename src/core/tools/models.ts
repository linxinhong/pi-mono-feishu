/**
 * Models Tool - 列出所有可用模型并支持切换
 */

import { Type, Static } from "@sinclair/typebox";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import type { ModelManager } from "../model/manager.js";
import { join } from "path";

const ModelsToolSchema = Type.Object({
	action: Type.Union([Type.Literal("list"), Type.Literal("switch")], {
		description: "Action to perform: 'list' to show models, 'switch' to change model",
	}),
	modelId: Type.Optional(
		Type.String({
			description: "Model ID to switch to (required for 'switch' action)",
		}),
	),
});

type ModelsToolParams = Static<typeof ModelsToolSchema>;

/**
 * Models 工具配置
 */
export interface ModelsToolConfig {
	modelManager: ModelManager;
	channelId: string;
	channelDir: string;
}

export function createModelsTool(config: ModelsToolConfig): AgentTool<typeof ModelsToolSchema> {
	const { modelManager, channelId, channelDir } = config;

	return {
		name: "models",
		label: "Models",
		description:
			"Manage AI models. Use 'list' to show all available models, 'switch' to change the current model for this channel.",
		parameters: ModelsToolSchema,
		execute: async (_toolCallId, params, _signal, _onUpdate) => {
			const { action, modelId } = params;

			if (action === "list") {
				return handleListAction(modelManager);
			}

			if (action === "switch") {
				if (!modelId) {
					return {
						content: [
							{
								type: "text" as const,
								text: JSON.stringify({ error: "modelId is required for 'switch' action" }, null, 2),
							},
						],
						details: { success: false },
					};
				}
				return handleSwitchAction(modelManager, channelId, channelDir, modelId);
			}

			return {
				content: [{ type: "text" as const, text: JSON.stringify({ error: `Unknown action: ${action}` }, null, 2) }],
				details: { success: false },
			};
		},
	};
}

/**
 * 处理列出模型操作
 */
function handleListAction(modelManager: ModelManager) {
	const models = modelManager.listModels();
	const currentModel = models.find((m) => m.current);

	const data = {
		models: models.map((m) => ({
			id: m.id,
			provider: m.provider,
			model: m.name,
		})),
		current: currentModel
			? {
					id: currentModel.id,
					provider: currentModel.provider,
					model: currentModel.name,
				}
			: null,
	};

	return {
		content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
		details: { modelCount: models.length },
	};
}

/**
 * 处理切换模型操作
 */
function handleSwitchAction(
	modelManager: ModelManager,
	channelId: string,
	channelDir: string,
	modelId: string,
) {
	const models = modelManager.getAllModels();
	const model = models[modelId.toLowerCase()];

	if (!model) {
		const availableModels = Object.keys(models).join(", ");
		return {
			content: [
				{
					type: "text" as const,
					text: JSON.stringify(
						{
							error: `Model not found: ${modelId}`,
							availableModels: Object.keys(models),
						},
						null,
						2,
					),
				},
			],
			details: { success: false },
		};
	}

	// 切换频道模型
	const success = modelManager.switchChannelModel(channelId, modelId.toLowerCase());

	if (!success) {
		return {
			content: [
				{
					type: "text" as const,
					text: JSON.stringify({ error: `Failed to switch model: ${modelId}` }, null, 2),
				},
			],
			details: { success: false },
		};
	}

	// 保存到频道配置
	const configPath = join(channelDir, "channel-config.json");
	modelManager.saveChannelModel(channelId, modelId.toLowerCase(), configPath);

	return {
		content: [
			{
				type: "text" as const,
				text: JSON.stringify(
					{
						success: true,
						message: `Model switched to ${model.name} (${model.provider}/${model.model})`,
						model: {
							id: modelId.toLowerCase(),
							provider: model.provider,
							name: model.name,
						},
					},
					null,
					2,
				),
			},
		],
		details: { success: true, modelId: modelId.toLowerCase() },
	};
}
