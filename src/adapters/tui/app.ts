/**
 * Pi Claw TUI Application
 *
 * TUI 主应用类
 */

import {
	TUI,
	ProcessTerminal,
	Container,
	Text,
	Spacer,
	Box,
	Loader,
	SelectList,
	TruncatedText,
	matchesKey,
	Key,
	truncateToWidth,
} from "@mariozechner/pi-tui";
import type { Component, Focusable } from "@mariozechner/pi-tui";
import type { TUIMode, TUIEvent, TUIEventListener, StartupOption, ChatMessage, LogMessage, AdapterStatus } from "./types.js";
import { darkTheme } from "./theme.js";
import type { TUITheme } from "./types.js";

// ============================================================================
// Types
// ============================================================================

interface PiClawTUIConfig {
	/** 工作目录 */
	workingDir?: string;
	/** 配置文件路径 */
	configPath?: string;
	/** 初始模式 */
	initialMode?: TUIMode;
	/** 主题 */
	theme?: TUITheme;
}

// ============================================================================
// Startup Menu Component
// ============================================================================

class StartupMenu implements Component, Focusable {
	private tui: TUI;
	private theme: TUITheme;
	private selectedIndex = 0;
	private options: StartupOption[];
	public focused = false;
	public onSelect?: (option: StartupOption) => void;
	public onCancel?: () => void;

	constructor(tui: TUI, theme: TUITheme) {
		this.tui = tui;
		this.theme = theme;
		this.options = [
			{
				value: "chat",
				label: "Chat Mode",
				description: "Interactive chat with AI agent",
				mode: "chat",
			},
			{
				value: "monitor",
				label: "Monitor Mode",
				description: "Monitor adapter status and message logs",
				mode: "monitor",
			},
			{
				value: "both",
				label: "Combined Mode",
				description: "Chat with AI and monitor adapters",
				mode: "both",
			},
		];
	}

	handleInput(data: string): void {
		if (matchesKey(data, Key.up)) {
			this.selectedIndex = Math.max(0, this.selectedIndex - 1);
			this.tui.requestRender();
		} else if (matchesKey(data, Key.down)) {
			this.selectedIndex = Math.min(this.options.length - 1, this.selectedIndex + 1);
			this.tui.requestRender();
		} else if (matchesKey(data, Key.enter)) {
			this.onSelect?.(this.options[this.selectedIndex]);
		} else if (matchesKey(data, Key.escape) || matchesKey(data, Key.ctrl("c"))) {
			this.onCancel?.();
		}
	}

	invalidate(): void {}

	render(width: number): string[] {
		const lines: string[] = [];

		// Title
		const title = this.theme.primary("  Pi Claw TUI");
		lines.push(title);
		lines.push(this.theme.muted("  Select a mode to start:"));
		lines.push("");

		// Options
		for (let i = 0; i < this.options.length; i++) {
			const opt = this.options[i];
			const isSelected = i === this.selectedIndex;
			const prefix = isSelected ? this.theme.success("> ") : "  ";
			const label = isSelected ? this.theme.primary(opt.label) : opt.label;
			const desc = this.theme.muted(`    ${opt.description}`);

			lines.push(`${prefix}${label}`);
			lines.push(desc);
			lines.push("");
		}

		// Help
		lines.push(this.theme.muted("  ↑/↓: Navigate  Enter: Select  Esc: Exit"));

		return lines.map((line) => truncateToWidth(line, width));
	}
}

// ============================================================================
// Chat Panel Component
// ============================================================================

class ChatPanel extends Container implements Focusable {
	private tui: TUI;
	private theme: TUITheme;
	private messages: ChatMessage[] = [];
	private currentChannelId = "default";
	private inputBuffer = "";
	private cursorPos = 0;
	public focused = false;
	public onSendMessage?: (content: string, channelId: string) => void;

	constructor(tui: TUI, theme: TUITheme) {
		super();
		this.tui = tui;
		this.theme = theme;
	}

	addMessage(message: ChatMessage): void {
		this.messages.push(message);
		this.tui.requestRender();
	}

	clearMessages(): void {
		this.messages = [];
		this.tui.requestRender();
	}

	setChannel(channelId: string): void {
		this.currentChannelId = channelId;
		this.tui.requestRender();
	}

	handleInput(data: string): void {
		if (matchesKey(data, Key.enter)) {
			if (this.inputBuffer.trim()) {
				this.onSendMessage?.(this.inputBuffer.trim(), this.currentChannelId);
				this.inputBuffer = "";
				this.cursorPos = 0;
			}
		} else if (matchesKey(data, Key.backspace)) {
			if (this.cursorPos > 0) {
				this.inputBuffer = this.inputBuffer.slice(0, this.cursorPos - 1) + this.inputBuffer.slice(this.cursorPos);
				this.cursorPos--;
			}
		} else if (matchesKey(data, Key.delete)) {
			if (this.cursorPos < this.inputBuffer.length) {
				this.inputBuffer = this.inputBuffer.slice(0, this.cursorPos) + this.inputBuffer.slice(this.cursorPos + 1);
			}
		} else if (matchesKey(data, Key.left)) {
			this.cursorPos = Math.max(0, this.cursorPos - 1);
		} else if (matchesKey(data, Key.right)) {
			this.cursorPos = Math.min(this.inputBuffer.length, this.cursorPos + 1);
		} else if (data.length === 1 && data.charCodeAt(0) >= 32) {
			this.inputBuffer = this.inputBuffer.slice(0, this.cursorPos) + data + this.inputBuffer.slice(this.cursorPos);
			this.cursorPos++;
		}
		this.tui.requestRender();
	}

	render(width: number): string[] {
		const lines: string[] = [];
		const inputHeight = 3;
		const headerHeight = 2;
		const availableHeight = process.stdout.rows || 24;
		const messageHeight = availableHeight - inputHeight - headerHeight - 4;

		// Header
		const headerLine = this.theme.primary(`  [Chat] Channel: ${this.currentChannelId}`);
		lines.push(truncateToWidth(headerLine, width));
		lines.push(this.theme.muted("  " + "─".repeat(Math.min(width - 2, 60))));

		// Messages (show last N messages that fit)
		const visibleMessages = this.messages.slice(-messageHeight);
		for (const msg of visibleMessages) {
			const time = msg.timestamp.toLocaleTimeString();
			const roleColor = msg.role === "user" ? this.theme.info : this.theme.success;
			const roleLabel = msg.role === "user" ? "You" : "AI";

			lines.push(this.theme.muted(`  [${time}]`) + " " + roleColor(`${roleLabel}:`));

			// Wrap message content
			const contentLines = this.wrapText(msg.content, width - 4);
			for (const line of contentLines) {
				lines.push(`    ${line}`);
			}
			lines.push("");
		}

		// Fill remaining space
		while (lines.length < messageHeight + headerHeight) {
			lines.push("");
		}

		// Input area
		lines.push(this.theme.muted("  " + "─".repeat(Math.min(width - 2, 60))));
		const prompt = this.theme.primary("  > ");
		const inputLine = this.inputBuffer || this.theme.muted("Type a message...");
		lines.push(prompt + inputLine);

		// Cursor indicator
		if (this.focused) {
			const cursorLine = " ".repeat(4 + this.cursorPos) + this.theme.primary("^");
			lines.push(cursorLine);
		}

		return lines;
	}

	private wrapText(text: string, maxWidth: number): string[] {
		const lines: string[] = [];
		const paragraphs = text.split("\n");

		for (const para of paragraphs) {
			if (para.length === 0) {
				lines.push("");
				continue;
			}

			let currentLine = "";
			const words = para.split(" ");

			for (const word of words) {
				if (currentLine.length + word.length + 1 <= maxWidth) {
					currentLine += (currentLine ? " " : "") + word;
				} else {
					if (currentLine) lines.push(currentLine);
					currentLine = word;
				}
			}
			if (currentLine) lines.push(currentLine);
		}

		return lines;
	}
}

// ============================================================================
// Status Panel Component
// ============================================================================

class StatusPanel extends Container {
	private tui: TUI;
	private theme: TUITheme;
	private adapters: AdapterStatus[] = [];
	private logs: LogMessage[] = [];
	private selectedIndex = 0;

	constructor(tui: TUI, theme: TUITheme) {
		super();
		this.tui = tui;
		this.theme = theme;
	}

	updateAdapters(adapters: AdapterStatus[]): void {
		this.adapters = adapters;
		this.tui.requestRender();
	}

	addLog(log: LogMessage): void {
		this.logs.push(log);
		// Keep only last 100 logs
		if (this.logs.length > 100) {
			this.logs = this.logs.slice(-100);
		}
		this.tui.requestRender();
	}

	clearLogs(): void {
		this.logs = [];
		this.tui.requestRender();
	}

	handleInput(data: string): void {
		if (matchesKey(data, Key.up)) {
			this.selectedIndex = Math.max(0, this.selectedIndex - 1);
			this.tui.requestRender();
		} else if (matchesKey(data, Key.down)) {
			this.selectedIndex = Math.min(this.adapters.length - 1, this.selectedIndex + 1);
			this.tui.requestRender();
		}
	}

	render(width: number): string[] {
		const lines: string[] = [];
		const halfHeight = Math.floor((process.stdout.rows || 24) / 2) - 4;

		// Adapter status section
		lines.push(this.theme.primary("  [Adapters]"));
		lines.push(this.theme.muted("  " + "─".repeat(Math.min(width - 2, 60))));

		if (this.adapters.length === 0) {
			lines.push(this.theme.muted("  No adapters running"));
		} else {
			for (const adapter of this.adapters) {
				const statusIcon = adapter.status === "running"
					? this.theme.success("●")
					: adapter.status === "error"
					? this.theme.error("●")
					: this.theme.warning("●");

				const line = `  ${statusIcon} ${adapter.name} (${adapter.type})`;
				lines.push(truncateToWidth(line, width));
				lines.push(this.theme.muted(`      Channels: ${adapter.channels} | Messages: ${adapter.messages}`));
			}
		}

		lines.push("");

		// Logs section
		lines.push(this.theme.primary("  [Recent Logs]"));
		lines.push(this.theme.muted("  " + "─".repeat(Math.min(width - 2, 60))));

		const visibleLogs = this.logs.slice(-halfHeight);
		for (const log of visibleLogs) {
			const time = log.timestamp.toLocaleTimeString();
			const levelColor = log.level === "error"
				? this.theme.error
				: log.level === "warn"
				? this.theme.warning
				: log.level === "debug"
				? this.theme.muted
				: this.theme.info;

			const levelLabel = `[${log.level.toUpperCase().padEnd(5)}]`;
			const source = log.source ? `[${log.source}]` : "";
			const line = this.theme.muted(`  ${time}`) + " " + levelColor(levelLabel) + " " + source + " " + log.message;
			lines.push(truncateToWidth(line, width));
		}

		return lines;
	}
}

// ============================================================================
// Main TUI Application
// ============================================================================

export class PiClawTUI {
	private tui: TUI | null = null;
	private terminal: ProcessTerminal | null = null;
	private config: PiClawTUIConfig;
	private theme: TUITheme;
	private mode: TUIMode = "chat";
	private listeners: TUIEventListener[] = [];
	private running = false;

	// Panels
	private startupMenu: StartupMenu | null = null;
	private chatPanel: ChatPanel | null = null;
	private statusPanel: StatusPanel | null = null;

	constructor(config: PiClawTUIConfig = {}) {
		this.config = config;
		this.theme = config.theme || darkTheme;
		this.mode = config.initialMode || "chat";
	}

	/**
	 * 启动 TUI
	 */
	async start(): Promise<void> {
		console.log("[TUI] Initializing terminal...");
		this.terminal = new ProcessTerminal();
		console.log("[TUI] Creating TUI instance...");
		this.tui = new TUI(this.terminal);

		// Start main loop first (needed for rendering and input)
		this.running = true;
		console.log("[TUI] Starting main loop...");
		this.tui.start();

		// Show startup menu
		console.log("[TUI] Showing startup menu...");
		await this.showStartupMenu();
	}

	/**
	 * 显示启动菜单
	 */
	private async showStartupMenu(): Promise<void> {
		return new Promise((resolve) => {
			if (!this.tui) {
				resolve();
				return;
			}

			this.startupMenu = new StartupMenu(this.tui, this.theme);

			this.startupMenu.onSelect = (option) => {
				this.mode = option.mode;
				this.tui?.removeChild(this.startupMenu!);
				this.startupMenu = null;
				this.showMainPanel();
				resolve();
			};

			this.startupMenu.onCancel = () => {
				this.stop();
				resolve();
			};

			this.tui.addChild(this.startupMenu);
			this.tui.setFocus(this.startupMenu);
		});
	}

	/**
	 * 显示主面板
	 */
	private showMainPanel(): void {
		if (!this.tui) return;

		if (this.mode === "chat" || this.mode === "both") {
			this.chatPanel = new ChatPanel(this.tui, this.theme);
			this.chatPanel.onSendMessage = (content, channelId) => {
				this.emit({ type: "message-send", content, channelId });
			};
			this.tui.addChild(this.chatPanel);
			this.tui.setFocus(this.chatPanel);
		}

		if (this.mode === "monitor" || this.mode === "both") {
			this.statusPanel = new StatusPanel(this.tui, this.theme);
			this.tui.addChild(this.statusPanel);
		}
	}

	/**
	 * 停止 TUI
	 */
	stop(): void {
		this.running = false;
		if (this.tui) {
			this.tui.stop();
			this.tui = null;
		}
		this.terminal = null;
	}

	/**
	 * 添加事件监听器
	 */
	addEventListener(listener: TUIEventListener): () => void {
		this.listeners.push(listener);
		return () => {
			const index = this.listeners.indexOf(listener);
			if (index >= 0) {
				this.listeners.splice(index, 1);
			}
		};
	}

	/**
	 * 发送事件
	 */
	private emit(event: TUIEvent): void {
		for (const listener of this.listeners) {
			try {
				listener(event);
			} catch (error) {
				console.error("TUI event listener error:", error);
			}
		}
	}

	// ============================================================================
	// Public API
	// ============================================================================

	/**
	 * 添加聊天消息
	 */
	addChatMessage(message: ChatMessage): void {
		this.chatPanel?.addMessage(message);
	}

	/**
	 * 添加日志
	 */
	addLog(log: LogMessage): void {
		this.statusPanel?.addLog(log);
	}

	/**
	 * 更新 adapter 状态
	 */
	updateAdapterStatus(status: AdapterStatus): void {
		this.statusPanel?.updateAdapters([status]);
		this.emit({ type: "adapter-status", status });
	}

	/**
	 * 获取当前模式
	 */
	getMode(): TUIMode {
		return this.mode;
	}

	/**
	 * 请求重新渲染
	 */
	requestRender(): void {
		this.tui?.requestRender();
	}
}
