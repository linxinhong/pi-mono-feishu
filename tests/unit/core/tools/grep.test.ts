/**
 * Grep Tool 单元测试
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGrepTool } from "../../../../src/core/tools/grep.js";
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

describe("createGrepTool", () => {
	let mockExecutor: Executor;

	beforeEach(() => {
		mockExecutor = createMockExecutor();
	});

	describe("工具定义", () => {
		it("应该有正确的 name 和 label", () => {
			const tool = createGrepTool(mockExecutor);
			expect(tool.name).toBe("grep");
			expect(tool.label).toBe("Grep");
		});

		it("应该有 description", () => {
			const tool = createGrepTool(mockExecutor);
			expect(tool.description).toContain("Search for a pattern");
		});
	});

	describe("内容搜索", () => {
		it("应该返回匹配结果", async () => {
			(mockExecutor.exec as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({ code: 0, stdout: "exists", stderr: "" })
				.mockResolvedValueOnce({
					code: 0,
					stdout: "file1.ts:10:const hello = 'world'\nfile2.ts:5:const hello = 'test'",
					stderr: "",
				});

			const tool = createGrepTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{ pattern: "hello", label: "test", path: "/src" },
				undefined,
				undefined,
			);

			expect(result.content[0].text).toContain("hello");
		});

		it("没有匹配时应该返回提示", async () => {
			(mockExecutor.exec as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({ code: 0, stdout: "exists", stderr: "" })
				.mockResolvedValueOnce({
					code: 1, // grep 返回 1 表示没有匹配
					stdout: "",
					stderr: "",
				});

			const tool = createGrepTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{ pattern: "nonexistent", label: "test", path: "/src" },
				undefined,
				undefined,
			);

			expect(result.content[0].text).toContain("No matches found");
			expect(result.details?.matchCount).toBe(0);
		});

		it("空 pattern 时应该返回错误", async () => {
			const tool = createGrepTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{ pattern: "", label: "test" },
				undefined,
				undefined,
			);

			expect(result.content[0].text).toContain("Pattern is required");
		});

		it("路径不存在时应该返回错误", async () => {
			(mockExecutor.exec as ReturnType<typeof vi.fn>).mockResolvedValue({
				code: 0,
				stdout: "not_found",
				stderr: "",
			});

			const tool = createGrepTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{ pattern: "test", label: "test", path: "/nonexistent" },
				undefined,
				undefined,
			);

			expect(result.content[0].text).toContain("Path not found");
		});

		it("应该支持大小写不敏感搜索", async () => {
			(mockExecutor.exec as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({ code: 0, stdout: "exists", stderr: "" })
				.mockResolvedValueOnce({
					code: 0,
					stdout: "file.ts:1:HELLO",
					stderr: "",
				});

			const tool = createGrepTool(mockExecutor);
			await tool.execute(
				"test-id",
				{ pattern: "hello", label: "test", path: "/src", caseInsensitive: true },
				undefined,
				undefined,
			);

			expect(mockExecutor.exec).toHaveBeenCalledWith(
				expect.stringContaining("-i"),
			);
		});

		it("应该支持非递归搜索", async () => {
			(mockExecutor.exec as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({ code: 0, stdout: "exists", stderr: "" })
				.mockResolvedValueOnce({
					code: 0,
					stdout: "file.ts:1:hello",
					stderr: "",
				});

			const tool = createGrepTool(mockExecutor);
			await tool.execute(
				"test-id",
				{ pattern: "hello", label: "test", path: "/src", recursive: false },
				undefined,
				undefined,
			);

			// 不应该包含 -r 标志
			expect(mockExecutor.exec).toHaveBeenCalledWith(
				expect.not.stringContaining("-r"),
			);
		});

		it("应该限制结果数量", async () => {
			(mockExecutor.exec as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({ code: 0, stdout: "exists", stderr: "" })
				.mockResolvedValueOnce({
					code: 0,
					stdout: "file.ts:1:hello",
					stderr: "",
				});

			const tool = createGrepTool(mockExecutor);
			await tool.execute(
				"test-id",
				{ pattern: "hello", label: "test", path: "/src", maxResults: 10 },
				undefined,
				undefined,
			);

			expect(mockExecutor.exec).toHaveBeenCalledWith(
				expect.stringContaining("head -n 10"),
			);
		});
	});

	describe("异常处理", () => {
		it("执行异常时应该返回错误信息", async () => {
			(mockExecutor.exec as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({ code: 0, stdout: "exists", stderr: "" })
				.mockRejectedValue(new Error("Grep failed"));

			const tool = createGrepTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{ pattern: "test", label: "test", path: "/src" },
				undefined,
				undefined,
			);

			expect(result.content[0].text).toContain("Error");
		});
	});
});
