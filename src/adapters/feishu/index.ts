/**
 * Feishu Adapter 模块入口
 *
 * 飞书/Lark 平台适配器
 */

// 导出类型
export * from "./types.js";

// 导出核心组件
export { FeishuAdapter } from "./adapter.js";
export { FeishuStore } from "./store.js";
export { FeishuPlatformContext } from "./context.js";
export { createFeishuBot } from "./factory.js";

// 导出客户端
export { LarkClient } from "./client/lark-client.js";
export { getLarkAccount, getEnabledLarkAccounts } from "./client/accounts.js";

// 导出消息处理
export { MessageHandler, createMessageHandler } from "./messaging/inbound/handler.js";
export { parseMessageEvent, mentionedBot, stripBotMentions } from "./messaging/inbound/parse.js";
export { checkMessageGate } from "./messaging/inbound/gate.js";
export { createMessageDedup, SimpleMessageDedup } from "./messaging/inbound/dedup.js";

// 导出发送功能
export { sendMessage, sendCard, updateCard, uploadImage, uploadFile } from "./messaging/outbound/send.js";
export { buildCardContent, StreamingCardManager } from "./messaging/outbound/card.js";

// 导出监控
export { FeishuMonitor } from "./channel/monitor.js";

// 自注册到 Adapter Registry（通过导入 factory 触发）
import "./factory.js";
