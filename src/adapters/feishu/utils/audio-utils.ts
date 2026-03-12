/**
 * Audio Utilities
 *
 * 音频处理工具 - 时长解析、格式检测等
 */

import { promises as fs } from "fs";

// ============================================================================
// Types
// ============================================================================

export interface AudioInfo {
	duration: number;      // 时长（毫秒）
	bitrate?: number;      // 比特率（kbps）
	sampleRate?: number;   // 采样率（Hz）
	channels?: number;     // 声道数
}

// ============================================================================
// OGG/Opus Duration Parsing
// ============================================================================

/**
 * 从 OGG/Opus 文件缓冲区解析时长
 *
 * 原理：扫描 OggS page header，读取 granule position（绝对采样数），
 * 除以 48000（Opus 标准采样率）转换为毫秒
 *
 * @param buffer 音频文件缓冲区
 * @returns 时长（毫秒），解析失败返回 undefined
 */
export function parseOggOpusDuration(buffer: Buffer): number | undefined {
	// 最小 OGG 文件头大小
	if (buffer.length < 27) return undefined;

	// 查找最后一个 OggS page
	const oggSignature = Buffer.from("OggS");
	let lastGranulePosition = BigInt(0);
	let found = false;

	// 从后往前扫描，找到最后一个 OggS page
	for (let i = buffer.length - 1; i >= 0; i--) {
		if (buffer[i] === oggSignature[0]) {
			// 检查是否为 OggS 签名
			if (buffer.slice(i, i + 4).equals(oggSignature)) {
				// 确保有足够的字节读取 granule position
				if (i + 14 <= buffer.length) {
					// Granule position 是 64 位整数（小端序），位于 OggS 后第 6 字节
					const granulePos = buffer.readBigInt64LE(i + 6);
					if (granulePos > lastGranulePosition) {
						lastGranulePosition = granulePos;
						found = true;
					}
				}
			}
		}
	}

	if (!found) return undefined;

	// Opus 标准采样率为 48000 Hz
	const sampleRate = 48000;
	const durationMs = Number(lastGranulePosition) / sampleRate * 1000;

	return Math.round(durationMs);
}

/**
 * 从文件路径解析 OGG/Opus 时长
 * @param filePath 音频文件路径
 */
export async function parseOggOpusDurationFromFile(filePath: string): Promise<number | undefined> {
	try {
		const buffer = await fs.readFile(filePath);
		return parseOggOpusDuration(buffer);
	} catch {
		return undefined;
	}
}

// ============================================================================
// WAV Duration Parsing
// ============================================================================

/**
 * 从 WAV 文件缓冲区解析时长
 * @param buffer 音频文件缓冲区
 */
export function parseWavDuration(buffer: Buffer): number | undefined {
	// WAV 文件头最小大小
	if (buffer.length < 44) return undefined;

	// 检查 RIFF 和 WAVE 标记
	const riff = buffer.slice(0, 4).toString("ascii");
	const wave = buffer.slice(8, 12).toString("ascii");
	if (riff !== "RIFF" || wave !== "WAVE") return undefined;

	// 读取采样率（第 24-27 字节，小端序）
	const sampleRate = buffer.readUInt32LE(24);
	// 读取数据块大小（第 40-43 字节，小端序）
	const dataChunkSize = buffer.readUInt32LE(40);
	// 读取每个采样点的字节数（第 32-33 字节）
	const blockAlign = buffer.readUInt16LE(32);

	if (sampleRate === 0 || blockAlign === 0) return undefined;

	const numSamples = dataChunkSize / blockAlign;
	const durationMs = (numSamples / sampleRate) * 1000;

	return Math.round(durationMs);
}

/**
 * 从文件路径解析 WAV 时长
 * @param filePath 音频文件路径
 */
export async function parseWavDurationFromFile(filePath: string): Promise<number | undefined> {
	try {
		const buffer = await fs.readFile(filePath);
		return parseWavDuration(buffer);
	} catch {
		return undefined;
	}
}

// ============================================================================
// MP3 Duration Estimation
// ============================================================================

/**
 * 从 MP3 文件缓冲区估算时长（简化版）
 *
 * 注意：MP3 时长计算较复杂，此方法为简化估算
 * @param buffer 音频文件缓冲区
 */
export function estimateMp3Duration(buffer: Buffer): number | undefined {
	// 查找第一个 MP3 frame sync（11 个 1）
	for (let i = 0; i < buffer.length - 1; i++) {
		if (buffer[i] === 0xFF && (buffer[i + 1] & 0xE0) === 0xE0) {
			// 解析 frame header
			const version = (buffer[i + 1] >> 3) & 0x3;
			const layer = (buffer[i + 1] >> 1) & 0x3;
			const bitrateIndex = (buffer[i + 2] >> 4) & 0xF;
			const sampleRateIndex = (buffer[i + 2] >> 2) & 0x3;

			// 比特率表（kbps）
			const bitrates = [
				[0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
				[0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
				[0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
				[0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
			];

			// 采样率表（Hz）
			const sampleRates = [44100, 48000, 32000, 0];

			const bitrate = bitrates[version]?.[bitrateIndex] || 128;
			const sampleRate = sampleRates[sampleRateIndex] || 44100;

			// 估算时长：文件大小 / 比特率
			const fileSizeBits = buffer.length * 8;
			const bitrateBps = bitrate * 1000;
			const durationMs = (fileSizeBits / bitrateBps) * 1000;

			return Math.round(durationMs);
		}
	}

	return undefined;
}

/**
 * 从文件路径估算 MP3 时长
 * @param filePath 音频文件路径
 */
export async function estimateMp3DurationFromFile(filePath: string): Promise<number | undefined> {
	try {
		const buffer = await fs.readFile(filePath);
		return estimateMp3Duration(buffer);
	} catch {
		return undefined;
	}
}

// ============================================================================
// Generic Duration Parser
// ============================================================================

/**
 * 自动检测音频格式并解析时长
 * @param filePath 音频文件路径
 */
export async function parseAudioDuration(filePath: string): Promise<number | undefined> {
	const { extname } = await import("path");
	const ext = extname(filePath).toLowerCase();

	switch (ext) {
		case ".opus":
		case ".ogg":
			return parseOggOpusDurationFromFile(filePath);
		case ".wav":
			return parseWavDurationFromFile(filePath);
		case ".mp3":
			return estimateMp3DurationFromFile(filePath);
		default:
			return undefined;
	}
}

// ============================================================================
// Audio Validation
// ============================================================================

/**
 * 验证文件是否为有效的音频文件
 * @param filePath 文件路径
 */
export async function isValidAudioFile(filePath: string): Promise<boolean> {
	try {
		const buffer = await fs.readFile(filePath);
		if (buffer.length < 10) return false;

		const { extname } = await import("path");
		const ext = extname(filePath).toLowerCase();

		switch (ext) {
			case ".wav":
				return buffer.slice(0, 4).toString("ascii") === "RIFF";
			case ".mp3":
				// 检查 MP3 frame sync
				return buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0;
			case ".ogg":
			case ".opus":
				return buffer.slice(0, 4).toString("ascii") === "OggS";
			default:
				return false;
		}
	} catch {
		return false;
	}
}
