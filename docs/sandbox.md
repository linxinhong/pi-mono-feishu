# Pi Claw Sandbox 功能

pi-claw 支持两种执行模式：

- **host** - 直接在主机执行命令（默认）
- **docker** - 在 Docker 容器中执行，提供安全隔离

## 核心设计

**一套工具代码，两种执行环境**：

```
┌─────────────────────────────────────────────────────────┐
│  Tools (bash, read, write, edit)                        │
│  - 接收 Executor 参数                                    │
│  - 通过 executor.exec() 执行命令                         │
│  - 不直接调用 spawn/child_process                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Executor 接口                                          │
│  - exec(command, options): Promise<ExecResult>          │
│  - getWorkspacePath(hostPath): string                   │
└────────────────────┬────────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
┌──────────────────┐   ┌──────────────────┐
│  HostExecutor    │   │  DockerExecutor  │
│  - 直接执行命令   │   │  docker exec     │
│  - 返回实际路径   │   │  路径映射到容器   │
└──────────────────┘   └──────────────────┘
```

## 目录结构

```
~/.pi-claw/
├── config.json           # 飞书配置
├── agent/                # pi-coding-agent 配置
│   └── models.json       # 模型配置
├── boot/                 # Agent 启动配置
│   ├── agent.md          # Agent 定义
│   ├── soul.md           # 核心身份
│   ├── profile.md        # 用户画像
│   ├── identity.md       # 身份细节
│   └── tools.md          # 工具指南
├── events/               # 定时任务
├── logs/                 # 日志文件
├── memory/               # 记忆系统
│   ├── memory.md         # 长期记忆
│   └── YYYY-MM-DD.md     # 每日日志
├── skills/               # 全局 Skills
└── channels/             # 频道数据
    └── <channel-id>/
        ├── MEMORY.md     # 频道记忆
        ├── log.jsonl     # 消息历史
        ├── attachments/  # 附件
        ├── scratch/      # 临时工作目录
        └── skills/       # 频道 Skills
```

## 使用方式

### CLI 参数（优先）

```bash
# Host 模式（默认）
pi-claw start
pi-claw start --sandbox=host

# Docker 模式
pi-claw start --sandbox=docker:pi-claw-sandbox
```

### 配置文件 (~/.pi-claw/config.json)

```json
{
  "appId": "...",
  "appSecret": "...",
  "sandbox": {
    "type": "docker",
    "container": "pi-claw-sandbox"
  }
}
```

## Docker 容器管理

### 创建容器

```bash
# 使用默认目录 (~/.pi-claw/workspace)
pi-claw docker create

# 指定数据目录
pi-claw docker create --data-dir /path/to/data

# 指定容器名
pi-claw docker create --container my-sandbox
```

### 管理命令

```bash
# 查看状态
pi-claw docker status

# 启动容器
pi-claw docker start

# 停止容器
pi-claw docker stop

# 删除容器
pi-claw docker remove

# 进入容器 shell
pi-claw docker shell
```

### 直接使用脚本

```bash
# 也可以直接运行脚本
./scripts/docker.sh create
./scripts/docker.sh status
./scripts/docker.sh shell
```

## 工作原理

### Host 模式

1. 工具直接在主机上执行命令
2. 文件路径使用主机实际路径
3. 无额外隔离

### Docker 模式

1. 工具通过 `docker exec` 在容器中执行命令
2. 主机工作目录挂载到容器的 `/workspace`
3. 文件路径自动映射（主机 `~/.pi-claw/workspace` -> 容器 `/workspace`）

## 注意事项

1. **Docker 模式需要先创建容器**
   ```bash
   pi-claw docker create
   ```

2. **容器必须运行中**
   ```bash
   pi-claw docker status
   # 如果未运行: pi-claw docker start
   ```

3. **路径映射**
   - 主机路径: `~/.pi-claw/workspace/...`
   - 容器路径: `/workspace/...`
   - `Executor.getWorkspacePath()` 自动处理转换

## 示例

```bash
# 1. 创建 Docker 容器
pi-claw docker create

# 2. 验证容器运行
pi-claw docker status

# 3. 使用 Docker 模式启动
pi-claw start --sandbox=docker:pi-claw-sandbox

# 4. 或者使用 npx
npx @linxinhong/pi-claw start --sandbox=docker:pi-claw-sandbox
```
