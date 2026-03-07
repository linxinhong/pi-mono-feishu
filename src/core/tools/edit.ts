/**
 * Edit Tool - 编辑文件
 */

import { Type, Static } from "@sinclair/typebox";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import type { Executor } from "../sandbox/index.js";

const EditToolSchema = Type.Object({
	path: Type.String({ description: "File path to edit (relative to workspace or absolute)" }),
	old_string: Type.String({ description: "Text to find and replace (must be unique in the file)" }),
	new_string: Type.String({ description: "Text to replace with" }),
	label: Type.String({ description: "Short label shown to user" }),
	replace_all: Type.Optional(Type.Boolean({ description: "Replace all occurrences (default: false)" })),
});

type EditToolParams = Static<typeof EditToolSchema>;

export function createEditTool(executor: Executor): AgentTool<typeof EditToolSchema> {
	return {
		name: "edit",
		label: "Edit",
		description: "Edit a file by replacing specific text. The old_string must be unique.",
		parameters: EditToolSchema,
		execute: async (_toolCallId, params: EditToolParams, _signal, _onUpdate) => {
			const { path, old_string, new_string, replace_all = false } = params;
			// 检查文件是否存在
			const checkResult = await executor.exec(`test -f "${path}" && echo "exists" || echo "not_found"`);
			if (checkResult.stdout.trim() === "not_found") {
				return {
					content: [{ type: "text", text: `File not found: ${path}` }],
					details: { error: "not_found" },
				};
			}

			if (!old_string) {
				return {
					content: [{ type: "text", text: "old_string cannot be empty" }],
					details: { error: "empty_old_string" },
				};
			}

			try {
				// 读取文件内容
				const readResult = await executor.exec(`cat "${path}"`);
				if (readResult.code !== 0) {
					return {
						content: [{ type: "text", text: `Error reading file: ${readResult.stderr}` }],
						details: { error: readResult.stderr, exitCode: readResult.code },
					};
				}

				let content = readResult.stdout;

				if (replace_all) {
					// 统计出现次数
					const count = (content.match(new RegExp(escapeRegex(old_string), "g")) || []).length;
					if (count === 0) {
						return {
							content: [{ type: "text", text: `old_string not found in ${path}` }],
							details: { error: "not_found", occurrences: 0 },
						};
					}

					// 使用 sed 替换所有
					const escapedOld = escapeForSed(old_string);
					const escapedNew = escapeForSed(new_string);
					const sedCmd = `sed -i 's/${escapedOld}/${escapedNew}/g' "${path}"`;

					const result = await executor.exec(sedCmd);
					if (result.code !== 0) {
						return {
							content: [{ type: "text", text: `Error editing file: ${result.stderr}` }],
							details: { error: result.stderr, exitCode: result.code },
						};
					}

					return {
						content: [{ type: "text", text: `Replaced ${count} occurrences in ${path}` }],
						details: { path, occurrences: count },
					};
				}

				// 单次替换
				const index = content.indexOf(old_string);
				if (index === -1) {
					return {
						content: [{ type: "text", text: `old_string not found in ${path}. Make sure it matches exactly, including whitespace.` }],
						details: { error: "not_found" },
					};
				}

				// 检查唯一性
				const secondIndex = content.indexOf(old_string, index + 1);
				if (secondIndex !== -1) {
					const count = countOccurrences(content, old_string);
					return {
						content: [{ type: "text", text: `Found ${count} occurrences of old_string. It must be unique. Use replace_all=true to replace all.` }],
						details: { error: "not_unique", occurrences: count },
					};
				}

				// 使用 sed 替换
				const escapedOld = escapeForSed(old_string);
				const escapedNew = escapeForSed(new_string);
				const sedCmd = `sed -i 's/${escapedOld}/${escapedNew}/' "${path}"`;

				const result = await executor.exec(sedCmd);
				if (result.code !== 0) {
					return {
						content: [{ type: "text", text: `Error editing file: ${result.stderr}` }],
						details: { error: result.stderr, exitCode: result.code },
					};
				}

				return {
					content: [{ type: "text", text: `Edited ${path}` }],
					details: { path, replaced: 1 },
				};
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Error editing file: ${error.message}` }],
					details: { error: error.message },
				};
			}
		},
	};
}

function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeForSed(str: string): string {
	// 转义 sed 特殊字符
	return str
		.replace(/\\/g, "\\\\")
		.replace(/\//g, "\\/")
		.replace(/\[/g, "\\[")
		.replace(/\]/g, "\\]")
		.replace(/\^/g, "\\^")
		.replace(/\$/g, "\\$")
		.replace(/\*/g, "\\*")
		.replace(/\./g, "\\.")
		.replace(/\n/g, "\\n");
}

function countOccurrences(str: string, search: string): number {
	let count = 0;
	let pos = 0;
	while ((pos = str.indexOf(search, pos)) !== -1) {
		count++;
		pos += search.length;
	}
	return count;
}
