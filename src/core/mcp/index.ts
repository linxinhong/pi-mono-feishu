/**
 * MCP (Model Context Protocol) Module
 * 
 * pi-claw 的 MCP 接入模块，支持与外部 MCP 服务器通信
 * 
 * @see https://modelcontextprotocol.io
 */

// Types
export type {
  // Core Types
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
  JsonRpcNotification,
  
  // Capability Types
  ServerCapabilities,
  ClientCapabilities,
  
  // Tool Types
  McpTool,
  McpToolResult,
  McpContent,
  McpTextContent,
  McpImageContent,
  McpEmbeddedResource,
  
  // Resource Types
  McpResource,
  McpResourceContents,
  McpTextResourceContents,
  McpBlobResourceContents,
  McpResourceTemplate,
  
  // Prompt Types
  McpPrompt,
  McpPromptArgument,
  McpPromptMessage,
  McpGetPromptResult,
  
  // Server Types
  McpServerConfig,
  McpConnectionStatus,
  McpServerState,
  McpServerInfo,
  
  // Client Types
  McpClientConfig,
  McpAgentTool,
  
  // Request/Response Types
  InitializeRequest,
  InitializeResult,
  ListToolsResult,
  ListResourcesResult,
  ListPromptsResult,
  CallToolRequest,
} from "./types.js";

// Constants
export { MCP_ERROR_CODES } from "./types.js";

// Transport
export {
  StdioTransport,
  HttpSseTransport,
  createTransport,
  type McpTransport,
} from "./transport.js";

// Client
export { McpClient, createMcpClient } from "./client.js";

// Manager
export { McpManager, createMcpManager } from "./manager.js";
