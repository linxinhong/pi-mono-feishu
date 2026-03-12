# 飞书文件发送和语音发送功能实施计划

## 1. 需求分析

### 当前状态
- ✅ 文本消息发送
- ✅ 图片消息发送
- ✅ 卡片消息发送
- ⚠️ 文件上传和发送（基础实现，需完善）
- ❌ 语音消息发送（缺失）

### 目标功能
1. **文件发送**：支持发送任意类型文件到飞书聊天
2. **语音发送**：支持发送语音消息（以可播放的语音气泡形式显示）

## 2. 参考实现分析

### feishu-openclaw-plugin 关键实现

#### 文件上传（`media.js`）
```javascript
// 上传文件到飞书
export async function uploadFileLark(params) {
    const { cfg, file, fileName, fileType, duration, accountId } = params;
    const client = LarkClient.fromCfg(cfg, accountId).sdk;
    const fileStream = Buffer.isBuffer(file)
        ? Readable.from(file)
        : fs.createReadStream(file);
    const response = await client.im.file.create({
        data: {
            file_type: fileType,  // "opus" | "mp4" | "pdf" | "doc" | "xls" | "ppt" | "stream"
            file_name: fileName,
            file: fileStream,
            duration: duration,    // 音频/视频时长（毫秒）
        },
    });
    return response.file_key;
}
```

#### 文件类型检测（`media.js`）
```javascript
const EXTENSION_TYPE_MAP = {
    ".opus": "opus",
    ".ogg": "opus",
    ".mp4": "mp4",
    ".mov": "mp4",
    ".pdf": "pdf",
    ".doc": "doc",
    ".docx": "doc",
    ".xls": "xls",
    ".xlsx": "xls",
    ".ppt": "ppt",
    ".pptx": "ppt",
};

export function detectFileType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    return EXTENSION_TYPE_MAP[ext] ?? "stream";
}
```

#### 文件发送（`media.js`）
```javascript
// 发送文件消息（显示为文件附件）
export async function sendFileLark(params) {
    const { cfg, to, fileKey, replyToMessageId, replyInThread, accountId } = params;
    const client = LarkClient.fromCfg(cfg, accountId).sdk;
    const content = JSON.stringify({ file_key: fileKey });
    return sendMediaMessage({ client, to, content, msgType: "file", replyToMessageId, replyInThread });
}
```

#### 语音发送（`media.js`）
```javascript
// 发送语音消息（显示为可播放的语音气泡）
export async function sendAudioLark(params) {
    const { cfg, to, fileKey, replyToMessageId, replyInThread, accountId } = params;
    const client = LarkClient.fromCfg(cfg, accountId).sdk;
    const content = JSON.stringify({ file_key: fileKey });
    // 关键：使用 msg_type: "audio" 而非 "file"
    return sendMediaMessage({ client, to, content, msgType: "audio", replyToMessageId, replyInThread });
}
```

#### OGG/Opus 时长解析（`media.js`）
```javascript
// 解析 OGG/Opus 音频时长（毫秒）
export function parseOggOpusDuration(buffer) {
    // 从后往前扫描找到最后一个 OggS page header
    // 读取 granule position（绝对采样数）
    // 除以 48000（Opus 标准采样率）转换为毫秒
}
```

## 3. 实施计划

### 阶段 1：完善文件发送功能

#### 1.1 增强 `lark-client.ts`

**修改 `uploadFile` 方法：**
```typescript
async uploadFile(filePath: string, fileType?: string, duration?: number): Promise<string> {
    // 1. 检测文件类型（如果没有提供）
    // 2. 创建文件流
    // 3. 调用 im.file.create API
    // 4. 返回 file_key
}
```

**新增 `sendAudio` 方法：**
```typescript
async sendAudio(receiveId: string, fileKey: string, duration?: number): Promise<FeishuSendResult> {
    // 使用 msg_type: "audio" 发送语音消息
}
```

#### 1.2 更新 `message.ts` 类型定义

```typescript
export interface UniversalResponse {
    type: "text" | "image" | "card" | "audio" | "file";
    // ... 其他字段
    filePath?: string;      // 文件路径
    fileType?: string;      // 文件类型
    duration?: number;      // 音频/视频时长（毫秒）
}
```

#### 1.3 增强 `sender.ts`

**新增 `sendAudio` 方法：**
```typescript
async sendAudio(chatId: string, fileKey: string, duration?: number): Promise<string> {
    // 调用 larkClient.sendAudio
}
```

### 阶段 1.5：TTS/STT 基础架构

#### 1.5.1 文字转语音 (TTS)

**新增 `src/core/voice/tts.ts`：**
```typescript
export interface TTSOptions {
    text: string;
    voice?: string;        // 音色选择
    speed?: number;        // 语速 0.5-2.0
    outputPath: string;    // 输出文件路径
}

export interface TTSProvider {
    name: string;
    synthesize(options: TTSOptions): Promise<string>; // 返回音频文件路径
}

// 支持多种 TTS 引擎
export class OpenAITTS implements TTSProvider;
export class EdgeTTS implements TTSProvider;  // 免费微软 Edge TTS
```

#### 1.5.2 语音转文字 (STT)

**新增 `src/core/voice/stt.ts`：**
```typescript
export interface STTOptions {
    audioPath: string;
    language?: string;     // 语言代码，默认 zh
}

export interface STTProvider {
    name: string;
    transcribe(options: STTOptions): Promise<string>;
}

// 支持多种 STT 引擎
export class WhisperSTT implements STTProvider;
export class OpenAISTT implements STTProvider;
```

### 阶段 2：实现语音消息功能

#### 2.1 语音文件处理

**新增 `audio-utils.ts`：**
```typescript
// 检测文件是否为音频
export function isAudioFile(filePath: string): boolean;

// 解析音频时长（支持多种格式）
export function parseAudioDuration(filePath: string): number | undefined;

// 转换音频为 OGG/Opus 格式（飞书语音要求）
export async function convertToOpus(inputPath: string, outputPath: string): Promise<void>;
```

#### 2.2 更新 `FeishuPlatformContext`

**完善 `sendVoiceMessage` 方法：**
```typescript
async sendVoiceMessage(chatId: string, filePath: string): Promise<string> {
    // 1. 检查文件格式，如果不是 OGG/Opus 则转换
    // 2. 解析音频时长
    // 3. 上传文件（file_type: "opus"）
    // 4. 发送语音消息（msg_type: "audio"）
}
```

### 阶段 3：工具集成

#### 3.1 新增 AI 工具

**文件发送工具（`send_file.ts`）：**
```typescript
{
    name: "send_file",
    description: "发送文件到当前聊天",
    parameters: {
        file_path: "文件路径",
        description: "文件描述（可选）"
    }
}
```

**语音发送工具（`send_voice.ts`）：**
```typescript
{
    name: "send_voice",
    description: "发送语音消息到当前聊天",
    parameters: {
        file_path: "语音文件路径（支持 mp3, wav, ogg, opus 等格式）",
        description: "语音描述（可选）"
    }
}
```

#### 3.2 工具自动注册

在 `FeishuPlatformContext.getTools()` 中动态注册文件和语音工具。

### 阶段 4：测试和文档

#### 4.1 测试用例

| 场景 | 预期结果 |
|------|----------|
| 发送 PDF 文件 | 显示为文件附件，可下载 |
| 发送 DOCX 文件 | 显示为文件附件，可下载 |
| 发送 OGG 语音 | 显示为语音气泡，可播放 |
| 发送 MP3 语音 | 自动转换格式，显示为语音气泡 |
| 回复时发送文件 | 文件作为回复消息发送 |

#### 4.2 文档更新

- 更新 `SKILL.md` 添加文件和语音功能说明
- 更新系统提示词指导 AI 使用新工具

## 4. 文件变更清单

| 文件路径 | 变更类型 | 说明 |
|----------|----------|------|
| `src/core/platform/message.ts` | 修改 | 扩展 UniversalResponse 类型 |
| `src/adapters/feishu/client/lark-client.ts` | 修改 | 增强 uploadFile，新增 sendAudio |
| `src/adapters/feishu/messaging/outbound/sender.ts` | 修改 | 新增 sendAudio 方法 |
| `src/adapters/feishu/context.ts` | 修改 | 完善 sendVoiceMessage 方法 |
| `src/adapters/feishu/utils/file-type.ts` | 新增 | 文件类型检测 |
| `src/adapters/feishu/utils/audio-utils.ts` | 新增 | 音频处理工具 |
| `src/adapters/feishu/tools/send-file.ts` | 新增 | 文件发送工具 |
| `src/adapters/feishu/tools/send-voice.ts` | 新增 | 语音发送工具 |

## 5. 时间估算

| 阶段 | 预计时间 |
|------|----------|
| 阶段 1：完善文件发送 | 2-3 小时 |
| 阶段 2：实现语音消息 | 3-4 小时 |
| 阶段 3：工具集成 | 2-3 小时 |
| 阶段 4：测试和文档 | 1-2 小时 |
| **总计** | **8-12 小时** |

## 6. 风险和对策

| 风险 | 对策 |
|------|------|
| 音频格式转换依赖外部工具（ffmpeg） | 优先使用纯 JS 方案，或优雅降级提示用户安装 |
| 大文件上传超时 | 分片上传或增加超时配置 |
| 飞书 API 限制 | 添加重试机制和错误处理 |

## 7. 完成状态

| 阶段 | 状态 | 说明 |
|------|------|------|
| 阶段 1：完善文件发送功能 | ✅ 完成 | uploadFile 增强，支持文件类型检测和时长参数 |
| 阶段 1.5：TTS/STT 基础架构 | ✅ 完成 | EdgeTTS、WhisperSTT、VoiceManager 实现 |
| 阶段 2：实现语音消息功能 | ✅ 完成 | sendAudio 方法，音频时长解析工具 |
| 阶段 3：工具集成 | ✅ 完成 | send_file、send_voice、speak、list_voices、transcribe 工具 |
| 阶段 4：测试和文档 | ✅ 完成 | 系统提示词更新，支持 AI 使用新功能 |

## 8. 使用指南

### 文件发送
```
AI: 我将发送这个文件给你
[使用 send_file 工具]
```

### 语音发送
```
AI: 我来发一段语音
[使用 send_voice 工具]
```

### 文字转语音
```
用户: 用语音回复我
AI: [使用 speak 工具]
```

### 语音转文字
```
用户: [发送语音]
AI: [使用 transcribe 工具识别语音内容]
```

## 9. 依赖安装

### Edge TTS（文字转语音）
```bash
pip install edge-tts
```

### Whisper（语音转文字）
```bash
# 方案 1：OpenAI API（云端）
export OPENAI_API_KEY=your_key

# 方案 2：本地 whisper.cpp
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp && make
```
