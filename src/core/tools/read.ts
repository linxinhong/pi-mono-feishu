/**
 * Read Tool - 读取文件
 */

import { Type, Static } from "@sinclair/typebox";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import type { Executor } from "../sandbox/index.js";

const ReadToolSchema = Type.Object({
	path: Type.String({ description: "File path to read (relative to workspace or absolute)" }),
	label: Type.String({ description: "Short label shown to user" }),
	offset: Type.Optional(Type.Number({ description: "Line number to start reading from (1-indexed)" })),
	limit: Type.Optional(Type.Number({ description: "Maximum number of lines to read" })),
});

type ReadToolParams = Static<typeof ReadToolSchema>;

export function createReadTool(executor: Executor): AgentTool<typeof ReadToolSchema> {
	return {
		name: "read",
		label: "Read",
		description: "Read a file. Returns file contents.",
		parameters: ReadToolSchema,
		execute: async (_toolCallId, params: ReadToolParams, _signal, _onUpdate) => {
			const { path, offset = 1, limit = 2000 } = params;
			// 使用 cat 命令读取文件，配合 sed/awk 处理分页
			const startLine = Math.max(1, offset);
			const endLine = limit ? startLine + limit - 1 : "";

			let command: string;
			if (limit) {
				command = `sed -n '${startLine},${endLine}p' "${path}" | cat -n`;
			} else {
				command = `sed -n '${startLine},\\$p' "${path}" | cat -n`;
			}

			// 先检查文件是否存在
			const checkResult = await executor.exec(`test -f "${path}" && echo "exists" || echo "not_found"`);
			if (checkResult.stdout.trim() === "not_found") {
				return {
					content: [{ type: "text", text: `File not found: ${path}` }],
					details: { error: "not_found" },
				};
			}

			// 检查是否是目录
			const dirCheck = await executor.exec(`test -d "${path}" && echo "is_dir" || echo "not_dir"`);
			if (dirCheck.stdout.trim() === "is_dir") {
				return {
					content: [{ type: "text", text: `Path is a directory, not a file: ${path}` }],
					details: { error: "is_directory" },
				};
			}

			try {
				const result = await executor.exec(command);
				let output = result.stdout;

				// 获取总行数
				const lineCountResult = await executor.exec(`wc -l < "${path}"`);
				const totalLines = parseInt(lineCountResult.stdout.trim(), 10);

				if (endLine && totalLines > endLine) {
					output += `\n\n... (${totalLines - endLine} more lines)`;
				}

				return {
					content: [{ type: "text", text: output || "(empty file)" }],
					details: { totalLines, linesRead: limit ? Math.min(limit, totalLines) : totalLines },
				};
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Error reading file: ${error.message}` }],
					details: { error: error.message },
				};
			}
		},
	};
}
