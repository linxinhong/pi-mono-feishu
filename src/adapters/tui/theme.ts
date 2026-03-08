/**
 * TUI Theme
 *
 * TUI 主题配置
 */

import type { TUITheme } from "./types.js";

// 使用 ANSI 颜色代码
const colors = {
	// 前景色
	red: (text: string) => `\x1b[31m${text}\x1b[0m`,
	green: (text: string) => `\x1b[32m${text}\x1b[0m`,
	yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
	blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
	magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
	cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
	white: (text: string) => `\x1b[37m${text}\x1b[0m`,
	gray: (text: string) => `\x1b[90m${text}\x1b[0m`,

	// 亮色
	brightRed: (text: string) => `\x1b[91m${text}\x1b[0m`,
	brightGreen: (text: string) => `\x1b[92m${text}\x1b[0m`,
	brightYellow: (text: string) => `\x1b[93m${text}\x1b[0m`,
	brightBlue: (text: string) => `\x1b[94m${text}\x1b[0m`,
	brightMagenta: (text: string) => `\x1b[95m${text}\x1b[0m`,
	brightCyan: (text: string) => `\x1b[96m${text}\x1b[0m`,
	brightWhite: (text: string) => `\x1b[97m${text}\x1b[0m`,

	// 背景色
	bgRed: (text: string) => `\x1b[41m${text}\x1b[0m`,
	bgGreen: (text: string) => `\x1b[42m${text}\x1b[0m`,
	bgYellow: (text: string) => `\x1b[43m${text}\x1b[0m`,
	bgBlue: (text: string) => `\x1b[44m${text}\x1b[0m`,
	bgMagenta: (text: string) => `\x1b[45m${text}\x1b[0m`,
	bgCyan: (text: string) => `\x1b[46m${text}\x1b[0m`,
	bgWhite: (text: string) => `\x1b[47m${text}\x1b[0m`,
	bgGray: (text: string) => `\x1b[100m${text}\x1b[0m`,

	// 样式
	bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
	dim: (text: string) => `\x1b[2m${text}\x1b[0m`,
	italic: (text: string) => `\x1b[3m${text}\x1b[0m`,
	underline: (text: string) => `\x1b[4m${text}\x1b[0m`,
	strikethrough: (text: string) => `\x1b[9m${text}\x1b[0m`,
};

/**
 * 默认暗色主题
 */
export const darkTheme: TUITheme = {
	// 颜色
	primary: colors.brightCyan,
	secondary: colors.brightBlue,
	success: colors.brightGreen,
	warning: colors.brightYellow,
	error: colors.brightRed,
	info: colors.brightBlue,
	muted: colors.gray,

	// 背景
	bgPrimary: colors.bgBlue,
	bgSecondary: colors.bgGray,

	// 边框
	border: colors.gray,
	borderActive: colors.brightCyan,

	// Markdown 组件主题
	markdown: {
		heading: colors.brightCyan,
		link: colors.brightBlue,
		linkUrl: colors.gray,
		code: colors.brightYellow,
		codeBlock: colors.white,
		codeBlockBorder: colors.gray,
		quote: colors.gray,
		quoteBorder: colors.brightBlue,
		hr: colors.gray,
		listBullet: colors.brightCyan,
		bold: (text) => colors.bold(colors.white(text)),
		italic: colors.italic,
		strikethrough: colors.strikethrough,
		underline: colors.underline,
	},

	// SelectList 主题
	selectList: {
		selectedPrefix: colors.brightGreen,
		selectedText: colors.brightWhite,
		description: colors.gray,
		scrollInfo: colors.brightBlue,
		noMatch: colors.gray,
	},

	// Editor 主题
	editor: {
		borderColor: colors.brightCyan,
		selectList: {
			selectedPrefix: colors.brightGreen,
			selectedText: colors.brightWhite,
			description: colors.gray,
			scrollInfo: colors.brightBlue,
			noMatch: colors.gray,
		},
	},

	// SettingsList 主题
	settingsList: {
		label: (text, selected) => selected ? colors.brightWhite(text) : colors.white(text),
		value: (text, selected) => selected ? colors.brightCyan(text) : colors.cyan(text),
		description: colors.gray,
		cursor: ">",
		hint: colors.gray,
	},
};

/**
 * 创建自定义主题
 */
export function createTheme(custom: Partial<TUITheme>): TUITheme {
	return {
		...darkTheme,
		...custom,
		markdown: {
			...darkTheme.markdown,
			...custom.markdown,
		},
		selectList: {
			...darkTheme.selectList,
			...custom.selectList,
		},
		editor: {
			...darkTheme.editor,
			...custom.editor,
			selectList: {
				...darkTheme.editor.selectList,
				...custom.editor?.selectList,
			},
		},
		settingsList: {
			...darkTheme.settingsList,
			...custom.settingsList,
		},
	};
}
