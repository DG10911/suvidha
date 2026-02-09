const audioCache = new Map<string, ArrayBuffer>();
const preloadingKeys = new Set<string>();
let audioCtx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let speechQueue: Array<{ text: string; lang: string; resolve: () => void }> = [];
let isProcessingQueue = false;
let currentLang: string = "en";
let languageChangeTimer: ReturnType<typeof setTimeout> | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioContext({ sampleRate: 24000 });
  }
  return audioCtx;
}

function pcm16ToFloat32(pcmBuffer: ArrayBuffer): Float32Array {
  const int16 = new Int16Array(pcmBuffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768;
  }
  return float32;
}

function playPCM16(pcmBuffer: ArrayBuffer): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ctx = getAudioContext();
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      if (currentSource) {
        try { currentSource.stop(); } catch {}
        currentSource = null;
      }

      const float32 = pcm16ToFloat32(pcmBuffer);
      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        currentSource = null;
        resolve();
      };
      currentSource = source;
      source.start();
    } catch {
      currentSource = null;
      resolve();
    }
  });
}

export function stopSpeech() {
  if (currentSource) {
    try { currentSource.stop(); } catch {}
    currentSource = null;
  }

  if (pendingRequest) {
    pendingRequest.abort();
    pendingRequest = null;
  }

  speechQueue = [];
  isProcessingQueue = false;

  if (languageChangeTimer) {
    clearTimeout(languageChangeTimer);
    languageChangeTimer = null;
  }
}

let pendingRequest: AbortController | null = null;

async function fetchAndPlayTTS(text: string, lang?: string): Promise<void> {
  if (!text.trim()) return;

  const cacheKey = `${text}::${lang || "en"}`;
  const cached = audioCache.get(cacheKey);
  if (cached) {
    await playPCM16(cached);
    return;
  }

  if (pendingRequest) {
    pendingRequest.abort();
  }

  const controller = new AbortController();
  pendingRequest = controller;

  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang }),
      signal: controller.signal,
    });

    if (!res.ok) return;

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > 0) {
      audioCache.set(cacheKey, buffer);
      if (audioCache.size > 100) {
        const firstKey = audioCache.keys().next().value;
        if (firstKey) audioCache.delete(firstKey);
      }
      if (!controller.signal.aborted) {
        await playPCM16(buffer);
      }
    }
  } catch (e: any) {
    if (e?.name !== "AbortError") {
      console.error("TTS playback error:", e);
    }
  } finally {
    if (pendingRequest === controller) {
      pendingRequest = null;
    }
  }
}

async function processQueue(): Promise<void> {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (speechQueue.length > 0) {
    const item = speechQueue[0];
    if (!item) break;

    try {
      await fetchAndPlayTTS(item.text, item.lang);
    } catch {}

    speechQueue.shift();
    item.resolve();

    if (speechQueue.length > 0) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  isProcessingQueue = false;
}

export async function speakText(text: string, lang?: string): Promise<void> {
  if (!text.trim()) return;

  stopSpeech();

  await new Promise(r => setTimeout(r, 150));

  return new Promise<void>((resolve) => {
    speechQueue.push({ text, lang: lang || "en", resolve });
    processQueue();
  });
}

export function speakWithDelay(text: string, lang?: string, delayMs: number = 400): void {
  setTimeout(() => {
    speakText(text, lang).catch(() => {});
  }, delayMs);
}

export function handleLanguageChange(newLang: string, getText: () => string): void {
  stopSpeech();

  currentLang = newLang;

  if (languageChangeTimer) {
    clearTimeout(languageChangeTimer);
  }

  languageChangeTimer = setTimeout(() => {
    languageChangeTimer = null;
    const text = getText();
    if (text) {
      speakText(text, newLang).catch(() => {});
    }
  }, 800);
}

export function getCurrentLang(): string {
  return currentLang;
}

export function setCurrentLang(lang: string): void {
  currentLang = lang;
}

export function preloadText(text: string, lang?: string): void {
  const cacheKey = `${text}::${lang || "en"}`;
  if (audioCache.has(cacheKey) || preloadingKeys.has(cacheKey)) return;
  preloadingKeys.add(cacheKey);
  fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, lang }),
  })
    .then((res) => (res.ok ? res.arrayBuffer() : null))
    .then((buf) => {
      if (buf && buf.byteLength > 0) {
        audioCache.set(cacheKey, buf);
        if (audioCache.size > 100) {
          const firstKey = audioCache.keys().next().value;
          if (firstKey) audioCache.delete(firstKey);
        }
      }
    })
    .catch(() => {})
    .finally(() => preloadingKeys.delete(cacheKey));
}
