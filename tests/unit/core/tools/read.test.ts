/**
 * Read Tool 单元测试
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createReadTool } from "../../../../src/core/tools/read.js";
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

describe("createReadTool", () => {
	let mockExecutor: Executor;

	beforeEach(() => {
		mockExecutor = createMockExecutor();
	});

	describe("工具定义", () => {
		it("应该有正确的 name 和 label", () => {
			const tool = createReadTool(mockExecutor);
			expect(tool.name).toBe("read");
			expect(tool.label).toBe("Read");
		});

		it("应该有 description", () => {
			const tool = createReadTool(mockExecutor);
			expect(tool.description).toContain("Read a file");
		});
	});

	describe("文件检查", () => {
		it("文件不存在时应该返回错误", async () => {
			(mockExecutor.exec as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({ code: 0, stdout: "not_found", stderr: "" })
				.mockResolvedValue({ code: 0, stdout: "", stderr: "" });

			const tool = createReadTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{ path: "/nonexistent.txt", label: "test" },
				undefined,
				undefined,
			);

			expect(result.content[0].text).toContain("File not found");
			expect(result.details?.error).toBe("not_found");
		});

		it("路径是目录时应该返回错误", async () => {
			(mockExecutor.exec as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({ code: 0, stdout: "exists", stderr: "" })
				.mockResolvedValueOnce({ code: 0, stdout: "is_dir", stderr: "" });

			const tool = createReadTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{ path: "/some/dir", label: "test" },
				undefined,
				undefined,
			);

			expect(result.content[0].text).toContain("directory");
			expect(result.details?.error).toBe("is_directory");
		});
	});

	describe("UTF-8 读取", () => {
		it("应该正确读取文件内容", async () => {
			(mockExecutor.exec as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({ code: 0, stdout: "exists", stderr: "" })
				.mockResolvedValueOnce({ code: 0, stdout: "not_dir", stderr: "" })
				.mockResolvedValueOnce({
					code: 0,
					stdout: "     1\tline1\n     2\tline2\n",
					stderr: "",
				})
				.mockResolvedValue({ code: 0, stdout: "10", stderr: "" });

			const tool = createReadTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{ path: "/test.txt", label: "test" },
				undefined,
				undefined,
			);

			expect(result.content[0].text).toContain("line1");
			expect(result.details?.encoding).toBe("utf8");
		});

		it("应该支持 offset 和 limit", async () => {
			(mockExecutor.exec as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({ code: 0, stdout: "exists", stderr: "" })
				.mockResolvedValueOnce({ code: 0, stdout: "not_dir", stderr: "" })
				.mockResolvedValueOnce({
					code: 0,
					stdout: "     5\tline5\n     6\tline6\n",
					stderr: "",
				})
				.mockResolvedValue({ code: 0, stdout: "100", stderr: "" });

			const tool = createReadTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{ path: "/test.txt", label: "test", offset: 5, limit: 2 },
				undefined,
				undefined,
			);

			expect(result.details?.linesRead).toBe(2);
		});

		it("空文件应该返回 (empty file)", async () => {
			(mockExecutor.exec as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({ code: 0, stdout: "exists", stderr: "" })
				.mockResolvedValueOnce({ code: 0, stdout: "not_dir", stderr: "" })
				.mockResolvedValueOnce({
					code: 0,
					stdout: "",
					stderr: "",
				})
				.mockResolvedValue({ code: 0, stdout: "0", stderr: "" });

			const tool = createReadTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{ path: "/empty.txt", label: "test" },
				undefined,
				undefined,
			);

			expect(result.content[0].text).toBe("(empty file)");
		});
	});

	describe("Base64 读取", () => {
		it("二进制文件应该使用 base64 编码", async () => {
			(mockExecutor.exec as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({ code: 0, stdout: "exists", stderr: "" })
				.mockResolvedValueOnce({ code: 0, stdout: "not_dir", stderr: "" })
				.mockResolvedValueOnce({
					code: 0,
					stdout: "aGVsbG8=",
					stderr: "",
				})
				.mockResolvedValue({
					code: 0,
					stdout: "image/png",
					stderr: "",
				});

			const tool = createReadTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{ path: "/image.png", label: "test" },
				undefined,
				undefined,
			);

			expect(result.content[0].text).toContain("base64");
			expect(result.details?.encoding).toBe("base64");
			expect(result.details?.mimeType).toBe("image/png");
		});

		it("指定 base64 encoding 时应该使用 base64", async () => {
			(mockExecutor.exec as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({ code: 0, stdout: "exists", stderr: "" })
				.mockResolvedValueOnce({ code: 0, stdout: "not_dir", stderr: "" })
				.mockResolvedValueOnce({
					code: 0,
					stdout: "aGVsbG8=",
					stderr: "",
				})
				.mockResolvedValue({
					code: 0,
					stdout: "text/plain",
					stderr: "",
				});

			const tool = createReadTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{ path: "/file.txt", label: "test", encoding: "base64" },
				undefined,
				undefined,
			);

			expect(result.details?.encoding).toBe("base64");
		});
	});
});
