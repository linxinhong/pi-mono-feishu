/**
 * Write Tool 单元测试
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createWriteTool } from "../../../../src/core/tools/write.js";
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

describe("createWriteTool", () => {
	let mockExecutor: Executor;

	beforeEach(() => {
		mockExecutor = createMockExecutor();
	});

	describe("工具定义", () => {
		it("应该有正确的 name 和 label", () => {
			const tool = createWriteTool(mockExecutor);
			expect(tool.name).toBe("write");
			expect(tool.label).toBe("Write");
		});

		it("应该有 description", () => {
			const tool = createWriteTool(mockExecutor);
			expect(tool.description).toContain("Create or overwrite");
		});
	});

	describe("文件写入", () => {
		it("成功写入时应该返回字节数", async () => {
			(mockExecutor.exec as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" }) // mkdir
				.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" }) // cat write
				.mockResolvedValue({ code: 0, stdout: "11", stderr: "" }); // wc -c

			const tool = createWriteTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{ path: "/test.txt", content: "hello world", label: "test" },
				undefined,
				undefined,
			);

			expect(result.content[0].text).toContain("Wrote");
			expect(result.content[0].text).toContain("bytes");
			expect(result.details?.path).toBe("/test.txt");
		});

		it("应该自动创建目录", async () => {
			const execMock = mockExecutor.exec as ReturnType<typeof vi.fn>;
			execMock
				.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" }) // mkdir
				.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" }) // cat write
				.mockResolvedValue({ code: 0, stdout: "11", stderr: "" }); // wc -c

			const tool = createWriteTool(mockExecutor);
			await tool.execute(
				"test-id",
				{ path: "/a/b/c/test.txt", content: "test", label: "test" },
				undefined,
				undefined,
			);

			expect(execMock).toHaveBeenNthCalledWith(
				1,
				expect.stringContaining("mkdir"),
			);
		});

		it("应该支持 base64 编码", async () => {
			(mockExecutor.exec as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" })
				.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" })
				.mockResolvedValue({ code: 0, stdout: "8", stderr: "" });

			const tool = createWriteTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{ path: "/binary.bin", content: "aGVsbG8=", label: "test", encoding: "base64" },
				undefined,
				undefined,
			);

			expect(result.details?.encoding).toBe("base64");
		});

		it("写入失败时应该返回错误", async () => {
			// mkdir 成功，但 cat 写入失败
			(mockExecutor.exec as ReturnType<typeof vi.fn>).mockImplementation(async (cmd: string) => {
				if (cmd.includes("mkdir")) {
					return { code: 0, stdout: "", stderr: "" };
				}
				if (cmd.includes("cat >")) {
					return { code: 1, stdout: "", stderr: "Permission denied" };
				}
				return { code: 0, stdout: "", stderr: "" };
			});

			const tool = createWriteTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{ path: "/readonly.txt", content: "test", label: "test" },
				undefined,
				undefined,
			);

			expect(result.content[0].text).toContain("Error writing file");
			expect(result.details?.error).toContain("Permission denied");
		});
	});

	describe("异常处理", () => {
		it("执行异常时应该返回错误信息", async () => {
			(mockExecutor.exec as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Write failed"));

			const tool = createWriteTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{ path: "/test.txt", content: "test", label: "test" },
				undefined,
				undefined,
			);

			expect(result.content[0].text).toContain("Error");
			expect(result.details?.error).toBe("Write failed");
		});
	});
});
