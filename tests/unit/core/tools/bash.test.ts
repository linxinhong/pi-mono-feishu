/**
 * Bash Tool 单元测试
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBashTool } from "../../../../src/core/tools/bash.js";
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

describe("createBashTool", () => {
	let mockExecutor: Executor;

	beforeEach(() => {
		mockExecutor = createMockExecutor();
	});

	describe("工具定义", () => {
		it("应该有正确的 name 和 label", () => {
			const tool = createBashTool(mockExecutor);
			expect(tool.name).toBe("bash");
			expect(tool.label).toBe("Bash");
		});

		it("应该有 description", () => {
			const tool = createBashTool(mockExecutor);
			expect(tool.description).toContain("shell command");
		});

		it("应该有正确的参数 schema", () => {
			const tool = createBashTool(mockExecutor);
			expect(tool.parameters).toBeDefined();
		});
	});

	describe("命令执行", () => {
		it("成功执行命令时应该返回输出", async () => {
			(mockExecutor.exec as ReturnType<typeof vi.fn>).mockResolvedValue({
				code: 0,
				stdout: "hello world",
				stderr: "",
			});

			const tool = createBashTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{ command: "echo hello", label: "test" },
				undefined,
				undefined,
			);

			expect(result.content[0].type).toBe("text");
			expect(result.content[0].text).toContain("hello world");
			expect(result.details?.exitCode).toBe(0);
		});

		it("命令失败时应该返回错误", async () => {
			(mockExecutor.exec as ReturnType<typeof vi.fn>).mockResolvedValue({
				code: 1,
				stdout: "",
				stderr: "command not found",
			});

			const tool = createBashTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{ command: "invalid-cmd", label: "test" },
				undefined,
				undefined,
			);

			expect(result.details?.exitCode).toBe(1);
		});

		it("应该包含 stderr 输出", async () => {
			(mockExecutor.exec as ReturnType<typeof vi.fn>).mockResolvedValue({
				code: 0,
				stdout: "stdout",
				stderr: "stderr",
			});

			const tool = createBashTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{ command: "test", label: "test" },
				undefined,
				undefined,
			);

			expect(result.content[0].text).toContain("stderr");
		});

		it("没有输出时应该返回 (no output)", async () => {
			(mockExecutor.exec as ReturnType<typeof vi.fn>).mockResolvedValue({
				code: 0,
				stdout: "",
				stderr: "",
			});

			const tool = createBashTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{ command: "true", label: "test" },
				undefined,
				undefined,
			);

			expect(result.content[0].text).toBe("(no output)");
		});

		it("应该支持自定义 timeout", async () => {
			(mockExecutor.exec as ReturnType<typeof vi.fn>).mockResolvedValue({
				code: 0,
				stdout: "done",
				stderr: "",
			});

			const tool = createBashTool(mockExecutor);
			await tool.execute(
				"test-id",
				{ command: "sleep 1", label: "test", timeout: 5000 },
				undefined,
				undefined,
			);

			expect(mockExecutor.exec).toHaveBeenCalledWith(expect.stringContaining("sleep 1"), {
				timeout: 5000,
			});
		});

		it("应该支持自定义 cwd", async () => {
			(mockExecutor.exec as ReturnType<typeof vi.fn>).mockResolvedValue({
				code: 0,
				stdout: "done",
				stderr: "",
			});

			const tool = createBashTool(mockExecutor);
			await tool.execute(
				"test-id",
				{ command: "ls", label: "test", cwd: "/tmp" },
				undefined,
				undefined,
			);

			expect(mockExecutor.exec).toHaveBeenCalledWith(expect.stringContaining("cd \"/tmp\""), {
				timeout: 30000,
			});
		});
	});

	describe("异常处理", () => {
		it("执行异常时应该返回错误信息", async () => {
			(mockExecutor.exec as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Execution failed"));

			const tool = createBashTool(mockExecutor);
			const result = await tool.execute(
				"test-id",
				{ command: "test", label: "test" },
				undefined,
				undefined,
			);

			expect(result.content[0].text).toContain("Error:");
			expect(result.details?.error).toBe("Execution failed");
		});
	});
});
