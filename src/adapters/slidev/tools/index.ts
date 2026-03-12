/**
 * Tools Index
 * 
 * 统一注册所有 Slidev Tools 到 pi-agent
 */

import type { AgentTool } from "@mariozechner/pi-agent-core";
import type { SlideRenderer } from "../SlideRenderer.js";
import type { StateMachine } from "../StateMachine.js";
import type { TTSEngine } from "../types.js";
import { createNavigationTools } from "./navigation.js";
import { createTTSTools } from "./tts.js";
import { createEditorTools } from "./editor.js";

// ============================================================================
// Tool Registration
// ============================================================================

export interface ToolDependencies {
  renderer: SlideRenderer;
  stateMachine: StateMachine;
  ttsEngine: TTSEngine;
}

/**
 * 创建所有 Slidev Tools
 */
export function createAllTools(deps: ToolDependencies): AgentTool<any>[] {
  const { renderer, stateMachine, ttsEngine } = deps;

  return [
    // 导航工具
    ...createNavigationTools(renderer, stateMachine),
    
    // TTS 工具
    ...createTTSTools(ttsEngine, renderer),
    
    // 编辑工具
    ...createEditorTools(renderer),
  ];
}

/**
 * 只创建导航工具（基础功能）
 */
export function createNavigationToolsOnly(
  renderer: SlideRenderer,
  stateMachine: StateMachine
): AgentTool<any>[] {
  return createNavigationTools(renderer, stateMachine);
}

/**
 * 只创建 TTS 工具
 */
export function createTTSToolsOnly(
  ttsEngine: TTSEngine,
  renderer: SlideRenderer
): AgentTool<any>[] {
  return createTTSTools(ttsEngine, renderer);
}

// ============================================================================
// Re-exports
// ============================================================================

export { createNavigationTools } from "./navigation.js";
export { createTTSTools } from "./tts.js";
export { createEditorTools } from "./editor.js";
