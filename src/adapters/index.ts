/**
 * Adapters Module
 *
 * 平台适配器模块 - 导出所有平台适配器
 */

// 默认导出 feishu (v1)
export * from "./feishu/index.js";

// feishu-v2 作为命名空间导出，避免命名冲突
export * as FeishuV2 from "./feishu-v2/index.js";
