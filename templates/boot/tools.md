# Tools - 工具使用指南

> 此文件为只读配置（权限 600），定义工具使用的最佳实践。
> 修改此文件需要先解锁：`npm run unlock`

## 工具概览

| 工具 | 用途 | 风险等级 | 执行时间 |
|------|------|----------|----------|
| `bash` | 执行 shell 命令 | 🔴 高 | 可变 |
| `read` | 读取文件 | 🟢 低 | <1s |
| `write` | 创建/覆盖文件 | 🟡 中 | <1s |
| `edit` | 编辑文件 | 🟡 中 | <1s |
| `tts` | 文字转语音 | 🟢 低 | 2-5s |
| `voice` | 发送语音文件 | 🟢 低 | 1-3s |
| `transcribe` | 语音转文字 | 🟢 低 | 2-5s |
| `memory_save` | 保存记忆 | 🟢 低 | <1s |
| `memory_recall` | 检索记忆 | 🟢 低 | <1s |
| `memory_forget` | 删除记忆 | 🟡 中 | <1s |
| `memory_append_daily` | 添加日志 | 🟢 低 | <1s |
| `buildCard` | 构建卡片 | 🟢 低 | <1s |

## 工具详细指南

### bash - Shell 命令执行

**最佳实践：**
```bash
# ✅ 好的做法
- 使用绝对路径或相对于 workspace 的路径
- 先检查命令是否存在
- 设置合理的超时时间
- 捕获并处理错误输出

# ❌ 避免
- rm -rf 无确认
- 无限循环
- 后台执行的进程
- 访问 workspace 外的文件
```

**安全模式命令：**
```bash
# 文件操作
ls -la                    # 列出文件
cat file.txt              # 查看内容
find . -name "*.ts"       # 搜索文件
grep -r "pattern" .       # 搜索内容

# Git 操作
git status
git diff
git log --oneline -10

# 包管理
npm install
npm run build
npm test
```

**需要确认的命令：**
```bash
rm -rf directory/
git push
npm publish
docker system prune
```

### read - 文件读取

**最佳实践：**
```typescript
// ✅ 好的做法
- 使用 offset 和 limit 避免读取过大文件
- 先用 bash ls 检查文件是否存在
- 二进制文件用 bash file 检查类型

// ❌ 避免
- 读取 node_modules 等大目录
- 读取二进制文件
- 读取敏感配置（.env, credentials）
```

**示例：**
```typescript
// 读取前 100 行
{ path: "src/main.ts", offset: 1, limit: 100 }

// 读取配置文件
{ path: "package.json" }
```

### write - 文件写入

**最佳实践：**
```typescript
// ✅ 好的做法
- 新文件先确认目录存在
- 重要文件先备份
- 使用 UTF-8 编码
- 添加必要的注释

// ❌ 避免
- 覆盖 .git 目录
- 写入 workspace 外
- 覆盖 package-lock.json
```

### edit - 文件编辑

**最佳实践：**
```typescript
// ✅ 好的做法
- old_string 足够唯一（包含上下文）
- 保持原有的缩进格式
- 编辑后验证结果

// ❌ 避免
- 过于宽泛的 old_string
- 同时编辑多处（使用多次 edit）
- 编辑二进制文件
```

**示例：**
```typescript
// 精确匹配（推荐）
{
  old_string: "function hello() {\n  return 'world';\n}",
  new_string: "function hello() {\n  return 'hello';\n}"
}

// 避免过于宽泛
{
  old_string: "return 'world';",  // ❌ 可能有多个匹配
  new_string: "return 'hello';"
}
```

### memory_* - 记忆管理

**何时保存记忆：**
```
- 用户明确要求记住
- 重要的用户偏好
- 项目关键信息
- 重要的决策和原因
```

**何时检索记忆：**
```
- 用户问"你还记得..."
- 需要上下文信息
- 项目相关的问题
- 用户偏好相关
```

**每日日志：**
```
- 完成的任务
- 遇到的问题和解决方案
- 重要的发现
- 待办事项
```

## 工具组合模式

### 创建新文件
```
1. write 创建文件
2. read 验证内容
```

### 调试问题
```
1. read 查看相关文件
2. bash 执行诊断命令
3. edit 修复问题
4. bash 验证修复
```

### 代码重构
```
1. read 读取目标文件
2. edit 进行修改（可能多次）
3. read 验证结果
4. bash 运行测试
```

### 知识管理
```
1. memory_recall 搜索相关记忆
2. 执行任务
3. memory_save 保存新知识
4. memory_append_daily 记录今日工作
```
