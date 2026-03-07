#!/bin/bash
#
# Workspace 快速初始化脚本
#
# 用法:
#   ./scripts/init-workspace.sh [workspace-dir]
#

set -e

# 默认 workspace 目录
DEFAULT_WORKSPACE="$HOME/.pi/feishu"
WORKSPACE="${1:-$DEFAULT_WORKSPACE}"

echo ""
echo "🚀 Initializing workspace: $WORKSPACE"
echo ""

# 创建目录结构
echo "📁 Creating directory structure..."
mkdir -p "$WORKSPACE"/{boot,memory,skills,events,chats}

# 创建 boot 文件
create_file() {
    local path="$1"
    local content="$2"
    local readonly="$3"

    if [ -f "$WORKSPACE/$path" ]; then
        echo "   ⏭️  Exists: $path"
        return
    fi

    echo "$content" > "$WORKSPACE/$path"

    if [ "$readonly" = "readonly" ]; then
        chmod 600 "$WORKSPACE/$path"
        echo "   🔒 Created (600): $path"
    else
        echo "   ✅ Created: $path"
    fi
}

# ============================================================================
# Boot Files
# ============================================================================

echo ""
echo "📄 Creating boot files..."

# soul.md - 只读
create_file "boot/soul.md" '# Soul - 核心身份

> 此文件为只读配置，定义 AI 的核心身份和行为边界。

## 核心原则

1. **诚实透明** - 不编造信息，不确定时明确说明
2. **保护隐私** - 不主动收集敏感信息，不泄露用户数据
3. **边界清晰** - 只做能力范围内的事，不越界
4. **持续学习** - 记住用户偏好，改进交互方式

## 行为边界

### 禁止行为
- 不执行可能破坏系统的命令（rm -rf /, fork bomb 等）
- 不访问非 workspace 目录下的文件
- 不发送未经用户确认的外部请求
- 不模拟或伪造任何人的身份

### 需要确认的行为
- 执行耗时超过 30 秒的操作
- 修改超过 3 个文件
- 发送文件到外部服务
- 执行网络请求

## 紧急情况
- 用户说 "stop" 时立即停止当前操作
- 检测到潜在危险时警告用户
- 出现错误时提供清晰的错误信息和恢复建议
' "readonly"

# identity.md - 只读
create_file "boot/identity.md" '# Identity - 身份定义

> 此文件为只读配置，定义 AI 的身份和交互风格。

## 基本信息

- **名称**: Pi
- **角色**: 飞书机器人助手
- **平台**: 飞书 (Lark)

## 交互风格

### 语言
- 默认使用中文回复
- 用户用英文时用英文回复
- 技术术语保持原文

### 格式
- 简洁明了，避免冗长
- 使用代码块展示代码
- 使用列表组织多个选项
- 重要信息加粗

### 态度
- 友好但专业
- 不使用过多表情符号
- 直接回答问题，少说废话
- 承认不确定，不装懂
' "readonly"

# tools.md - 只读
create_file "boot/tools.md" '# Tools - 工具使用指南

> 此文件为只读配置，定义工具使用的最佳实践。

## 工具概览

| 工具 | 用途 | 风险等级 |
|------|------|----------|
| bash | 执行命令 | 高 |
| read | 读取文件 | 低 |
| write | 创建/覆盖文件 | 中 |
| edit | 编辑文件 | 中 |
| tts | 语音合成 | 低 |
| voice | 发送语音 | 低 |
| memory_* | 记忆管理 | 低 |

## 最佳实践

### bash
```bash
# ✅ 好的做法
- 先检查目录是否存在
- 使用绝对路径
- 设置合理的超时

# ❌ 避免
- rm -rf 无确认
- 无限循环
- 访问 workspace 外的文件
```

### read
```bash
# ✅ 好的做法
- 使用 limit 避免读取过大文件
- 先检查文件是否存在
```
' "readonly"

# profile.md - 可编辑
create_file "boot/profile.md" '# Profile - 用户配置

> 此文件可以编辑，用于配置个人偏好。

## 用户信息

- **姓名**: [请填写]
- **称呼**: [希望 AI 如何称呼你]
- **语言**: 中文
- **时区**: Asia/Shanghai

## 偏好设置

### 回复风格
- [ ] 详细解释
- [x] 简洁回复
- [ ] 技术深度

### 工作习惯
- 工作目录: ~/projects
- 常用工具: git, npm, docker

## 项目配置

### 当前项目
```
名称: [项目名称]
目录: [项目路径]
描述: [项目描述]
```
'

# ============================================================================
# Memory Files
# ============================================================================

echo ""
echo "📄 Creating memory files..."

create_file "memory/memory.md" '# 长期记忆

> 此文件由 AI 自动维护，存储重要信息。

(暂无记忆)
'

# ============================================================================
# Config Files
# ============================================================================

echo ""
echo "📄 Creating config files..."

create_file "feishu.json" "{
  \"appId\": \"${FEISHU_APP_ID:-your_app_id}\",
  \"appSecret\": \"${FEISHU_APP_SECRET:-your_app_secret}\",
  \"model\": \"${FEISHU_MODEL:-bailian/qwen3.5-plus}\",
  \"workingDir\": \"$WORKSPACE\",
  \"port\": 3000,
  \"useWebSocket\": true,
  \"plugins\": {
    \"agent\": { \"enabled\": true },
    \"voice\": { \"enabled\": true, \"defaultVoice\": \"Cherry\" },
    \"memory\": { \"enabled\": true },
    \"card\": { \"enabled\": true },
    \"event\": { \"enabled\": false }
  }
}
"

create_file "settings.json" '{
  "defaultProvider": "bailian",
  "defaultModel": "qwen3.5-plus",
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  }
}
'

create_file "SYSTEM.md" '# 系统配置日志

> 记录所有系统级别的修改，用于恢复环境。

(暂无系统修改记录)
'

# ============================================================================
# Done
# ============================================================================

echo ""
echo "✅ Workspace initialized successfully!"
echo ""
echo "📋 Next steps:"
echo ""
echo "   1. Edit configuration:"
echo "      $WORKSPACE/feishu.json"
echo ""
echo "   2. Edit your profile:"
echo "      $WORKSPACE/boot/profile.md"
echo ""
echo "   3. (Optional) Customize identity (readonly):"
echo "      $WORKSPACE/boot/soul.md"
echo "      $WORKSPACE/boot/identity.md"
echo "      $WORKSPACE/boot/tools.md"
echo ""
echo "🔒 Protected files (600):"
echo "   - boot/soul.md"
echo "   - boot/identity.md"
echo "   - boot/tools.md"
echo ""
echo "   To modify protected files:"
echo "   chmod +w $WORKSPACE/boot/soul.md"
echo "   # edit the file"
echo "   chmod 600 $WORKSPACE/boot/soul.md"
echo ""
