/**
 * Glob Tool 单元测试
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGlobTool } from "../../../../src/core/tools/glob.js";
import type { Executor } from "../../../../src/core/sandbox/index.js";

// ============================================================================
// Mocks
// ============================================================================

function createMockExecutor(): Executor {
	return {
		exec: vi.fn(),
		getWorkspacePath: vi.fn().mockReturnValue("/workspace"),
	} as unknown as Executor;
}

// ============================================================================
// Tests
// ============================================================================

describe("createGlobTool", () => {
	let mockExecutor: Executor;

	beforeEach(() => {
		mockExecutor = createMockExecutor();
	});

	describe("工具定义", () => {
		it("应该有正确的 name 和 label", () => {
			const tool = createGlobTool(mockExecutor);
			expect(tool.name).toBe("glob");
			expect(tool.label).toBe("Glob");
		});

		it("应该有 description", () => {
			const tool = createGlobTool(mockExecutor);
			expect(tool.description).toContain("glob pattern");
		});
	});

	describe("文件匹配", () => {
		it("应该返回匹配的文件列表", async () => {
			(mockExecutor.exec as ReturnType<typeof vi.fn>).mockResolvedValue({
				code: 0,
				stdout: "file1.ts\nfile2.ts\nfile3.ts",
				stderr: "",
			});

			const tool = createGlobTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{ pattern: "**/*.ts", label: "test" },
				undefined,
				undefined,
			);

			expect(result.content[0].type).toBe("text");
			expect(result.content[0].text).toContain("file1.ts");
			expect(result.content[0].text).toContain("file2.ts");
		});

		it("没有匹配时应该返回空列表提示", async () => {
			(mockExecutor.exec as ReturnType<typeof vi.fn>).mockResolvedValue({
				code: 0,
				stdout: "",
				stderr: "",
			});

			const tool = createGlobTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{ pattern: "**/*.nonexistent", label: "test" },
				undefined,
				undefined,
			);

			expect(result.content[0].text).toContain("No files matching pattern");
		});

		it("应该支持自定义 cwd", async () => {
			(mockExecutor.exec as ReturnType<typeof vi.fn>).mockResolvedValue({
				code: 0,
				stdout: "test.ts",
				stderr: "",
			});

			const tool = createGlobTool(mockExecutor);
			await tool.execute(
				"test-id",
				{ pattern: "*.ts", label: "test", cwd: "/custom/path" },
				undefined,
				undefined,
			);

			// 验证命令中包含自定义路径
			expect(mockExecutor.exec).toHaveBeenCalledWith(
				expect.stringContaining("/custom/path"),
			);
		});
	});

	describe("异常处理", () => {
		it("执行异常时应该返回错误信息", async () => {
			(mockExecutor.exec as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Glob failed"));

			const tool = createGlobTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{ pattern: "**/*.ts", label: "test" },
				undefined,
				undefined,
			);

			expect(result.content[0].text).toContain("Error");
		});
	});
});
