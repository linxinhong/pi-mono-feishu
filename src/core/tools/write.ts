/**
 * Write Tool - 写入文件
 */

import { Type, Static } from "@sinclair/typebox";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import type { Executor } from "../sandbox/index.js";

const WriteToolSchema = Type.Object({
	path: Type.String({ description: "File path to write (relative to workspace or absolute)" }),
	content: Type.String({ description: "Content to write to the file" }),
	label: Type.String({ description: "Short label shown to user" }),
});

type WriteToolParams = Static<typeof WriteToolSchema>;

export function createWriteTool(executor: Executor): AgentTool<typeof WriteToolSchema> {
	return {
		name: "write",
		label: "Write",
		description: "Create or overwrite a file with content.",
		parameters: WriteToolSchema,
		execute: async (_toolCallId, params: WriteToolParams, _signal, _onUpdate) => {
			const { path, content } = params;
			try {
				// 创建目录
				const dirPath = path.substring(0, path.lastIndexOf("/"));
				if (dirPath) {
					await executor.exec(`mkdir -p "${dirPath}"`);
				}

				// 使用 heredoc 写入文件，处理特殊字符
				const command = `cat > "${path}" << 'PMF_EOF'\n${content}\nPMF_EOF`;

				const result = await executor.exec(command);

				if (result.code !== 0) {
					return {
						content: [{ type: "text", text: `Error writing file: ${result.stderr}` }],
						details: { error: result.stderr, exitCode: result.code },
					};
				}

				return {
					content: [{ type: "text", text: `Wrote ${content.length} characters to ${path}` }],
					details: { path, bytesWritten: content.length },
				};
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Error writing file: ${error.message}` }],
					details: { error: error.message },
				};
			}
		},
	};
}
