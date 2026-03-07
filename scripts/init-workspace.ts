#!/usr/bin/env node
/**
 * Workspace 初始化脚本 (TypeScript 版本)
 *
 * 用法:
 *   npx tsx scripts/init-workspace.ts [workspace-dir] [--force]
 *
 * 选项:
 *   --force    强制覆盖已存在的文件
 *   --dry-run  只显示会创建的文件，不实际创建
 */

import { chmodSync, copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "fs";
import { homedir } from "os";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

// ESM 获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 解析命令行参数
const args = process.argv.slice(2);
const forceMode = args.includes("--force");
const dryRun = args.includes("--dry-run");
const workspaceArg = args.find((a) => !a.startsWith("--"));

// 默认 workspace 目录
const DEFAULT_WORKSPACE = join(homedir(), ".pi", "feishu");
const WORKSPACE = resolve(workspaceArg || DEFAULT_WORKSPACE);

// 模板目录
const TEMPLATES_DIR = join(__dirname, "..", "templates");

// ============================================================================
// 类型定义
// ============================================================================

interface FileConfig {
	path: string;
	content?: string;
	template?: string;
	permissions?: number;
	readonly?: boolean;
	replaceVars?: boolean;
}

// ============================================================================
// 文件配置
// ============================================================================

const FILES: FileConfig[] = [
	// Boot 文件 - 只读配置
	{
		path: "boot/soul.md",
		template: "boot/soul.md",
		permissions: 0o600,
		readonly: true,
	},
	{
		path: "boot/identity.md",
		template: "boot/identity.md",
		permissions: 0o600,
		readonly: true,
	},
	{
		path: "boot/tools.md",
		template: "boot/tools.md",
		permissions: 0o600,
		readonly: true,
	},

	// Boot 文件 - 可编辑配置
	{
		path: "boot/profile.md",
		template: "boot/profile.md",
		permissions: 0o644,
	},

	// Memory 文件
	{
		path: "memory/memory.md",
		content: "# 长期记忆\n\n> 此文件由 AI 自动维护。\n\n(暂无记忆)\n",
		permissions: 0o644,
	},

	// 配置文件
	{
		path: "feishu.json",
		content: generateFeishuConfig,
		permissions: 0o600,
		replaceVars: true,
	},
	{
		path: "settings.json",
		content: generateSettingsConfig,
		permissions: 0o644,
	},
	{
		path: "SYSTEM.md",
		content: "# 系统配置日志\n\n> 记录所有系统级别的修改。\n\n(暂无记录)\n",
		permissions: 0o644,
	},

	// 目录占位
	{
		path: "skills/.gitkeep",
		content: "# Skills 目录\n\n存放自定义技能。\n",
	},
	{
		path: "events/.gitkeep",
		content: "# Events 目录\n\n存放定时事件。\n",
	},
	{
		path: "chats/.gitkeep",
		content: "# Chats 目录\n\n存放频道数据（自动创建）。\n",
	},
];

// ============================================================================
// 配置生成函数
// ============================================================================

function generateFeishuConfig(): string {
	return JSON.stringify(
		{
			appId: "${FEISHU_APP_ID}",
			appSecret: "${FEISHU_APP_SECRET}",
			model: "${FEISHU_MODEL:-bailian/qwen3.5-plus}",
			workingDir: "${WORKSPACE}",
			port: 3000,
			useWebSocket: true,
			plugins: {
				agent: { enabled: true, maxHistoryMessages: 20 },
				voice: { enabled: true, defaultVoice: "Cherry" },
				memory: { enabled: true, maxHistoryMessages: 10 },
				card: { enabled: true },
				event: { enabled: false },
			},
		},
		null,
		2,
	);
}

function generateSettingsConfig(): string {
	return JSON.stringify(
		{
			defaultProvider: "bailian",
			defaultModel: "qwen3.5-plus",
			compaction: {
				enabled: true,
				reserveTokens: 16384,
				keepRecentTokens: 20000,
			},
			retry: {
				enabled: true,
				maxRetries: 3,
				baseDelayMs: 2000,
			},
		},
		null,
		2,
	);
}

// ============================================================================
// 工具函数
// ============================================================================

function log(emoji: string, message: string): void {
	console.log(`   ${emoji} ${message}`);
}

function replaceVariables(content: string): string {
	return content
		.replace(/\$\{WORKSPACE\}/g, WORKSPACE)
		.replace(/\$\{FEISHU_APP_ID\}/g, process.env.FEISHU_APP_ID || "your_app_id")
		.replace(/\$\{FEISHU_APP_SECRET\}/g, process.env.FEISHU_APP_SECRET || "your_app_secret")
		.replace(/\$\{FEISHU_MODEL:-([^}]+)\}/g, (_, defaultVal) => process.env.FEISHU_MODEL || defaultVal);
}

// ============================================================================
// 主逻辑
// ============================================================================

async function main(): Promise<void> {
	console.log(`\n🚀 Initializing workspace: ${WORKSPACE}\n`);

	if (dryRun) {
		console.log("📋 Dry run mode - showing what would be created:\n");
	}

	// 创建目录
	console.log("📁 Creating directory structure...");
	const dirs = new Set<string>();
	for (const file of FILES) {
		dirs.add(dirname(join(WORKSPACE, file.path)));
	}

	for (const dir of dirs) {
		if (dryRun) {
			log("📂", `Would create: ${dir}`);
		} else if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
			log("✅", `Created: ${dir}`);
		} else {
			log("⏭️", `Exists: ${dir}`);
		}
	}

	// 创建文件
	console.log("\n📄 Creating files...");

	for (const file of FILES) {
		const fullPath = join(WORKSPACE, file.path);

		// 检查文件是否存在
		if (existsSync(fullPath) && !forceMode) {
			log("⏭️", `Exists: ${file.path}`);
			continue;
		}

		if (dryRun) {
			const status = file.readonly ? "🔒 (readonly)" : "";
			log("📝", `Would create: ${file.path} ${status}`);
			continue;
		}

		// 获取内容
		let content: string;
		if (file.template) {
			const templatePath = join(TEMPLATES_DIR, file.template);
			if (existsSync(templatePath)) {
				content = require("fs").readFileSync(templatePath, "utf-8");
			} else {
				console.warn(`   ⚠️ Template not found: ${file.template}`);
				continue;
			}
		} else if (typeof file.content === "function") {
			content = file.content();
		} else {
			content = file.content || "";
		}

		// 替换变量
		if (file.replaceVars) {
			content = replaceVariables(content);
		}

		// 写入文件
		writeFileSync(fullPath, content, "utf-8");

		// 设置权限
		if (file.permissions) {
			chmodSync(fullPath, file.permissions);
		}

		// 日志
		if (file.readonly) {
			log("🔒", `${file.path} (600)`);
		} else {
			log("✅", file.path);
		}
	}

	// 完成
	if (dryRun) {
		console.log("\n📋 Dry run complete. Run without --dry-run to create files.\n");
		return;
	}

	console.log(`
✅ Workspace initialized successfully!

📋 Next steps:

   1. Edit configuration:
      ${join(WORKSPACE, "feishu.json")}

   2. Edit your profile:
      ${join(WORKSPACE, "boot/profile.md")}

   3. (Optional) Customize identity (readonly):
      ${join(WORKSPACE, "boot/soul.md")}
      ${join(WORKSPACE, "boot/identity.md")}
      ${join(WORKSPACE, "boot/tools.md")}

   4. Start the bot:
      npm run dev

🔒 Protected files (600):
   - boot/soul.md
   - boot/identity.md
   - boot/tools.md

   To modify protected files:
   npm run unlock
   # edit files
   npm run lock
`);
}

main().catch((err) => {
	console.error("❌ Error:", err.message);
	process.exit(1);
});
