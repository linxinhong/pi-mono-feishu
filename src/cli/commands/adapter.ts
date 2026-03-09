/**
 * adapter 命令 - 适配器管理
 */

import { Command } from "commander";
import { printTable, printInfo, COLORS } from "../utils/output.js";

// ============================================================================
// 已知适配器列表
// ============================================================================

const KNOWN_ADAPTERS: { id: string; name: string; version: string; type: string }[] = [
	// 适配器将通过插件系统加载
];

// ============================================================================
// 命令实现
// ============================================================================

export function registerAdapterCommand(program: Command): void {
	const adapter = program.command("adapter").description("适配器管理");

	// adapter ls
	adapter
		.command("ls")
		.description("查看各个 adapter 状态")
		.action(async () => {
			// 构建表格数据
			const headers = ["ID", "Name", "Version", "Type", "Status"];
			const rows: string[][] = [];

			if (KNOWN_ADAPTERS.length === 0) {
				console.log(`\n${COLORS.bright}No adapters registered${COLORS.reset}`);
				console.log(`${COLORS.dim}Adapters will be loaded via plugin system${COLORS.reset}\n`);
				return;
			}

			for (const meta of KNOWN_ADAPTERS) {
				const status = `${COLORS.green}available${COLORS.reset}`;
				rows.push([meta.id, meta.name, `v${meta.version}`, meta.type, status]);
			}

			console.log(`\n${COLORS.bright}Available Adapters${COLORS.reset}\n`);
			printTable(headers, rows);
			console.log();
		});
}
