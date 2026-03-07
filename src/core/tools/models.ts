/**
 * Models Tool - 列出所有可用模型
 */

import { Type, Static } from "@sinclair/typebox";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import type { ModelManager } from "../model/manager.js";

const ModelsToolSchema = Type.Object({});

type ModelsToolParams = Static<typeof ModelsToolSchema>;

export function createModelsTool(modelManager: ModelManager): AgentTool<typeof ModelsToolSchema> {
	return {
		name: "models",
		label: "Models",
		description: "List all available models in JSON format. Use model.id to switch model.",
		parameters: ModelsToolSchema,
		execute: async (_toolCallId, _params, _signal, _onUpdate) => {
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
				content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
				details: { modelCount: models.length },
			};
		},
	};
}
