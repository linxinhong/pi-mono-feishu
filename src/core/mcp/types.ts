/**
 * MCP (Model Context Protocol) Types
 * 
 * 基于 Anthropic MCP 规范的类型定义
 * @see https://modelcontextprotocol.io
 */

import type { AgentTool } from "@mariozechner/pi-agent-core";

// ============================================================================
// MCP Protocol Types (JSON-RPC 2.0)
// ============================================================================

/** JSON-RPC 请求 */
export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: unknown;
}

/** JSON-RPC 响应 */
export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: JsonRpcError;
}

/** JSON-RPC 错误 */
export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

/** JSON-RPC 通知 */
export interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
}

// ============================================================================
// MCP Capability Types
// ============================================================================

/** 服务器能力 */
export interface ServerCapabilities {
  /** 支持日志记录 */
  logging?: {};
  /** 支持 Prompts */
  prompts?: {
    listChanged?: boolean;
  };
  /** 支持 Resources */
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  /** 支持 Tools */
  tools?: {
    listChanged?: boolean;
  };
}

/** 客户端能力 */
export interface ClientCapabilities {
  /** 支持 Roots */
  roots?: {
    listChanged?: boolean;
  };
  /** 支持 Sampling */
  sampling?: {};
}

// ============================================================================
// MCP Tool Types
// ============================================================================

/** MCP 工具定义 */
export interface McpTool {
  /** 工具名称 */
  name: string;
  /** 工具描述 */
  description?: string;
  /** 输入参数 Schema (JSON Schema) */
  inputSchema: {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
    [key: string]: unknown;
  };
}

/** MCP 工具调用结果 */
export interface McpToolResult {
  /** 内容列表 */
  content: McpContent[];
  /** 是否出错 */
  isError?: boolean;
}

/** MCP 内容项 */
export type McpContent = McpTextContent | McpImageContent | McpEmbeddedResource;

/** 文本内容 */
export interface McpTextContent {
  type: "text";
  text: string;
}

/** 图片内容 */
export interface McpImageContent {
  type: "image";
  data: string;
  mimeType: string;
}

/** 嵌入资源 */
export interface McpEmbeddedResource {
  type: "resource";
  resource: McpResourceContents;
}

// ============================================================================
// MCP Resource Types
// ============================================================================

/** MCP 资源定义 */
export interface McpResource {
  /** 资源 URI */
  uri: string;
  /** 资源名称 */
  name: string;
  /** 资源描述 */
  description?: string;
  /** MIME 类型 */
  mimeType?: string;
}

/** MCP 资源内容 */
export type McpResourceContents = McpTextResourceContents | McpBlobResourceContents;

/** 文本资源内容 */
export interface McpTextResourceContents {
  uri: string;
  mimeType?: string;
  text: string;
}

/** 二进制资源内容 */
export interface McpBlobResourceContents {
  uri: string;
  mimeType?: string;
  blob: string;
}

/** 资源模板 */
export interface McpResourceTemplate {
  /** URI 模板 */
  uriTemplate: string;
  /** 资源名称 */
  name: string;
  description?: string;
  mimeType?: string;
}

// ============================================================================
// MCP Prompt Types
// ============================================================================

/** MCP Prompt 定义 */
export interface McpPrompt {
  /** Prompt 名称 */
  name: string;
  /** Prompt 描述 */
  description?: string;
  /** 参数列表 */
  arguments?: McpPromptArgument[];
}

/** Prompt 参数 */
export interface McpPromptArgument {
  /** 参数名称 */
  name: string;
  /** 参数描述 */
  description?: string;
  /** 是否必填 */
  required?: boolean;
}

/** Prompt 消息 */
export interface McpPromptMessage {
  /** 角色 */
  role: "user" | "assistant";
  /** 内容 */
  content: McpContent;
}

/** Prompt 调用结果 */
export interface McpGetPromptResult {
  /** 消息列表 */
  messages: McpPromptMessage[];
  /** 描述 */
  description?: string;
}

// ============================================================================
// MCP Server Types
// ============================================================================

/** MCP 服务器配置 */
export interface McpServerConfig {
  /** 服务器名称（唯一标识） */
  name: string;
  /** 服务器显示名称 */
  displayName?: string;
  /** 传输类型 */
  transport: "stdio" | "http" | "sse";
  /** 命令（stdio 模式） */
  command?: string;
  /** 参数（stdio 模式） */
  args?: string[];
  /** 环境变量（stdio 模式） */
  env?: Record<string, string>;
  /** URL（http/sse 模式） */
  url?: string;
  /** 请求头（http/sse 模式） */
  headers?: Record<string, string>;
  /** 是否启用 */
  enabled?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
}

/** MCP 连接状态 */
export type McpConnectionStatus = 
  | "disconnected" 
  | "connecting" 
  | "connected" 
  | "error";

/** MCP 服务器状态 */
export interface McpServerState {
  /** 配置 */
  config: McpServerConfig;
  /** 连接状态 */
  status: McpConnectionStatus;
  /** 服务器信息 */
  serverInfo?: McpServerInfo;
  /** 能力 */
  capabilities?: ServerCapabilities;
  /** 错误信息 */
  error?: string;
  /** 工具列表 */
  tools: McpTool[];
  /** 资源列表 */
  resources: McpResource[];
  /** Prompt 列表 */
  prompts: McpPrompt[];
}

/** MCP 服务器信息 */
export interface McpServerInfo {
  /** 服务器名称 */
  name: string;
  /** 版本 */
  version: string;
}

// ============================================================================
// MCP Client Types
// ============================================================================

/** MCP 客户端配置 */
export interface McpClientConfig {
  /** 服务器列表 */
  servers: McpServerConfig[];
  /** 默认超时时间 */
  defaultTimeout?: number;
  /** 客户端信息 */
  clientInfo?: {
    name: string;
    version: string;
  };
}

/** 转换后的 Agent Tool（包含 MCP 元数据） */
export interface McpAgentTool extends AgentTool<any> {
  /** MCP 元数据 */
  mcpMeta: {
    /** 来源服务器 */
    serverName: string;
    /** 原始工具名称 */
    originalName: string;
    /** 工具 URI（用于标识） */
    toolUri: string;
  };
}

// ============================================================================
// Request/Response Types
// ============================================================================

/** 初始化请求参数 */
export interface InitializeRequest {
  protocolVersion: string;
  capabilities: ClientCapabilities;
  clientInfo: {
    name: string;
    version: string;
  };
}

/** 初始化响应结果 */
export interface InitializeResult {
  protocolVersion: string;
  capabilities: ServerCapabilities;
  serverInfo: McpServerInfo;
}

/** 工具列表响应 */
export interface ListToolsResult {
  tools: McpTool[];
  nextCursor?: string;
}

/** 资源列表响应 */
export interface ListResourcesResult {
  resources: McpResource[];
  nextCursor?: string;
}

/** Prompt 列表响应 */
export interface ListPromptsResult {
  prompts: McpPrompt[];
  nextCursor?: string;
}

/** 工具调用请求 */
export interface CallToolRequest {
  name: string;
  arguments?: Record<string, unknown>;
}

// ============================================================================
// Error Codes (MCP Specification)
// ============================================================================

export const MCP_ERROR_CODES = {
  // 标准 JSON-RPC 错误码
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  
  // MCP 特定错误码
  INITIALIZATION_FAILED: -32000,
  INITIALIZATION_TIMEOUT: -32001,
  TRANSPORT_ERROR: -32002,
  SERVER_NOT_FOUND: -32003,
  TOOL_NOT_FOUND: -32004,
  RESOURCE_NOT_FOUND: -32005,
  PROMPT_NOT_FOUND: -32006,
} as const;
