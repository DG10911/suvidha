import * as faceapi from "face-api.js";

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const MODEL_URL = "/models";
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
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
    motionDetected: boolean;
    eyeOpenness: boolean;
    blinkDetected: boolean;
    consistentDescriptor: boolean;
  };
  message: string;
}

function analyzeEyeOpenness(landmarks: faceapi.FaceLandmarks68): { leftOpen: number; rightOpen: number } {
  const positions = landmarks.positions;

  const leftEyeTop = positions[37].y;
  const leftEyeBottom = positions[41].y;
  const leftEyeLeft = positions[36].x;
  const leftEyeRight = positions[39].x;
  const leftEyeHeight = Math.abs(leftEyeBottom - leftEyeTop);
  const leftEyeWidth = Math.abs(leftEyeRight - leftEyeLeft);
  const leftEAR = leftEyeHeight / (leftEyeWidth + 0.001);

  const rightEyeTop = positions[43].y;
  const rightEyeBottom = positions[47].y;
  const rightEyeLeft = positions[42].x;
  const rightEyeRight = positions[45].x;
  const rightEyeHeight = Math.abs(rightEyeBottom - rightEyeTop);
  const rightEyeWidth = Math.abs(rightEyeRight - rightEyeLeft);
  const rightEAR = rightEyeHeight / (rightEyeWidth + 0.001);

  return { leftOpen: leftEAR, rightOpen: rightEAR };
}

function analyzeTextureVariance(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const sampleSize = Math.min(data.length / 4, 10000);
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

function analyzeLaplacianSharpness(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;

  const w = Math.min(canvas.width, 200);
  const h = Math.min(canvas.height, 200);

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = w;
  tempCanvas.height = h;
  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) return 0;
  tempCtx.drawImage(canvas, 0, 0, w, h);

  const imageData = tempCtx.getImageData(0, 0, w, h);
  const data = imageData.data;

  const gray: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    gray.push(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
  }

  let laplacianSum = 0;
  let count = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const lap = gray[idx - w] + gray[idx + w] + gray[idx - 1] + gray[idx + 1] - 4 * gray[idx];
      laplacianSum += lap * lap;
      count++;
    }
  }

  return count > 0 ? laplacianSum / count : 0;
}

export async function performLivenessCheck(
  video: HTMLVideoElement,
  onProgress?: (step: string, status: "checking" | "passed" | "failed") => void
): Promise<LivenessResult> {
  await loadFaceModels();

  const result: LivenessResult = {
    isLive: false,
    checks: {
      faceDetected: false,
      textureAnalysis: false,
      motionDetected: false,
      eyeOpenness: false,
      blinkDetected: false,
      consistentDescriptor: false,
    },
    message: "",
  };

  const descriptors: Float32Array[] = [];
  const eyeRatios: { left: number; right: number }[] = [];
  const facePositions: { x: number; y: number }[] = [];
  const textureScores: number[] = [];
  const sharpnessScores: number[] = [];

  const totalFrames = 8;
  const frameDelay = 350;

  for (let i = 0; i < totalFrames; i++) {
    if (i > 0) {
      await new Promise(r => setTimeout(r, frameDelay));
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (i === 0) {
      onProgress?.("faceDetected", "checking");
    }

    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.3 }))
      .withFaceLandmarks(true)
      .withFaceDescriptor();

    if (!detection) {
      const fallback = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.2 }))
        .withFaceLandmarks(true)
        .withFaceDescriptor();
      if (!fallback) continue;
      
      descriptors.push(fallback.descriptor);
      const eyes = analyzeEyeOpenness(fallback.landmarks);
      eyeRatios.push({ left: eyes.leftOpen, right: eyes.rightOpen });
      const box = fallback.detection.box;
      facePositions.push({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
    } else {
      descriptors.push(detection.descriptor);
      const eyes = analyzeEyeOpenness(detection.landmarks);
      eyeRatios.push({ left: eyes.leftOpen, right: eyes.rightOpen });
      const box = detection.detection.box;
      facePositions.push({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
    }

    textureScores.push(analyzeTextureVariance(canvas));
    sharpnessScores.push(analyzeLaplacianSharpness(canvas));
  }

  if (descriptors.length < 3) {
    result.message = "Could not detect face consistently. Please ensure your face is clearly visible.";
    return result;
  }

  result.checks.faceDetected = true;
  onProgress?.("faceDetected", "passed");

  onProgress?.("textureAnalysis", "checking");
  const avgTexture = textureScores.reduce((a, b) => a + b, 0) / textureScores.length;
  const avgSharpness = sharpnessScores.reduce((a, b) => a + b, 0) / sharpnessScores.length;

  const isPhotoTexture = avgTexture < 200;
  const isScreenTexture = avgSharpness < 5;

  if (isPhotoTexture || isScreenTexture) {
    result.checks.textureAnalysis = false;
    onProgress?.("textureAnalysis", "failed");
    result.message = "Fake face detected. Please use your real face, not a photo or screen.";
    return result;
  }
  result.checks.textureAnalysis = true;
  onProgress?.("textureAnalysis", "passed");

  onProgress?.("eyeOpenness", "checking");
  await new Promise(r => setTimeout(r, 300));
  let eyesOpenCount = 0;
  for (const ratio of eyeRatios) {
    if (ratio.left > 0.15 && ratio.right > 0.15) {
      eyesOpenCount++;
    }
  }
  result.checks.eyeOpenness = eyesOpenCount >= Math.floor(eyeRatios.length * 0.5);
  onProgress?.("eyeOpenness", result.checks.eyeOpenness ? "passed" : "failed");

  if (!result.checks.eyeOpenness) {
    result.message = "Eyes not detected properly. Please keep your eyes open and look at the camera.";
    return result;
  }

  onProgress?.("blinkDetected", "checking");
  await new Promise(r => setTimeout(r, 300));
  let hasLowEAR = false;
  let hasHighEAR = false;
  for (const ratio of eyeRatios) {
    const avgEAR = (ratio.left + ratio.right) / 2;
    if (avgEAR < 0.18) hasLowEAR = true;
    if (avgEAR > 0.22) hasHighEAR = true;
  }
  result.checks.blinkDetected = hasLowEAR || hasHighEAR;
  if (!result.checks.blinkDetected && eyeRatios.length >= 4) {
    const earValues = eyeRatios.map(r => (r.left + r.right) / 2);
    const earVariance = calculateVariance(earValues);
    result.checks.blinkDetected = earVariance > 0.0001;
  }
  onProgress?.("blinkDetected", result.checks.blinkDetected ? "passed" : "failed");

  onProgress?.("motionDetected", "checking");
  await new Promise(r => setTimeout(r, 300));
  if (facePositions.length >= 3) {
    let totalMotion = 0;
    for (let i = 1; i < facePositions.length; i++) {
      const dx = facePositions[i].x - facePositions[i - 1].x;
      const dy = facePositions[i].y - facePositions[i - 1].y;
      totalMotion += Math.sqrt(dx * dx + dy * dy);
    }
    const avgMotion = totalMotion / (facePositions.length - 1);
    result.checks.motionDetected = avgMotion > 0.3;
  }
  onProgress?.("motionDetected", result.checks.motionDetected ? "passed" : "failed");

  onProgress?.("consistentDescriptor", "checking");
  await new Promise(r => setTimeout(r, 300));
  if (descriptors.length >= 2) {
    let consistentPairs = 0;
    let totalPairs = 0;
    for (let i = 0; i < descriptors.length; i++) {
      for (let j = i + 1; j < descriptors.length; j++) {
        const dist = euclideanDistanceFloat(descriptors[i], descriptors[j]);
        if (dist < 0.5) consistentPairs++;
        totalPairs++;
      }
    }
    result.checks.consistentDescriptor = consistentPairs / totalPairs > 0.6;
  }
  onProgress?.("consistentDescriptor", result.checks.consistentDescriptor ? "passed" : "failed");

  if (!result.checks.consistentDescriptor) {
    result.message = "Face identity is not consistent across frames. Please keep still and try again.";
    return result;
  }

  const passedChecks = Object.values(result.checks).filter(v => v).length;
  const totalChecks = Object.keys(result.checks).length;

  result.isLive = passedChecks >= totalChecks - 1;

  if (result.isLive) {
    result.message = "Liveness verified. Real face detected.";
  } else {
    result.message = "Liveness check failed. This may be a photo or screen. Please try with your real face.";
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
  const scoreThresholds = [0.3, 0.2];

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
  frames: number = 3,
  delayMs: number = 300
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
