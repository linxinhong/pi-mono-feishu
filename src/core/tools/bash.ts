/**
 * Bash Tool - 执行 shell 命令
 */

import { Type, Static } from "@sinclair/typebox";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import type { Executor } from "../sandbox/index.js";

const BashToolSchema = Type.Object({
	command: Type.String({ description: "The shell command to run" }),
	label: Type.String({ description: "Short label shown to user" }),
	timeout: Type.Optional(Type.Number({ description: "Timeout in seconds (default: 120)" })),
});

type BashToolParams = Static<typeof BashToolSchema>;

export function createBashTool(executor: Executor): AgentTool<typeof BashToolSchema> {
	return {
		name: "bash",
		label: "Bash",
		description: "Run a shell command. Use for file operations, system commands, etc.",
		parameters: BashToolSchema,
		execute: async (_toolCallId, params: BashToolParams, _signal, _onUpdate) => {
			const { command, timeout = 120 } = params;
			try {
				const result = await executor.exec(command, { timeout });

				let output = "";
				if (result.stdout) output += result.stdout;
				if (result.stderr) output += `\n[stderr]\n${result.stderr}`;

				return {
					content: [{ type: "text", text: output || "(no output)" }],
					details: { exitCode: result.code || 0 },
				};
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Error: ${error.message}` }],
					details: { error: error.message },
				};
			}
		},
	};
}
