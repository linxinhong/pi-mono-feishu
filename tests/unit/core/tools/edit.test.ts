/**
 * Edit Tool 单元测试
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEditTool } from "../../../../src/core/tools/edit.js";
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

describe("createEditTool", () => {
	let mockExecutor: Executor;

	beforeEach(() => {
		mockExecutor = createMockExecutor();
	});

	describe("工具定义", () => {
		it("应该有正确的 name 和 label", () => {
			const tool = createEditTool(mockExecutor);
			expect(tool.name).toBe("edit");
			expect(tool.label).toBe("Edit");
		});

		it("应该有 description", () => {
			const tool = createEditTool(mockExecutor);
			expect(tool.description).toContain("Edit a file");
		});
	});

	describe("文件检查", () => {
		it("文件不存在时应该返回错误", async () => {
			(mockExecutor.exec as ReturnType<typeof vi.fn>).mockResolvedValue({
				code: 0,
				stdout: "not_found",
				stderr: "",
			});

			const tool = createEditTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{ path: "/nonexistent.txt", old_string: "old", new_string: "new", label: "test" },
				undefined,
				undefined,
			);

			expect(result.content[0].text).toContain("File not found");
			expect(result.details?.error).toBe("not_found");
		});

		it("old_string 为空时应该返回错误", async () => {
			(mockExecutor.exec as ReturnType<typeof vi.fn>).mockResolvedValue({
				code: 0,
				stdout: "exists",
				stderr: "",
			});

			const tool = createEditTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{ path: "/test.txt", old_string: "", new_string: "new", label: "test" },
				undefined,
				undefined,
			);

			expect(result.content[0].text).toContain("cannot be empty");
		});
	});

	describe("单次替换", () => {
		it("成功替换时应该返回成功信息", async () => {
			const fileContent = "line1\nold text\nline3";
			(mockExecutor.exec as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({ code: 0, stdout: "exists", stderr: "" })
				.mockResolvedValueOnce({ code: 0, stdout: fileContent, stderr: "" })
				.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" });

			const tool = createEditTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{ path: "/test.txt", old_string: "old text", new_string: "new text", label: "test" },
				undefined,
				undefined,
			);

			expect(result.content[0].text).toContain("Edited");
			expect(result.details?.replaced).toBe(1);
		});

		it("old_string 不存在时应该返回错误", async () => {
			const fileContent = "line1\nline2\nline3";
			(mockExecutor.exec as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({ code: 0, stdout: "exists", stderr: "" })
				.mockResolvedValueOnce({ code: 0, stdout: fileContent, stderr: "" });

			const tool = createEditTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{ path: "/test.txt", old_string: "not found", new_string: "new", label: "test" },
				undefined,
				undefined,
			);

			expect(result.content[0].text).toContain("not found");
		});

		it("old_string 不唯一时应该返回错误", async () => {
			const fileContent = "line1\nold text\nold text\nline4";
			(mockExecutor.exec as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({ code: 0, stdout: "exists", stderr: "" })
				.mockResolvedValueOnce({ code: 0, stdout: fileContent, stderr: "" });

			const tool = createEditTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{ path: "/test.txt", old_string: "old text", new_string: "new text", label: "test" },
				undefined,
				undefined,
			);

			expect(result.content[0].text).toContain("2 occurrences");
			expect(result.details?.error).toBe("not_unique");
		});
	});

	describe("全部替换", () => {
		it("replace_all=true 时应该替换所有出现", async () => {
			const fileContent = "line1\nold text\nold text\nline4";
			(mockExecutor.exec as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({ code: 0, stdout: "exists", stderr: "" })
				.mockResolvedValueOnce({ code: 0, stdout: fileContent, stderr: "" })
				.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" });

			const tool = createEditTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{
					path: "/test.txt",
					old_string: "old text",
					new_string: "new text",
					label: "test",
					replace_all: true,
				},
				undefined,
				undefined,
			);

			expect(result.content[0].text).toContain("Replaced 2");
			expect(result.details?.occurrences).toBe(2);
		});

		it("replace_all=true 但没有匹配时应该返回错误", async () => {
			const fileContent = "line1\nline2\nline3";
			(mockExecutor.exec as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({ code: 0, stdout: "exists", stderr: "" })
				.mockResolvedValueOnce({ code: 0, stdout: fileContent, stderr: "" });

			const tool = createEditTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{
					path: "/test.txt",
					old_string: "not found",
					new_string: "new",
					label: "test",
					replace_all: true,
				},
				undefined,
				undefined,
			);

			expect(result.content[0].text).toContain("not found");
			expect(result.details?.occurrences).toBe(0);
		});
	});

	describe("异常处理", () => {
		it("读取文件异常时应该返回错误信息", async () => {
			(mockExecutor.exec as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({ code: 0, stdout: "exists", stderr: "" })
				.mockRejectedValue(new Error("Read failed"));

			const tool = createEditTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{ path: "/test.txt", old_string: "old", new_string: "new", label: "test" },
				undefined,
				undefined,
			);

			expect(result.content[0].text).toContain("Error");
		});
	});
});
