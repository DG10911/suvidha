import * as faceapi from "face-api.js";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;
let mediapipeLandmarker: FaceLandmarker | null = null;
let mediapipeReady = false;

async function initMediaPipe(): Promise<void> {
  if (mediapipeReady && mediapipeLandmarker) return;
  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    mediapipeLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate: "GPU",
      },
      outputFaceBlendshapes: true,
      runningMode: "VIDEO",
      numFaces: 1,
    });
    mediapipeReady = true;
    console.log("[MediaPipe] FaceLandmarker initialized");
  } catch (err) {
    console.warn("[MediaPipe] Failed to initialize, will fall back to face-api.js:", err);
    mediapipeLandmarker = null;
    mediapipeReady = false;
  }
}

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const MODEL_URL = "/models";
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      initMediaPipe(),
    ]);
    modelsLoaded = true;
  })();

  return loadingPromise;
}

export interface LivenessResult {
  isLive: boolean;
  checks: {
    faceDetected: boolean;
    textureAnalysis: boolean;
    screenDetection: boolean;
    motionDetected: boolean;
    eyeOpenness: boolean;
    blinkDetected: boolean;
    consistentDescriptor: boolean;
  };
  message: string;
  capturedFrames?: string[];
}

export type LivenessStepKey = keyof LivenessResult["checks"];

function analyzeEyeOpenness(landmarks: faceapi.FaceLandmarks68): { leftOpen: number; rightOpen: number; leftHeight: number; rightHeight: number } {
  const positions = landmarks.positions;

  const leftEyeTop = (positions[37].y + positions[38].y) / 2;
  const leftEyeBottom = (positions[41].y + positions[40].y) / 2;
  const leftEyeLeft = positions[36].x;
  const leftEyeRight = positions[39].x;
  const leftEyeHeight = Math.abs(leftEyeBottom - leftEyeTop);
  const leftEyeWidth = Math.abs(leftEyeRight - leftEyeLeft);
  const leftEAR = leftEyeHeight / (leftEyeWidth + 0.001);

  const rightEyeTop = (positions[43].y + positions[44].y) / 2;
  const rightEyeBottom = (positions[47].y + positions[46].y) / 2;
  const rightEyeLeft = positions[42].x;
  const rightEyeRight = positions[45].x;
  const rightEyeHeight = Math.abs(rightEyeBottom - rightEyeTop);
  const rightEyeWidth = Math.abs(rightEyeRight - rightEyeLeft);
  const rightEAR = rightEyeHeight / (rightEyeWidth + 0.001);

  return { leftOpen: leftEAR, rightOpen: rightEAR, leftHeight: leftEyeHeight, rightHeight: rightEyeHeight };
}

function getMouthOpenness(landmarks: faceapi.FaceLandmarks68): number {
  const positions = landmarks.positions;
  const upperLip = positions[62];
  const lowerLip = positions[66];
  const mouthLeft = positions[48];
  const mouthRight = positions[54];
  const mouthWidth = Math.abs(mouthRight.x - mouthLeft.x);
  const mouthHeight = Math.abs(lowerLip.y - upperLip.y);
  return mouthHeight / (mouthWidth + 0.001);
}

function getHeadPose(landmarks: faceapi.FaceLandmarks68): { yaw: number; pitch: number } {
  const positions = landmarks.positions;
  const noseTip = positions[30];
  const leftEye = positions[36];
  const rightEye = positions[45];
  const chin = positions[8];
  const foreheadApprox = positions[27];

  const leftJaw = positions[0];
  const rightJaw = positions[16];

  const faceCenter = { x: (leftJaw.x + rightJaw.x) / 2, y: (leftJaw.y + rightJaw.y) / 2 };
  const faceWidth = Math.abs(rightJaw.x - leftJaw.x);

  const noseDeviationFromFace = (noseTip.x - faceCenter.x) / (faceWidth + 0.001);

  const eyeCenter = { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 };
  const eyeWidth = Math.abs(rightEye.x - leftEye.x);
  const noseDeviationFromEyes = (noseTip.x - eyeCenter.x) / (eyeWidth + 0.001);

  const leftDist = Math.abs(noseTip.x - leftJaw.x);
  const rightDist = Math.abs(noseTip.x - rightJaw.x);
  const asymmetry = (rightDist - leftDist) / (faceWidth + 0.001);

  const yaw = (noseDeviationFromFace + noseDeviationFromEyes + asymmetry) / 3;

  const faceHeight = Math.abs(chin.y - foreheadApprox.y);
  const noseVerticalPos = (noseTip.y - foreheadApprox.y) / (faceHeight + 0.001);
  const pitch = noseVerticalPos - 0.6;

  return { yaw, pitch };
}

function analyzeTextureVariance(canvas: HTMLCanvasElement, faceBox?: { x: number; y: number; width: number; height: number }): number {
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;

  let sx = 0, sy = 0, sw = canvas.width, sh = canvas.height;
  if (faceBox) {
    sx = Math.max(0, Math.floor(faceBox.x));
    sy = Math.max(0, Math.floor(faceBox.y));
    sw = Math.min(canvas.width - sx, Math.ceil(faceBox.width));
    sh = Math.min(canvas.height - sy, Math.ceil(faceBox.height));
  }

  const imageData = ctx.getImageData(sx, sy, sw, sh);
  const data = imageData.data;

  const sampleSize = Math.min(data.length / 4, 15000);
  const step = Math.max(1, Math.floor(data.length / 4 / sampleSize));

  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += step * 4) {
    const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    sum += gray;
    sumSq += gray * gray;
    count++;
  }

  const mean = sum / count;
  const variance = (sumSq / count) - (mean * mean);

  return variance;
}

function analyzeColorDistribution(canvas: HTMLCanvasElement, faceBox?: { x: number; y: number; width: number; height: number }): { 
  colorVariance: number; 
  blueRatio: number; 
  saturationVariance: number;
  brightnessUniformity: number;
} {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { colorVariance: 0, blueRatio: 0, saturationVariance: 0, brightnessUniformity: 1 };

  let sx = 0, sy = 0, sw = canvas.width, sh = canvas.height;
  if (faceBox) {
    sx = Math.max(0, Math.floor(faceBox.x));
    sy = Math.max(0, Math.floor(faceBox.y));
    sw = Math.min(canvas.width - sx, Math.ceil(faceBox.width));
    sh = Math.min(canvas.height - sy, Math.ceil(faceBox.height));
  }

  const imageData = ctx.getImageData(sx, sy, sw, sh);
  const data = imageData.data;

  const step = Math.max(1, Math.floor(data.length / 4 / 5000));
  let rSum = 0, gSum = 0, bSum = 0;
  let rSumSq = 0, gSumSq = 0, bSumSq = 0;
  let totalBlue = 0;
  const saturations: number[] = [];
  const brightnesses: number[] = [];
  let count = 0;

  for (let i = 0; i < data.length; i += step * 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    rSum += r; gSum += g; bSum += b;
    rSumSq += r * r; gSumSq += g * g; bSumSq += b * b;
    if (b > r + 20 && b > g + 20) totalBlue++;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    saturations.push(sat);
    brightnesses.push(max);
    count++;
  }

  const rMean = rSum / count, gMean = gSum / count, bMean = bSum / count;
  const colorVariance = ((rSumSq / count - rMean * rMean) + (gSumSq / count - gMean * gMean) + (bSumSq / count - bMean * bMean)) / 3;
  const blueRatio = totalBlue / count;

  const satMean = saturations.reduce((a, b) => a + b, 0) / saturations.length;
  const satVariance = saturations.reduce((sum, v) => sum + (v - satMean) ** 2, 0) / saturations.length;

  const brtMean = brightnesses.reduce((a, b) => a + b, 0) / brightnesses.length;
  const brtVariance = brightnesses.reduce((sum, v) => sum + (v - brtMean) ** 2, 0) / brightnesses.length;
  const brightnessUniformity = brtVariance;

  return { colorVariance, blueRatio, saturationVariance: satVariance, brightnessUniformity };
}

function detectScreenMoire(canvas: HTMLCanvasElement, faceBox?: { x: number; y: number; width: number; height: number }): number {
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;

  let sx = 0, sy = 0, sw = canvas.width, sh = canvas.height;
  if (faceBox) {
    sx = Math.max(0, Math.floor(faceBox.x));
    sy = Math.max(0, Math.floor(faceBox.y));
    sw = Math.min(canvas.width - sx, Math.ceil(faceBox.width));
    sh = Math.min(canvas.height - sy, Math.ceil(faceBox.height));
  }

  const size = 128;
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = size;
  tempCanvas.height = size;
  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) return 0;
  tempCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, size, size);

  const imageData = tempCtx.getImageData(0, 0, size, size);
  const data = imageData.data;

  const gray: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    gray.push(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
  }

  let highFreqEnergy = 0;
  let totalEnergy = 0;
  let count = 0;

  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const idx = y * size + x;
      const lap = Math.abs(gray[idx - size] + gray[idx + size] + gray[idx - 1] + gray[idx + 1] - 4 * gray[idx]);
      highFreqEnergy += lap;
      totalEnergy += gray[idx];
      count++;
    }
  }

  return count > 0 ? highFreqEnergy / (totalEnergy + 1) : 0;
}

function detectReflectionPatterns(canvas: HTMLCanvasElement, faceBox?: { x: number; y: number; width: number; height: number }): number {
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;

  let sx = 0, sy = 0, sw = canvas.width, sh = canvas.height;
  if (faceBox) {
    sx = Math.max(0, Math.floor(faceBox.x));
    sy = Math.max(0, Math.floor(faceBox.y));
    sw = Math.min(canvas.width - sx, Math.ceil(faceBox.width));
    sh = Math.min(canvas.height - sy, Math.ceil(faceBox.height));
  }

  const imageData = ctx.getImageData(sx, sy, sw, sh);
  const data = imageData.data;
  const step = Math.max(1, Math.floor(data.length / 4 / 5000));

  let hotspots = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += step * 4) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (brightness > 240) hotspots++;
    count++;
  }

  return hotspots / (count + 1);
}

function captureFrameAsDataURL(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/jpeg", 0.5);
}

async function detectOnce(video: HTMLVideoElement) {
  const configs = [
    { inputSize: 512, scoreThreshold: 0.4 },
    { inputSize: 416, scoreThreshold: 0.35 },
    { inputSize: 320, scoreThreshold: 0.3 },
  ];
  for (const cfg of configs) {
    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions(cfg))
      .withFaceLandmarks(true)
      .withFaceDescriptor();
    if (detection) return detection;
  }
  return null;
}

async function captureFrameData(video: HTMLVideoElement, detection: any) {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const box = detection.detection.box;
  const faceBox = { x: box.x, y: box.y, width: box.width, height: box.height };

  const landmarks = detection.landmarks as faceapi.FaceLandmarks68;
  const positions = landmarks.positions;
  const noseTip = positions[30];
  const leftJaw = positions[0];
  const rightJaw = positions[16];
  const jawWidth = Math.abs(rightJaw.x - leftJaw.x);
  const noseRelX = (noseTip.x - leftJaw.x) / (jawWidth + 0.001);

  return {
    canvas,
    descriptor: detection.descriptor as Float32Array,
    eyes: analyzeEyeOpenness(landmarks),
    pose: getHeadPose(landmarks),
    mouthOpenness: getMouthOpenness(landmarks),
    position: { x: box.x + box.width / 2, y: box.y + box.height / 2, width: box.width, height: box.height },
    noseRelX,
    noseTipX: noseTip.x,
    noseTipY: noseTip.y,
    jawWidth,
    faceSize: box.width * box.height,
    texture: analyzeTextureVariance(canvas, faceBox),
    color: analyzeColorDistribution(canvas, faceBox),
    moire: detectScreenMoire(canvas, faceBox),
    reflection: detectReflectionPatterns(canvas, faceBox),
  };
}

async function waitForCondition(
  video: HTMLVideoElement,
  checkFn: (data: NonNullable<Awaited<ReturnType<typeof captureFrameData>>>) => boolean,
  timeoutMs: number,
  pollMs: number = 300,
  collectFrames?: NonNullable<Awaited<ReturnType<typeof captureFrameData>>>[],
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const det = await detectOnce(video);
    if (det) {
      const data = await captureFrameData(video, det);
      if (data) {
        collectFrames?.push(data);
        if (checkFn(data)) return true;
      }
    }
    await new Promise(r => setTimeout(r, pollMs));
  }
  return false;
}

export async function performLivenessCheck(
  video: HTMLVideoElement,
  onProgress?: (step: string, status: "checking" | "passed" | "failed") => void,
  onInstruction?: (instruction: string) => void,
  onFrameCapture?: (frameUrl: string, frameIndex: number) => void,
  onFaceUpdate?: (faceBox: { x: number; y: number; width: number; height: number }) => void
): Promise<LivenessResult> {
  await loadFaceModels();

  const result: LivenessResult = {
    isLive: false,
    checks: {
      faceDetected: false,
      textureAnalysis: false,
      screenDetection: false,
      motionDetected: false,
      eyeOpenness: false,
      blinkDetected: false,
      consistentDescriptor: false,
    },
    message: "",
    capturedFrames: [],
  };

  const allFrames: NonNullable<Awaited<ReturnType<typeof captureFrameData>>>[] = [];
  let frameCounter = 0;

  const captureThumb = (canvas: HTMLCanvasElement) => {
    const url = captureFrameAsDataURL(canvas);
    result.capturedFrames?.push(url);
    onFrameCapture?.(url, frameCounter++);
  };

  // ── STEP 1: Detect face (look straight) ──
  onProgress?.("faceDetected", "checking");
  onInstruction?.("Hold still and look at the camera");

  let baselineYaw = 0;
  let straightFrames: typeof allFrames = [];

  const faceFound = await waitForCondition(
    video,
    (data) => {
      straightFrames.push(data);
      onFaceUpdate?.(data.position);
      return straightFrames.length >= 5;
    },
    12000, 300, allFrames
  );

  if (!faceFound || straightFrames.length < 3) {
    result.message = "Could not detect your face. Please ensure your face is clearly visible and well-lit.";
    onProgress?.("faceDetected", "failed");
    return result;
  }

  baselineYaw = straightFrames.reduce((a, b) => a + b.pose.yaw, 0) / straightFrames.length;
  result.checks.faceDetected = true;
  onProgress?.("faceDetected", "passed");
  captureThumb(straightFrames[0].canvas);

  // ── STEP 2: Texture analysis (runs on collected frames) ──
  onProgress?.("textureAnalysis", "checking");
  await new Promise(r => setTimeout(r, 200));
  const textures = straightFrames.map(f => f.texture);
  const avgTexture = textures.reduce((a, b) => a + b, 0) / textures.length;
  console.log("[Liveness] Texture variance:", avgTexture);
  result.checks.textureAnalysis = avgTexture >= 50;
  onProgress?.("textureAnalysis", result.checks.textureAnalysis ? "passed" : "failed");
  if (!result.checks.textureAnalysis) {
    result.message = "Flat texture detected - this appears to be a photo or screen, not a real face.";
    return result;
  }

  // ── STEP 3: Screen detection (runs on collected frames) ──
  onProgress?.("screenDetection", "checking");
  await new Promise(r => setTimeout(r, 200));
  const avgMoire = straightFrames.reduce((a, b) => a + b.moire, 0) / straightFrames.length;
  const avgReflection = straightFrames.reduce((a, b) => a + b.reflection, 0) / straightFrames.length;
  const avgBlueRatio = straightFrames.reduce((a, b) => a + b.color.blueRatio, 0) / straightFrames.length;
  const avgSatVariance = straightFrames.reduce((a, b) => a + b.color.saturationVariance, 0) / straightFrames.length;
  const avgColorVariance = straightFrames.reduce((a, b) => a + b.color.colorVariance, 0) / straightFrames.length;
  const avgBrightnessUniformity = straightFrames.reduce((a, b) => a + b.color.brightnessUniformity, 0) / straightFrames.length;

  console.log("[Liveness] Screen analysis:", {
    moire: avgMoire.toFixed(4),
    reflection: avgReflection.toFixed(4),
    blueRatio: avgBlueRatio.toFixed(4),
    satVariance: avgSatVariance.toFixed(6),
    colorVariance: avgColorVariance.toFixed(2),
    brightnessUniformity: avgBrightnessUniformity.toFixed(2),
  });

  let screenScore = 0;
  if (avgMoire > 0.30) screenScore += 2;
  else if (avgMoire > 0.20) screenScore += 1;
  if (avgReflection > 0.10) screenScore += 1;
  if (avgBlueRatio > 0.22) screenScore += 2;
  else if (avgBlueRatio > 0.15) screenScore += 1;
  if (avgSatVariance < 0.0015) screenScore += 1;
  if (avgColorVariance < 120) screenScore += 1;
  if (avgBrightnessUniformity < 150) screenScore += 1;

  console.log("[Liveness] Screen score:", screenScore);

  if (screenScore >= 4) {
    result.checks.screenDetection = false;
    onProgress?.("screenDetection", "failed");
    result.message = "Screen or printed photo detected. Please use your real face.";
    return result;
  }
  result.checks.screenDetection = true;
  onProgress?.("screenDetection", "passed");

  // ── STEP 4: Eye openness check ──
  onProgress?.("eyeOpenness", "checking");
  await new Promise(r => setTimeout(r, 200));
  let eyesOpenCount = 0;
  for (const f of straightFrames) {
    if (f.eyes.leftOpen > 0.14 && f.eyes.rightOpen > 0.14) eyesOpenCount++;
  }
  result.checks.eyeOpenness = eyesOpenCount >= Math.max(1, Math.floor(straightFrames.length * 0.4));
  onProgress?.("eyeOpenness", result.checks.eyeOpenness ? "passed" : "failed");
  if (!result.checks.eyeOpenness) {
    result.message = "Eyes not detected properly. Please keep your eyes open and look at the camera.";
    return result;
  }

  // ── STEP 5: Blink + Motion detection (MediaPipe blendshapes + nose drift) ──
  onProgress?.("blinkDetected", "checking");
  onInstruction?.("Hold still… calibrating camera");
  await new Promise(r => setTimeout(r, 1200));
  onInstruction?.("Blink naturally once");

  let blinkDetected = false;
  let motionFound = false;

  const EYELID_CLOSE_THRESHOLD = 0.015;
  const EYELID_OPEN_THRESHOLD = 0.022;
  const BLINK_MIN_MS = 80;
  const BLINK_MAX_MS = 700;
  const MOTION_THRESHOLD = 0.009;
  const WARMUP_MS = 1200;

  if (mediapipeLandmarker) {
    let eyeState: "OPEN" | "CLOSED" = "OPEN";
    let blinkStartTime = 0;
    let blinkCount = 0;
    const blinkStart = Date.now();
    const blinkTimeout = 8000;
    const blinkPoll = 60;

    type NosePos = { x: number; y: number };
    let lastNose: NosePos | null = null;
    let lastVideoTime = -1;
    const warmupEnd = performance.now() + WARMUP_MS;

    let faceDropStart = 0;
    const FACE_DROP_TOLERANCE_MS = 200;

    console.log("[Blink] Starting landmark-based eyelid blink detection (warmup:", WARMUP_MS, "ms)");

    while (Date.now() - blinkStart < blinkTimeout) {
      const now = performance.now();
      const currentTime = video.currentTime;

      if (currentTime !== lastVideoTime) {
        lastVideoTime = currentTime;
        let mpResult;
        try {
          mpResult = mediapipeLandmarker.detectForVideo(video, now);
        } catch (e) {
          console.warn("[Blink] detectForVideo error:", e);
          await new Promise(r => setTimeout(r, blinkPoll));
          continue;
        }

        if (now < warmupEnd) {
          if (mpResult?.faceLandmarks && mpResult.faceLandmarks.length > 0) {
            const landmarks = mpResult.faceLandmarks[0];
            lastNose = { x: landmarks[1].x, y: landmarks[1].y };
          }
          await new Promise(r => setTimeout(r, blinkPoll));
          continue;
        }

        if (mpResult?.faceLandmarks && mpResult.faceLandmarks.length > 0) {
          faceDropStart = 0;
          const lm = mpResult.faceLandmarks[0];

          const leftEyelidDist = Math.abs(lm[159].y - lm[145].y);
          const rightEyelidDist = Math.abs(lm[386].y - lm[374].y);
          const avgEyelid = (leftEyelidDist + rightEyelidDist) / 2;

          if (avgEyelid < EYELID_CLOSE_THRESHOLD && eyeState === "OPEN") {
            eyeState = "CLOSED";
            blinkStartTime = now;
            console.log("[Blink] CLOSED, eyelid:", avgEyelid.toFixed(5));
          }

          if (avgEyelid > EYELID_OPEN_THRESHOLD && eyeState === "CLOSED") {
            const duration = now - blinkStartTime;
            console.log("[Blink] OPEN, duration:", duration.toFixed(0), "ms, eyelid:", avgEyelid.toFixed(5));

            if (duration >= BLINK_MIN_MS && duration <= BLINK_MAX_MS) {
              blinkCount++;
              console.log("[Blink] VALID BLINK #" + blinkCount + " (duration: " + duration.toFixed(0) + "ms)");
            }
            eyeState = "OPEN";
          }

          const nose = lm[1];
          if (lastNose && !motionFound) {
            const dx = Math.abs(nose.x - lastNose.x);
            const dy = Math.abs(nose.y - lastNose.y);
            const drift = dx + dy;
            if (drift > MOTION_THRESHOLD) {
              console.log("[MediaPipe] Motion detected, drift:", drift.toFixed(4));
              motionFound = true;
            }
          }
          lastNose = { x: nose.x, y: nose.y };

          if (blinkCount >= 1) { blinkDetected = true; break; }
        } else {
          if (eyeState === "CLOSED") {
            if (faceDropStart === 0) {
              faceDropStart = now;
            } else if (now - faceDropStart > FACE_DROP_TOLERANCE_MS) {
              eyeState = "OPEN";
              faceDropStart = 0;
            }
          }
        }
      }

      await new Promise(r => setTimeout(r, blinkPoll));
    }
  } else {
    console.warn("[MediaPipe] FaceLandmarker not available, falling back to face-api.js eye height");
    const baselineHeight = straightFrames.reduce((a, b) => a + (b.eyes.leftHeight + b.eyes.rightHeight) / 2, 0) / straightFrames.length;
    const HEIGHT_CLOSE = baselineHeight * 0.60;
    const HEIGHT_OPEN = baselineHeight * 0.80;

    let eyeState: "OPEN" | "CLOSED" = "OPEN";
    let blinkStartTime = 0;
    let blinkCount = 0;
    const blinkStart = Date.now();
    const warmupEnd = performance.now() + WARMUP_MS;

    while (Date.now() - blinkStart < 8000) {
      const det = await detectOnce(video);
      if (performance.now() < warmupEnd) {
        if (det) {
          const data = await captureFrameData(video, det);
          if (data) onFaceUpdate?.(data.position);
        }
        await new Promise(r => setTimeout(r, 80));
        continue;
      }
      if (det) {
        const data = await captureFrameData(video, det);
        if (data) {
          const eyeH = (data.eyes.leftHeight + data.eyes.rightHeight) / 2;
          const now = performance.now();
          if (eyeH < HEIGHT_CLOSE && eyeState === "OPEN") { eyeState = "CLOSED"; blinkStartTime = now; }
          if (eyeH > HEIGHT_OPEN && eyeState === "CLOSED") {
            const dur = now - blinkStartTime;
            if (dur >= BLINK_MIN_MS && dur <= BLINK_MAX_MS) blinkCount++;
            eyeState = "OPEN";
          }
          onFaceUpdate?.(data.position);
          if (blinkCount >= 1) { blinkDetected = true; break; }
        }
      }
      await new Promise(r => setTimeout(r, 80));
    }
  }

  result.checks.blinkDetected = blinkDetected;
  onProgress?.("blinkDetected", blinkDetected ? "passed" : "failed");
  if (blinkDetected) {
    onInstruction?.("Blink detected! Verifying motion...");
    await new Promise(r => setTimeout(r, 300));
  } else {
    onInstruction?.("Move your head slightly");
    await new Promise(r => setTimeout(r, 300));
  }

  // ── STEP 6: Motion check (MediaPipe nose drift or face-api fallback) ──
  onProgress?.("motionDetected", "checking");
  await new Promise(r => setTimeout(r, 200));
  if (!motionFound && allFrames.length >= 2) {
    for (let i = 1; i < allFrames.length; i++) {
      const prev = allFrames[i - 1];
      const curr = allFrames[i];
      const jaw = curr.jawWidth + 0.001;
      const dx = Math.abs(curr.noseTipX - prev.noseTipX) / jaw;
      const dy = Math.abs(curr.noseTipY - prev.noseTipY) / jaw;
      if (dx + dy > MOTION_THRESHOLD) {
        console.log("[Liveness] Motion detected (fallback) at frame", i);
        motionFound = true;
        break;
      }
    }
  }
  result.checks.motionDetected = motionFound;
  if (!motionFound) console.log("[Liveness] No significant motion detected");
  onProgress?.("motionDetected", result.checks.motionDetected ? "passed" : "failed");

  // ── STEP 7: Identity consistency ──
  onProgress?.("consistentDescriptor", "checking");
  await new Promise(r => setTimeout(r, 200));
  const descriptors = allFrames.map(f => f.descriptor);
  if (descriptors.length >= 3) {
    let consistentPairs = 0;
    let totalPairs = 0;
    for (let i = 0; i < descriptors.length; i++) {
      for (let j = i + 1; j < descriptors.length; j++) {
        const dist = euclideanDistanceFloat(descriptors[i], descriptors[j]);
        if (dist < 0.55) consistentPairs++;
        totalPairs++;
      }
    }
    const ratio = totalPairs > 0 ? consistentPairs / totalPairs : 0;
    console.log("[Liveness] Identity consistency:", ratio.toFixed(2), `(${consistentPairs}/${totalPairs})`);
    result.checks.consistentDescriptor = totalPairs > 0 && ratio > 0.55;
  } else {
    result.checks.consistentDescriptor = descriptors.length > 0;
  }
  onProgress?.("consistentDescriptor", result.checks.consistentDescriptor ? "passed" : "failed");

  if (!result.checks.consistentDescriptor) {
    result.message = "Face identity is not consistent. Please keep your face visible throughout and try again.";
    return result;
  }

  // ── Final gating ──
  // Core checks must always pass (anti-spoof)
  const coreChecks = [
    result.checks.faceDetected,
    result.checks.textureAnalysis,
    result.checks.screenDetection,
    result.checks.eyeOpenness,
    result.checks.consistentDescriptor,
  ];

  // Liveness: blink OR motion (either one proves it's a live person)
  const livenessOR = result.checks.blinkDetected || result.checks.motionDetected;

  const corePassed = coreChecks.every(c => c);
  result.isLive = corePassed && livenessOR;

  console.log("[Liveness] Final: core=" + corePassed + ", blink=" + blinkDetected + ", motion=" + motionFound + ", liveness(OR)=" + livenessOR);

  if (result.isLive) {
    onInstruction?.("All checks passed! Face verified.");
    result.message = "Liveness verified. Real face confirmed.";
  } else {
    const failed = [];
    if (!result.checks.screenDetection) failed.push("screen/photo detected");
    if (!result.checks.textureAnalysis) failed.push("flat texture");
    if (!livenessOR) failed.push("no blink or head movement detected — please blink once or move your head slightly");
    if (!result.checks.eyeOpenness) failed.push("eyes not properly detected");
    result.message = failed.length > 0
      ? `Liveness check failed: ${failed.join(". ")}. Please use your real face and follow instructions.`
      : "Liveness check failed. Please try again with your real face.";
  }

  return result;
}

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, v) => sum + (v - mean) * (v - mean), 0) / values.length;
}

function euclideanDistanceFloat(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export async function detectFaceDescriptor(
  input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement
): Promise<Float32Array | null> {
  await loadFaceModels();

  const inputSizes = [512, 416, 320];
  const scoreThresholds = [0.4, 0.3];

  for (const inputSize of inputSizes) {
    for (const scoreThreshold of scoreThresholds) {
      const detection = await faceapi
        .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold }))
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (detection) return detection.descriptor;
    }
  }

  return null;
}

export async function detectFaceDescriptorMultiFrame(
  video: HTMLVideoElement,
  frames: number = 5,
  delayMs: number = 250
): Promise<Float32Array | null> {
  await loadFaceModels();

  const descriptors: Float32Array[] = [];

  for (let i = 0; i < frames; i++) {
    if (i > 0) {
      await new Promise(r => setTimeout(r, delayMs));
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const descriptor = await detectFaceDescriptor(canvas);
    if (descriptor) {
      descriptors.push(descriptor);
    }
  }

  if (descriptors.length === 0) return null;

  if (descriptors.length === 1) return descriptors[0];

  const averaged = new Float32Array(descriptors[0].length);
  for (let i = 0; i < averaged.length; i++) {
    let sum = 0;
    for (const d of descriptors) {
      sum += d[i];
    }
    averaged[i] = sum / descriptors.length;
  }
  return averaged;
}

export function descriptorToArray(descriptor: Float32Array): number[] {
  return Array.from(descriptor);
}

export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export const FACE_MATCH_THRESHOLD = 0.6;
export const DUPLICATE_FACE_THRESHOLD = 0.45;

export function initLivenessSteps() {
  return [
    { key: "faceDetected" as const, label: "Face Detection", status: "pending" as const },
    { key: "textureAnalysis" as const, label: "Texture & Anti-Spoof", status: "pending" as const },
    { key: "screenDetection" as const, label: "Screen/Photo Detection", status: "pending" as const },
    { key: "eyeOpenness" as const, label: "Eye & Retina Scan", status: "pending" as const },
    { key: "blinkDetected" as const, label: "Blink Check", status: "pending" as const },
    { key: "motionDetected" as const, label: "Movement Check", status: "pending" as const },
    { key: "consistentDescriptor" as const, label: "Identity Consistency", status: "pending" as const },
  ];
}
