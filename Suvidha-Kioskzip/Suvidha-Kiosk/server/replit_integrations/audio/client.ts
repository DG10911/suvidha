import OpenAI, { toFile } from "openai";
import type { SpeechCreateParams } from "openai/resources/audio/speech";
import { Buffer } from "node:buffer";
import { spawn } from "child_process";
import { writeFile, unlink, readFile } from "fs/promises";
import { randomUUID } from "crypto";
import { tmpdir } from "os";
import { join } from "path";

const TTS_CHUNK_SIZE = 4096;

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type AudioFormat = "wav" | "mp3" | "webm" | "mp4" | "ogg" | "unknown";

/**
 * Detect audio format from buffer magic bytes.
 * Supports: WAV, MP3, WebM (Chrome/Firefox), MP4/M4A/MOV (Safari/iOS), OGG
 */
export function detectAudioFormat(buffer: Buffer): AudioFormat {
  if (buffer.length < 12) return "unknown";

  // WAV: RIFF....WAVE
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return "wav";
  }
  // WebM: EBML header
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return "webm";
  }
  // MP3: ID3 tag or frame sync
  if (
    (buffer[0] === 0xff && (buffer[1] === 0xfb || buffer[1] === 0xfa || buffer[1] === 0xf3)) ||
    (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33)
  ) {
    return "mp3";
  }
  // MP4/M4A/MOV: ....ftyp (Safari/iOS records in these containers)
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
    return "mp4";
  }
  // OGG: OggS
  if (buffer[0] === 0x4f && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) {
    return "ogg";
  }
  return "unknown";
}

/**
 * Convert any audio/video format to WAV using ffmpeg.
 * Uses temp files instead of pipes because video containers (MP4/MOV)
 * require seeking to find the audio track.
 */
export async function convertToWav(audioBuffer: Buffer): Promise<Buffer> {
  const inputPath = join(tmpdir(), `input-${randomUUID()}`);
  const outputPath = join(tmpdir(), `output-${randomUUID()}.wav`);

  try {
    // Write input to temp file (required for video containers that need seeking)
    await writeFile(inputPath, audioBuffer);

    // Run ffmpeg with file paths
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-i", inputPath,
        "-vn",              // Extract audio only (ignore video track)
        "-f", "wav",
        "-ar", "16000",     // 16kHz sample rate (good for speech)
        "-ac", "1",         // Mono
        "-acodec", "pcm_s16le",
        "-y",               // Overwrite output
        outputPath,
      ]);

      ffmpeg.stderr.on("data", () => {}); // Suppress logs
      ffmpeg.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}`));
      });
      ffmpeg.on("error", reject);
    });

    // Read converted audio
    return await readFile(outputPath);
  } finally {
    // Clean up temp files
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}

/**
 * Auto-detect and convert audio to OpenAI-compatible format.
 * - WAV/MP3: Pass through (already compatible)
 * - WebM/MP4/OGG: Convert to WAV via ffmpeg
 */
export async function ensureCompatibleFormat(
  audioBuffer: Buffer
): Promise<{ buffer: Buffer; format: "wav" | "mp3" }> {
  const detected = detectAudioFormat(audioBuffer);
  if (detected === "wav") return { buffer: audioBuffer, format: "wav" };
  if (detected === "mp3") return { buffer: audioBuffer, format: "mp3" };
  // Convert WebM, MP4, OGG, or unknown to WAV
  const wavBuffer = await convertToWav(audioBuffer);
  return { buffer: wavBuffer, format: "wav" };
}

/**
 * Voice Chat: User speaks, LLM responds with audio (audio-in, audio-out).
 * Uses whisper-1 for STT, gpt-4o-mini for chat, tts-1 for TTS.
 */
export async function voiceChat(
  audioBuffer: Buffer,
  voice: SpeechCreateParams["voice"] = "alloy",
  inputFormat: "wav" | "mp3" = "wav",
  outputFormat: "wav" | "mp3" = "mp3"
): Promise<{ transcript: string; audioResponse: Buffer }> {
  const audioFile = await toFile(audioBuffer, `audio.${inputFormat}`);
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-1",
  });
  const transcript = transcription.text;
  const ttsResponse = await openai.audio.speech.create({
    model: "tts-1",
    voice,
    input: transcript,
    response_format: outputFormat === "mp3" ? "mp3" : "opus",
  });
  const audioResponse = Buffer.from(await ttsResponse.arrayBuffer());
  return { transcript, audioResponse };
}

/**
 * Streaming Voice Chat: User speaks, LLM responds with audio.
 */
export async function voiceChatStream(
  audioBuffer: Buffer,
  voice: SpeechCreateParams["voice"] = "alloy",
  inputFormat: "wav" | "mp3" = "wav"
): Promise<AsyncIterable<{ type: "transcript" | "audio"; data: string }>> {
  const audioFile = await toFile(audioBuffer, `audio.${inputFormat}`);
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-1",
  });
  const transcript = transcription.text;
  const ttsResponse = await openai.audio.speech.create({
    model: "tts-1",
    voice,
    input: transcript,
    response_format: "pcm",
  });
  const pcmBuffer = Buffer.from(await ttsResponse.arrayBuffer());

  return (async function* () {
    yield { type: "transcript" as const, data: transcript };
    yield { type: "audio" as const, data: pcmBuffer.toString("base64") };
  })();
}

/**
 * Text-to-Speech: Converts text to speech using OpenAI tts-1 model.
 */
export async function textToSpeech(
  text: string,
  voice: SpeechCreateParams["voice"] = "alloy",
  format: "wav" | "mp3" | "flac" | "opus" | "pcm" = "mp3"
): Promise<Buffer> {
  const ttsResponse = await openai.audio.speech.create({
    model: "tts-1",
    voice,
    input: text,
    response_format: format,
  });
  return Buffer.from(await ttsResponse.arrayBuffer());
}

/**
 * Streaming Text-to-Speech: Converts text to speech, returns PCM16 chunks.
 */
export async function textToSpeechStream(
  text: string,
  voice: SpeechCreateParams["voice"] = "alloy"
): Promise<AsyncIterable<string>> {
  const ttsResponse = await openai.audio.speech.create({
    model: "tts-1",
    voice,
    input: text,
    response_format: "pcm",
  });
  const pcmBuffer = Buffer.from(await ttsResponse.arrayBuffer());

  return (async function* () {
    for (let i = 0; i < pcmBuffer.length; i += TTS_CHUNK_SIZE) {
      yield pcmBuffer.slice(i, i + TTS_CHUNK_SIZE).toString("base64");
    }
  })();
}

/**
 * Speech-to-Text: Transcribes audio using Whisper.
 */
export async function speechToText(
  audioBuffer: Buffer,
  format: "wav" | "mp3" | "webm" = "wav"
): Promise<string> {
  const file = await toFile(audioBuffer, `audio.${format}`);
  const response = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
  });
  return response.text;
}

/**
 * Streaming Speech-to-Text: Transcribes audio using Whisper (non-streaming fallback).
 */
export async function speechToTextStream(
  audioBuffer: Buffer,
  format: "wav" | "mp3" | "webm" = "wav"
): Promise<AsyncIterable<string>> {
  const text = await speechToText(audioBuffer, format);
  return (async function* () {
    yield text;
  })();
}
