/**
 * RTK Tool - Token-optimized command execution
 *
 * 使用 rtk (Rust Token Killer) 执行命令，减少 60-90% token 消耗
 * GitHub: https://github.com/rtk-ai/rtk
 */

import { Type, Static } from "@sinclair/typebox";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import type { Executor } from "../sandbox/index.js";

// ============================================================================
// Schema
// ============================================================================

const RtkToolSchema = Type.Object({
	/** rtk 子命令 */
	subcommand: Type.Union([
		Type.Literal("ls", { description: "目录列表 (token 优化)" }),
		Type.Literal("read", { description: "智能文件读取" }),
		Type.Literal("grep", { description: "搜索 (分组结果)" }),
		Type.Literal("find", { description: "查找文件" }),
		Type.Literal("diff", { description: "文件差异比较" }),
		Type.Literal("smart", { description: "代码摘要 (2行启发式)" }),
		Type.Literal("git", { description: "Git 操作" }),
		Type.Literal("gh", { description: "GitHub CLI" }),
		Type.Literal("test", { description: "测试运行器 (仅显示失败)" }),
		Type.Literal("err", { description: "仅显示错误/警告" }),
		Type.Literal("lint", { description: "Lint 工具" }),
		Type.Literal("docker", { description: "Docker 操作" }),
		Type.Literal("kubectl", { description: "Kubernetes 操作" }),
		Type.Literal("json", { description: "JSON 结构预览" }),
		Type.Literal("deps", { description: "依赖摘要" }),
		Type.Literal("log", { description: "日志去重" }),
		Type.Literal("gain", { description: "Token 节省统计" }),
		Type.Literal("discover", { description: "发现节省机会" }),
		Type.Literal("summary", { description: "命令输出摘要" }),
		Type.Literal("proxy", { description: "原始透传 + 追踪" }),
	], { description: "rtk 子命令" }),
	/** 子命令参数 */
	args: Type.String({ description: "子命令的参数，例如: 'status' (for git), 'file.rs' (for read)" }),
	/** 额外参数 */
	extraArgs: Type.Optional(Type.String({ description: "额外的命令行参数，例如: '-l aggressive' (for read)" })),
	/** 工作目录 */
	cwd: Type.Optional(Type.String({ description: "工作目录 (默认: workspace root)" })),
	/** 超时时间 */
	timeout: Type.Optional(Type.Number({ description: "超时时间 (毫秒，默认: 30000)" })),
	/** 超紧凑模式 */
	ultraCompact: Type.Optional(Type.Boolean({ description: "使用 ASCII 图标，内联格式 (额外节省 token)" })),
});

type RtkToolParams = Static<typeof RtkToolSchema>;

// ============================================================================
// RTK Tool
// ============================================================================

/**
 * 检查 rtk 是否可用
 */
async function checkRtkAvailable(executor: Executor): Promise<boolean> {
	try {
		const result = await executor.exec("rtk --version", { timeout: 5000 });
		return result.code === 0;
	} catch {
		return false;
	}
}

/**
 * 构建 rtk 命令
 */
function buildRtkCommand(params: RtkToolParams): string {
	const parts = ["rtk"];

	// 添加超紧凑模式
	if (params.ultraCompact) {
		parts.push("-u");
	}

	// 添加子命令
	parts.push(params.subcommand);

	// 添加主要参数
	if (params.args) {
		parts.push(params.args);
	}

	// 添加额外参数
	if (params.extraArgs) {
		parts.push(params.extraArgs);
	}

	return parts.join(" ");
}

/**
 * 获取子命令的使用示例
 */
function getSubcommandExamples(subcommand: string): string[] {
	const examples: Record<string, string[]> = {
		ls: ["rtk ls .", "rtk ls src/"],
		read: ["rtk read file.rs", "rtk read file.rs -l aggressive"],
		grep: ["rtk grep 'pattern' .", "rtk grep 'TODO' src/"],
		find: ["rtk find '*.rs' .", "rtk find '*.ts' src/"],
		git: ["rtk git status", "rtk git log -n 10", "rtk git diff"],
		gh: ["rtk gh pr list", "rtk gh issue list"],
		test: ["rtk test cargo test", "rtk test npm test", "rtk pytest"],
		lint: ["rtk lint", "rtk lint biome", "rtk ruff check"],
		docker: ["rtk docker ps", "rtk docker logs <container>"],
		gain: ["rtk gain", "rtk gain --graph"],
	};
	return examples[subcommand] || [];
}

export function createRtkTool(executor: Executor): AgentTool<typeof RtkToolSchema> {
	let rtkAvailable: boolean | null = null;

	return {
		name: "rtk",
		label: "RTK",
		description: `Token-optimized command execution using rtk (Rust Token Killer).
Reduces token consumption by 60-90% on common dev commands.

Examples:
- rtk ls .                    # Compact directory tree
- rtk git status              # Compact git status
- rtk read file.rs            # Smart file reading
- rtk grep 'pattern' .        # Grouped search results
- rtk test cargo test         # Test results (failures only)
- rtk gain                    # Token savings stats

Use this instead of bash for: ls, cat/read, grep, git, test, lint commands.`,
		parameters: RtkToolSchema,
		execute: async (_toolCallId, params: RtkToolParams, _signal, _onUpdate) => {
			const { cwd, timeout = 30000 } = params;

			// 首次使用时检查 rtk 是否可用
			if (rtkAvailable === null) {
				rtkAvailable = await checkRtkAvailable(executor);
			}

			// 如果 rtk 不可用，返回错误提示
			if (!rtkAvailable) {
				return {
					content: [{
						type: "text" as const,
						text: `Error: rtk is not installed.

Install rtk with one of:
  brew install rtk
  curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh
  cargo install --git https://github.com/rtk-ai/rtk

See: https://github.com/rtk-ai/rtk`,
					}],
					details: { error: "rtk not installed" },
				};
			}

			try {
				// 构建命令
				const command = buildRtkCommand(params);
				const fullCommand = cwd ? `cd "${cwd}" && ${command}` : command;

				// 执行命令
				const result = await executor.exec(fullCommand, { timeout });

				let output = "";
				if (result.stdout) output += result.stdout;
				if (result.stderr) output += `\n[stderr]\n${result.stderr}`;

				return {
					content: [{ type: "text" as const, text: output || "(no output)" }],
					details: {
						exitCode: result.code || 0,
						command: fullCommand,
					},
				};
			} catch (error: any) {
				return {
					content: [{ type: "text" as const, text: `Error: ${error.message}` }],
					details: { error: error.message },
				};
			}
		},
	};
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * 预设的 rtk 命令构建器
 */
export const rtkCommands = {
	/** 目录列表 */
	ls: (path: string = ".") => `rtk ls ${path}`,

	/** 智能文件读取 */
	read: (file: string, aggressive: boolean = false) =>
		aggressive ? `rtk read ${file} -l aggressive` : `rtk read ${file}`,

	/** 代码摘要 */
	smart: (file: string) => `rtk smart ${file}`,

	/** 搜索 */
	grep: (pattern: string, path: string = ".") => `rtk grep "${pattern}" ${path}`,

	/** 查找文件 */
	find: (pattern: string, path: string = ".") => `rtk find "${pattern}" ${path}`,

	/** Git 状态 */
	gitStatus: () => "rtk git status",

	/** Git 日志 */
	gitLog: (n: number = 10) => `rtk git log -n ${n}`,

	/** Git 差异 */
	gitDiff: () => "rtk git diff",

	/** 测试运行 */
	test: (testCommand: string) => `rtk test ${testCommand}`,

	/** 仅错误 */
	err: (command: string) => `rtk err ${command}`,

	/** Lint */
	lint: (linter?: string) => linter ? `rtk lint ${linter}` : "rtk lint",

	/** Token 节省统计 */
	gain: (graph: boolean = false) => graph ? "rtk gain --graph" : "rtk gain",

	/** Docker ps */
	dockerPs: () => "rtk docker ps",

	/** Docker logs */
	dockerLogs: (container: string) => `rtk docker logs ${container}`,
};
