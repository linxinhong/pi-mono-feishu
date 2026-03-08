# 平台工具系统

本文档描述了 Pi-Claw 的通用平台工具系统，该系统允许平台适配器（如飞书、Discord、Slack）向 AI Agent 提供平台特定的工具。

## 概述

平台工具系统解决了一个核心问题：不同平台（飞书、Discord、Slack 等）有各自特有的功能（如飞书的日历、多维表格，Discord 的频道管理等），需要一种统一的方式将这些功能暴露给 AI Agent。

### 设计目标

1. **平台无关性**：核心 Agent 代码不依赖任何特定平台
2. **可扩展性**：新平台只需实现 `getTools()` 方法即可接入
3. **类型安全**：使用 TypeScript 类型系统确保工具定义正确
4. **命名规范**：统一的工具命名规范便于识别和管理

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                        CoreAgent                            │
│  - 加载基础工具 (bash, read, write...)                       │
│  - 检查 platformContext.getTools()                          │
│  - 加载平台特定工具                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PlatformContext                          │
│  interface PlatformContext {                                │
│    getTools?(context): PlatformTool[] | Promise<...>        │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 FeishuPlatformContext                       │
│  - 实现 getTools()                                          │
│  - 创建 FeishuToolsManager                                  │
│  - 返回飞书平台工具列表                                       │
└─────────────────────────────────────────────────────────────┘
```

## 核心类型定义

### PlatformToolMeta

平台工具的元数据，用于标识工具所属平台和功能分类：

```typescript
interface PlatformToolMeta {
  /** 平台标识：feishu, discord, slack */
  platform: string;
  /** 工具分类：task, calendar, drive, bitable, doc, wiki */
  category: string;
  /** 操作名称：list, create, delete, get, update, search */
  localName: string;
}
```

### PlatformTool

扩展 `AgentTool` 类型，添加平台元数据：

```typescript
type PlatformTool = AgentTool<any> & {
  /** 平台元数据 */
  platformMeta: PlatformToolMeta;
};
```

### PlatformContext 扩展

在 `PlatformContext` 接口中添加了可选的 `getTools()` 方法：

```typescript
interface PlatformContext {
  // ... 现有方法 ...

  /**
   * 获取平台特定工具（可选实现）
   */
  getTools?(context: {
    chatId: string;
    workspaceDir: string;
    channelDir: string;
  }): PlatformTool[] | Promise<PlatformTool[]>;
}
```

## 工具命名规范

### 命名格式

```
{platform}_{category}_{action}
```

### 示例

| 工具名称 | 平台 | 分类 | 操作 |
|---------|------|------|------|
| `feishu_task_list` | feishu | task | list |
| `feishu_calendar_create` | feishu | calendar | create |
| `feishu_bitable_record_update` | feishu | bitable | record_update |
| `discord_channel_list` | discord | channel | list |

### 辅助函数

```typescript
import { buildToolName, parseToolName, isPlatformToolName } from "./tools/index.js";

// 构建工具名称
const name = buildToolName("feishu", "calendar", "event_create");
// => "feishu_calendar_event_create"

// 解析工具名称
const meta = parseToolName("feishu_task_list");
// => { platform: "feishu", category: "task", localName: "list" }

// 检查是否是平台工具
const isPlatform = isPlatformToolName("feishu_task_list"); // => true
const isFeishu = isPlatformToolName("feishu_task_list", "feishu"); // => true
```

## 描述生成工具

### createPlatformDescription

生成带有平台标识的工具描述：

```typescript
import { createPlatformDescription } from "./tools/index.js";

const description = createPlatformDescription("feishu", "获取任务列表");
// => "[飞书] 获取任务列表"
```

### createToolLabel

生成带有平台图标和名称的工具标签：

```typescript
import { createToolLabel } from "./tools/index.js";

const label = createToolLabel("feishu", "任务列表");
// => "📱 飞书 - 任务列表"
```

## 实现新平台工具

### 步骤 1：创建工具定义

在 `src/adapters/{platform}/tools/agent-tools.ts` 中定义工具：

```typescript
import { Type, Static } from "@sinclair/typebox";
import type { PlatformTool } from "../../../core/platform/tools/index.js";
import { buildToolName, createPlatformDescription, createToolLabel } from "../../../core/platform/tools/index.js";

// 定义参数 Schema
const ChannelListSchema = Type.Object({
  guildId: Type.String({ description: "服务器 ID" }),
});

// 辅助函数
function createToolResult(text: string, details?: Record<string, any>) {
  return {
    content: [{ type: "text", text } as { type: "text"; text: string }],
    details: details || {},
  };
}

// 创建工具
export function createDiscordChannelTools(discord: DiscordClient): PlatformTool[] {
  return [
    {
      name: "discord_channel_list",
      label: createToolLabel("discord", "频道列表"),
      description: createPlatformDescription("discord", "获取服务器频道列表"),
      parameters: ChannelListSchema,
      platformMeta: { platform: "discord", category: "channel", localName: "list" },
      execute: async (_toolCallId, params, _signal, _onUpdate) => {
        const { guildId } = params as Static<typeof ChannelListSchema>;
        const result = await discord.listChannels(guildId);
        return createToolResult(JSON.stringify(result, null, 2));
      },
    },
  ];
}
```

### 步骤 2：在 PlatformContext 中实现 getTools

在 `src/adapters/{platform}/context.ts` 中：

```typescript
import type { PlatformContext } from "../../core/platform/context.js";
import type { PlatformTool } from "../../core/platform/tools/index.js";

export class DiscordPlatformContext implements PlatformContext {
  readonly platform = "discord";
  private toolsCache: PlatformTool[] | null = null;

  // ... 其他方法 ...

  async getTools(_context: {
    chatId: string;
    workspaceDir: string;
    channelDir: string;
  }): Promise<PlatformTool[]> {
    if (this.toolsCache) {
      return this.toolsCache;
    }

    this.toolsCache = [
      ...createDiscordChannelTools(this.client),
      // ... 其他工具
    ];

    return this.toolsCache;
  }
}
```

### 步骤 3：CoreAgent 自动加载

`CoreAgent` 会自动检查并加载平台工具（已在核心代码中实现）：

```typescript
// 添加平台特定工具
if (platformContext.getTools) {
  try {
    const platformTools = await platformContext.getTools({
      chatId,
      workspaceDir: workspacePath,
      channelDir,
    });
    if (platformTools && platformTools.length > 0) {
      tools.push(...platformTools);
      log.logInfo(`[Agent] Added ${platformTools.length} platform tools for ${platformContext.platform}`);
    }
  } catch (error) {
    log.logError(`[Agent] Failed to load platform tools: ${error}`);
  }
}
```

## 飞书平台工具列表

当前实现的飞书工具：

### 任务工具 (Task)
- `feishu_task_list` - 获取任务列表
- `feishu_task_get` - 获取任务详情
- `feishu_task_create` - 创建任务
- `feishu_task_update` - 更新任务
- `feishu_task_delete` - 删除任务
- `feishu_task_complete` - 完成任务
- `feishu_task_cancel` - 取消任务

### 日历工具 (Calendar)
- `feishu_calendar_list` - 获取日历列表
- `feishu_calendar_get` - 获取日历详情
- `feishu_calendar_event_list` - 获取事件列表
- `feishu_calendar_event_get` - 获取事件详情
- `feishu_calendar_event_create` - 创建事件
- `feishu_calendar_event_update` - 更新事件
- `feishu_calendar_event_delete` - 删除事件
- `feishu_calendar_event_search` - 搜索事件

### 多维表格工具 (Bitable)
- `feishu_bitable_get` - 获取多维表格信息
- `feishu_bitable_table_list` - 获取数据表列表
- `feishu_bitable_record_list` - 获取记录列表
- `feishu_bitable_record_create` - 创建记录
- `feishu_bitable_record_update` - 更新记录
- `feishu_bitable_record_delete` - 删除记录

### 文档工具 (Doc)
- `feishu_doc_get` - 获取文档信息
- `feishu_doc_create` - 创建文档
- `feishu_doc_content_get` - 获取文档内容
- `feishu_doc_block_list` - 获取文档块列表
- `feishu_doc_block_create` - 创建文档块

### 知识库工具 (Wiki)
- `feishu_wiki_space_list` - 获取知识库列表
- `feishu_wiki_node_list` - 获取知识库节点列表
- `feishu_wiki_node_get` - 获取知识库节点详情
- `feishu_wiki_node_create` - 创建知识库节点

### 云盘工具 (Drive)
- `feishu_drive_file_get` - 获取文件信息
- `feishu_drive_file_list` - 获取文件夹内容列表
- `feishu_drive_folder_create` - 创建文件夹
- `feishu_drive_file_search` - 搜索文件

## 数据流

```
1. 用户发送消息
   └─> FeishuAdapter 接收消息
   └─> 创建 FeishuPlatformContext

2. CoreAgent.processMessage() 被调用
   └─> 调用 initializeAgent()
   └─> 创建基础工具 (bash, read, write...)
   └─> 检查 platformContext.getTools
   └─> 调用 getTools() → FeishuToolsManager.create()
   └─> 返回 PlatformTool[] 并添加到工具列表

3. AI 收到包含飞书工具的 prompt
   └─> 可以调用 feishu_calendar_create 等工具
   └─> 工具执行结果返回给 AI
```

## 最佳实践

1. **工具命名**：始终使用 `buildToolName()` 生成工具名称，确保命名一致性
2. **描述格式**：使用 `createPlatformDescription()` 生成描述，保持格式统一
3. **工具缓存**：在 `getTools()` 中实现缓存，避免重复创建工具实例
4. **错误处理**：工具执行失败时返回错误信息，而不是抛出异常
5. **参数验证**：使用 TypeBox Schema 定义参数，自动获得类型检查和验证

## 调试

启用日志查看工具加载情况：

```
[Agent] Created 15 tools for channel xxx_chat_id: bash, read, write, edit, models, glob, grep, spawn, ...
[Agent] Added 32 platform tools for feishu
```

如果看到 `Added N platform tools for feishu`，说明飞书工具已成功加载。
