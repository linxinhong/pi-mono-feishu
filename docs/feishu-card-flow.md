# 飞书卡片处理流程详解

## 概述

本文档详细描述了飞书卡片的完整处理流程，包括消息接收、卡片发送、状态管理、事件处理和配置传递。

---

## 1. 消息接收流程

### 1.1 接收方式

飞书适配器支持两种消息接收方式：

| 模式 | 说明 | 配置 |
|------|------|------|
| **WebSocket**（默认） | 通过 `@larksuiteoapi/node-sdk` 的 `WSClient` 实时接收 | `useWebSocket: true` |
| **Webhook** | 通过 HTTP 服务器接收飞书服务器的推送 | `useWebSocket: false` |

### 1.2 处理流程

```
飞书服务器 → WebSocket/Webhook → handleMessageEvent() → parseFeishuMessage() → UniversalMessage → messageHandlers
```

**关键代码**: `src/adapters/feishu-v2/adapter.ts:499-540`

```typescript
private async handleMessageEvent(event: FeishuMessageEvent): Promise<void> {
    // 1. 提取基本信息
    const message = event.message;
    const chatId = message.chat_id;
    const sender = event.sender;

    // 2. 过滤应用消息（避免处理自己发的消息）
    if (sender?.sender_type === "app") return;

    // 3. 获取用户信息
    let userInfo = this.users.get(sender?.sender_id?.user_id || "");

    // 4. 解析为统一消息格式
    const universalMessage = parseFeishuMessage(event, userInfo);

    // 5. 防重复处理
    if (this.processedMessages.has(universalMessage.id)) return;
    this.processedMessages.add(universalMessage.id);

    // 6. 分发给消息处理器
    for (const handler of this.messageHandlers) {
        await handler(universalMessage);
    }
}
```

### 1.3 消息解析

**关键代码**: `src/adapters/feishu-v2/message-parser.ts`

将飞书原生消息转换为 `UniversalMessage`：

```typescript
export function parseFeishuMessage(event: FeishuMessageEvent): UniversalMessage {
    return {
        id: message.message_id,
        platform: "feishu",
        type: getMessageType(message.message_type),
        content: text,
        sender: { id, name, displayName },
        chat: { id: message.chat_id, type },
        attachments: files,
        timestamp: new Date(parseInt(message.create_time)),
        mentions,
        ...(message.root_id && { threadId: message.root_id }),
    };
}
```

---

## 2. 卡片发送流程

### 2.1 卡片类型

**关键代码**: `src/adapters/feishu-v2/cards.ts`

| 函数 | 用途 | 示例 |
|------|------|------|
| `buildTextCard(text)` | 纯文本卡片 | 显示简单文本 |
| `buildCodeCard(code)` | 代码卡片 | 显示代码块 |
| `buildProgressCard(status, toolHistory)` | 进度卡片 | 显示工具执行状态 |
| `buildThinkingProgressCard(thinking)` | 思考卡片 | 显示 AI 思考过程 |
| `autoBuildCard(text)` | 智能卡片 | 根据内容自动选择样式 |

### 2.2 卡片结构

```typescript
interface CardContent {
    schema: "2.0";
    config?: { width_mode?: "fill" | "adaptive" };
    header?: { title: { tag: string; content: string }; template?: string };
    body: { elements: CardElement[] };
}
```

### 2.3 发送机制

**关键代码**: `src/adapters/feishu-v2/cards.ts:305-348`

```typescript
export class FeishuCards {
    // 发送卡片
    async sendCard(receiveId: string, card: CardContent): Promise<string> {
        const result = await this.client.im.message.create({
            params: { receive_id_type: "chat_id" },
            data: {
                receive_id: receiveId,
                msg_type: "interactive",
                content: JSON.stringify(card),
            }
        });
        return result.data?.message_id || "";
    }

    // 更新卡片
    async updateCard(messageId: string, card: CardContent): Promise<void> {
        await this.client.im.message.patch({
            path: { message_id: messageId },
            data: { content: JSON.stringify(card) }
        });
    }
}
```

---

## 3. 状态管理流程

### 3.1 状态变量

**关键代码**: `src/adapters/feishu-v2/context.ts`

```typescript
export class FeishuPlatformContext implements PlatformContext {
    // 状态消息管理
    private statusMessageId: string | null = null;  // 工具状态卡片 ID
    private toolHistory: string[] = [];             // 工具执行历史

    // 思考消息管理
    private thinkingMessageId: string | null = null; // 思考卡片 ID
    private currentThinking: string = "";            // 当前思考内容
    private hideThinking: boolean;                   // 是否隐藏思考
}
```

### 3.2 两张卡片的管理

| 卡片 | 管理变量 | 用途 | 更新时机 |
|------|----------|------|----------|
| **卡片1** | `statusMessageId` | 工具执行状态 | `tool_execution_start/end` |
| **卡片2** | `thinkingMessageId` | AI 思考过程 | `message_update` |

### 3.3 工具状态更新流程

```
tool_execution_start → sendText() → 记录到 toolHistory → 更新卡片1
tool_execution_end   → sendText() → 记录到 toolHistory → 更新卡片1
message_end          → finishStatus() → 更新卡片1为最终内容
```

```typescript
async sendText(chatId: string, text: string): Promise<string> {
    // 1. 如果是工具状态消息，记录到历史
    if (text.startsWith("_ -> ") || text.startsWith("_Error:")) {
        const cleanText = text.replace(/^_/, "").replace(/_$/, "");
        this.toolHistory.push(cleanText);
    }

    // 2. 创建或更新状态卡片
    if (!this.statusMessageId) {
        const initialCard = buildProgressCard("🤔 处理中...", []);
        this.statusMessageId = await this.config.postMessage(chatId, initialCard);
    }

    // 3. 更新卡片内容
    if (this.toolHistory.length > 0) {
        const progressCard = buildProgressCard("🤔 处理中...", this.toolHistory);
        await this.config.updateMessage(this.statusMessageId, progressCard);
    }

    return this.statusMessageId;
}
```

### 3.4 思考内容更新流程

```
message_update (thinking) → updateThinking() → 创建/更新卡片2
message_end               → finishThinking() → 更新卡片2为最终内容
```

```typescript
async updateThinking(thinking: string): Promise<void> {
    if (this.hideThinking) return;

    this.currentThinking = thinking;
    const card = buildThinkingProgressCard(thinking);

    if (this.thinkingMessageId) {
        // 已有卡片，更新
        await this.config.updateMessage(this.thinkingMessageId, card);
    } else {
        // 首次创建
        this.thinkingMessageId = await this.config.postMessage(this.config.chatId, card);
    }
}

async finishThinking(finalContent?: string): Promise<void> {
    if (this.hideThinking || !this.thinkingMessageId) return;

    if (finalContent) {
        const card = autoBuildCard(finalContent);
        await this.config.updateMessage(this.thinkingMessageId, card);
    }

    this.thinkingMessageId = null;
    this.currentThinking = "";
}
```

---

## 4. 事件处理流程

### 4.1 事件类型

**关键代码**: `src/core/agent/core-agent.ts:328-392`

| 事件 | 触发时机 | 处理动作 |
|------|----------|----------|
| `tool_execution_start` | 工具开始执行 | 更新卡片1，显示 "→ 工具名" |
| `tool_execution_end` | 工具执行完成 | 更新卡片1，显示 "OK/X 工具名" |
| `message_update` | 消息内容更新 | 更新卡片2，显示思考内容 |
| `message_end` | 消息完成 | 更新两张卡片为最终内容 |

### 4.2 事件订阅代码

```typescript
session.subscribe(async (agentEvent) => {
    if (agentEvent.type === "tool_execution_start") {
        const label = (args.label as string) || agentEvent.toolName;
        await platformContext.sendText(chatId, `_ -> ${label}_`);
        // 触发 hook...

    } else if (agentEvent.type === "tool_execution_end") {
        const statusIcon = agentEvent.isError ? "X" : "OK";
        await platformContext.sendText(chatId, `_ -> ${statusIcon} ${agentEvent.toolName}_`);
        // 触发 hook...

    } else if (agentEvent.type === "message_update") {
        const message = agentEvent.message as any;
        const thinkingContent = message.content?.find((c: any) => c.type === "thinking");
        if (thinkingContent && (platformContext as any).updateThinking) {
            await (platformContext as any).updateThinking(thinkingContent.thinking);
        }

    } else if (agentEvent.type === "message_end") {
        // 完成思考卡片
        if ((platformContext as any).finishThinking) {
            await (platformContext as any).finishThinking(finalResponse);
        }
        resolve(finalResponse);
    }
});
```

---

## 5. 配置传递流程

### 5.1 配置文件

```json
// config.json
{
    "feishu": {
        "appId": "${FEISHU_APP_ID}",
        "appSecret": "${FEISHU_APP_SECRET}",
        "useWebSocket": true,
        "hideThinking": false
    }
}
```

### 5.2 传递链路

```
config.json
    ↓
factory.ts (FeishuV2BotConfig)
    ↓
adapter.ts (FeishuAdapterConfig)
    ↓
context.ts (FeishuContextConfig)
    ↓
core-agent.ts (thinkingLevel)
```

### 5.3 关键代码

**factory.ts**:
```typescript
const adapter = new FeishuAdapter({
    appId: config.appId,
    appSecret: config.appSecret,
    hideThinking: config.hideThinking,  // 传递配置
});
```

**adapter.ts**:
```typescript
createPlatformContext(chatId: string): PlatformContext {
    return new FeishuPlatformContext({
        hideThinking: this.hideThinking,  // 传递配置
    });
}
```

**context.ts**:
```typescript
constructor(config: FeishuContextConfig) {
    this.hideThinking = config.hideThinking ?? false;  // 默认显示
}

isThinkingHidden(): boolean {
    return this.hideThinking;
}
```

**core-agent.ts**:
```typescript
const hideThinking = (platformContext as any).isThinkingHidden?.() ?? true;

state.agent = new Agent({
    initialState: {
        thinkingLevel: hideThinking ? "off" : "medium",  // 应用配置
    }
});
```

---

## 6. 完整流程图

```
用户发送消息
    ↓
飞书服务器 → WebSocket/Webhook
    ↓
handleMessageEvent() → parseFeishuMessage()
    ↓
UniversalMessage → UnifiedBot.handleMessage()
    ↓
CoreAgent.processMessage()
    ↓
┌─────────────────────────────────────────────┐
│  Agent 执行循环                               │
│                                              │
│  tool_execution_start                        │
│      ↓                                       │
│  sendText() → 更新卡片1 (工具状态)             │
│      ↓                                       │
│  tool_execution_end                          │
│      ↓                                       │
│  sendText() → 更新卡片1 (工具结果)             │
│      ↓                                       │
│  message_update (thinking)                   │
│      ↓                                       │
│  updateThinking() → 创建/更新卡片2 (思考)      │
│      ↓                                       │
│  message_end                                 │
│      ↓                                       │
│  finishThinking() → 更新卡片2 (最终内容)       │
│  finishStatus() → 更新卡片1 (最终内容)         │
└─────────────────────────────────────────────┘
    ↓
返回最终响应
```

---

## 7. 关键文件索引

| 文件 | 职责 |
|------|------|
| `src/adapters/feishu-v2/adapter.ts` | 消息接收、平台上下文创建 |
| `src/adapters/feishu-v2/message-parser.ts` | 消息解析 |
| `src/adapters/feishu-v2/cards.ts` | 卡片构建、发送 |
| `src/adapters/feishu-v2/context.ts` | 状态管理、卡片更新逻辑 |
| `src/adapters/feishu-v2/factory.ts` | 配置传递、组件创建 |
| `src/core/agent/core-agent.ts` | 事件订阅、Agent 执行 |
| `src/adapters/feishu-v2/types.ts` | 类型定义 |
