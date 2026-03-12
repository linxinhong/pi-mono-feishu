/**
 * Voice Module
 *
 * TTS/STT 语音模块入口
 */

// Types
export type {
	VoiceConfig,
	TTSOptions,
	TTSResult,
	TTSProvider,
	TTSVoice,
	STTOptions,
	STTResult,
	STTProvider,
	STTSegment,
} from "./types.js";

// Providers
export { EdgeTTS } from "./edge-tts.js";
export { DashScopeTTS } from "./dashscope-tts.js";
export { WhisperSTT } from "./whisper-stt.js";
export { DashScopeSTT } from "./dashscope-stt.js";

// Manager
export { VoiceManager, getVoiceManager, setVoiceManager } from "./manager.js";

// Utils
export {
	parseOggOpusDuration,
	parseWavDuration,
	estimateMp3Duration,
	parseAudioDuration,
	isValidAudioFile,
} from "../../adapters/feishu/utils/audio-utils.js";
