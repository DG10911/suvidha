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
    screenDetection: boolean;
    motionDetected: boolean;
    eyeOpenness: boolean;
    blinkDetected: boolean;
    headMovement: boolean;
    consistentDescriptor: boolean;
  };
  message: string;
  capturedFrames?: string[];
}

export type LivenessStepKey = keyof LivenessResult["checks"];

function analyzeEyeOpenness(landmarks: faceapi.FaceLandmarks68): { leftOpen: number; rightOpen: number } {
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

  return { leftOpen: leftEAR, rightOpen: rightEAR };
}

function getHeadPose(landmarks: faceapi.FaceLandmarks68): { yaw: number; pitch: number } {
  const positions = landmarks.positions;
  const noseTip = positions[30];
  const leftEye = positions[36];
  const rightEye = positions[45];
  const chin = positions[8];
  const foreheadApprox = positions[27];

  const eyeCenter = { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 };
  const eyeWidth = Math.abs(rightEye.x - leftEye.x);

  const noseDeviation = (noseTip.x - eyeCenter.x) / (eyeWidth + 0.001);
  const yaw = noseDeviation;

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

export async function performLivenessCheck(
  video: HTMLVideoElement,
  onProgress?: (step: string, status: "checking" | "passed" | "failed") => void,
  onInstruction?: (instruction: string) => void,
  onFrameCapture?: (frameUrl: string, frameIndex: number) => void
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
      headMovement: false,
      consistentDescriptor: false,
    },
    message: "",
    capturedFrames: [],
  };

  const descriptors: Float32Array[] = [];
  const eyeRatios: { left: number; right: number; frameIndex: number }[] = [];
  const facePositions: { x: number; y: number; width: number; height: number }[] = [];
  const headPoses: { yaw: number; pitch: number; frameIndex: number }[] = [];
  const textureScores: number[] = [];
  const colorAnalyses: ReturnType<typeof analyzeColorDistribution>[] = [];
  const moireScores: number[] = [];
  const reflectionScores: number[] = [];
  const faceSizes: number[] = [];

  const totalFrames = 12;
  const frameDelay = 400;

  const PHASE_STRAIGHT = { start: 0, end: 3 };
  const PHASE_TURN_RIGHT = { start: 4, end: 6 };
  const PHASE_TURN_LEFT = { start: 7, end: 9 };
  const PHASE_BLINK = { start: 10, end: 11 };

  onInstruction?.("Look straight at the camera");

  for (let i = 0; i < totalFrames; i++) {
    if (i > 0) {
      await new Promise(r => setTimeout(r, frameDelay));
    }

    if (i === PHASE_TURN_RIGHT.start) {
      onInstruction?.("Slowly turn your head to the right");
    } else if (i === PHASE_TURN_LEFT.start) {
      onInstruction?.("Now slowly turn your head to the left");
    } else if (i === PHASE_BLINK.start) {
      onInstruction?.("Blink your eyes naturally");
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
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.4 }))
      .withFaceLandmarks(true)
      .withFaceDescriptor();

    if (!detection) continue;

    descriptors.push(detection.descriptor);
    const eyes = analyzeEyeOpenness(detection.landmarks);
    eyeRatios.push({ left: eyes.leftOpen, right: eyes.rightOpen, frameIndex: i });
    const box = detection.detection.box;
    facePositions.push({ x: box.x + box.width / 2, y: box.y + box.height / 2, width: box.width, height: box.height });
    faceSizes.push(box.width * box.height);

    const pose = getHeadPose(detection.landmarks);
    headPoses.push({ ...pose, frameIndex: i });

    const faceBox = { x: box.x, y: box.y, width: box.width, height: box.height };
    textureScores.push(analyzeTextureVariance(canvas, faceBox));
    colorAnalyses.push(analyzeColorDistribution(canvas, faceBox));
    moireScores.push(detectScreenMoire(canvas, faceBox));
    reflectionScores.push(detectReflectionPatterns(canvas, faceBox));

    if (i % 3 === 0) {
      const frameUrl = captureFrameAsDataURL(canvas);
      result.capturedFrames?.push(frameUrl);
      onFrameCapture?.(frameUrl, i);
    }
  }

  if (descriptors.length < 5) {
    result.message = "Could not detect face consistently. Please ensure your face is clearly visible and well-lit.";
    onProgress?.("faceDetected", "failed");
    return result;
  }

  result.checks.faceDetected = true;
  onProgress?.("faceDetected", "passed");

  onProgress?.("textureAnalysis", "checking");
  await new Promise(r => setTimeout(r, 200));
  const avgTexture = textureScores.reduce((a, b) => a + b, 0) / textureScores.length;
  const textureVarianceAcrossFrames = calculateVariance(textureScores);

  const screenLikeTexture = avgTexture < 400 || textureVarianceAcrossFrames < 10;

  if (screenLikeTexture) {
    result.checks.textureAnalysis = false;
    onProgress?.("textureAnalysis", "failed");
    result.message = "Flat texture detected - this appears to be a photo or screen, not a real face.";
    return result;
  }
  result.checks.textureAnalysis = true;
  onProgress?.("textureAnalysis", "passed");

  onProgress?.("screenDetection", "checking");
  await new Promise(r => setTimeout(r, 200));

  const avgMoire = moireScores.reduce((a, b) => a + b, 0) / moireScores.length;
  const avgReflection = reflectionScores.reduce((a, b) => a + b, 0) / reflectionScores.length;
  const avgBlueRatio = colorAnalyses.reduce((a, b) => a + b.blueRatio, 0) / colorAnalyses.length;
  const avgSatVariance = colorAnalyses.reduce((a, b) => a + b.saturationVariance, 0) / colorAnalyses.length;
  const avgColorVariance = colorAnalyses.reduce((a, b) => a + b.colorVariance, 0) / colorAnalyses.length;
  const avgBrightnessUniformity = colorAnalyses.reduce((a, b) => a + b.brightnessUniformity, 0) / colorAnalyses.length;

  let screenScore = 0;
  if (avgMoire > 0.15) screenScore += 2;
  if (avgReflection > 0.05) screenScore += 1;
  if (avgBlueRatio > 0.15) screenScore += 2;
  if (avgSatVariance < 0.005) screenScore += 1;
  if (avgColorVariance < 300) screenScore += 1;
  if (avgBrightnessUniformity < 500) screenScore += 1;

  const sizeVariance = calculateVariance(faceSizes);
  const avgFaceSize = faceSizes.reduce((a, b) => a + b, 0) / faceSizes.length;
  const normalizedSizeVariance = sizeVariance / ((avgFaceSize * avgFaceSize) + 1);
  if (normalizedSizeVariance < 0.0001) screenScore += 1;

  if (screenScore >= 4) {
    result.checks.screenDetection = false;
    onProgress?.("screenDetection", "failed");
    result.message = "Screen or printed photo detected. Please use your real face.";
    return result;
  }
  result.checks.screenDetection = true;
  onProgress?.("screenDetection", "passed");

  onProgress?.("eyeOpenness", "checking");
  await new Promise(r => setTimeout(r, 200));
  let eyesOpenCount = 0;
  for (const ratio of eyeRatios) {
    if (ratio.left > 0.18 && ratio.right > 0.18) {
      eyesOpenCount++;
    }
  }
  result.checks.eyeOpenness = eyesOpenCount >= Math.floor(eyeRatios.length * 0.6);
  onProgress?.("eyeOpenness", result.checks.eyeOpenness ? "passed" : "failed");

  if (!result.checks.eyeOpenness) {
    result.message = "Eyes not detected properly. Please keep your eyes open and look at the camera.";
    return result;
  }

  onProgress?.("blinkDetected", "checking");
  await new Promise(r => setTimeout(r, 200));

  const earValues = eyeRatios.map(r => (r.left + r.right) / 2);
  let blinkTransitions = 0;
  const blinkThresholdLow = 0.17;
  const blinkThresholdHigh = 0.22;
  let wasOpen = earValues[0] > blinkThresholdHigh;

  for (let i = 1; i < earValues.length; i++) {
    const isOpen = earValues[i] > blinkThresholdHigh;
    const isClosed = earValues[i] < blinkThresholdLow;
    if (wasOpen && isClosed) {
      blinkTransitions++;
    }
    if (isOpen) wasOpen = true;
    if (isClosed) wasOpen = false;
  }

  const earVariance = calculateVariance(earValues);
  result.checks.blinkDetected = blinkTransitions >= 1 || earVariance > 0.001;
  onProgress?.("blinkDetected", result.checks.blinkDetected ? "passed" : "failed");

  onProgress?.("motionDetected", "checking");
  await new Promise(r => setTimeout(r, 200));
  if (facePositions.length >= 5) {
    let totalMotion = 0;
    for (let i = 1; i < facePositions.length; i++) {
      const dx = facePositions[i].x - facePositions[i - 1].x;
      const dy = facePositions[i].y - facePositions[i - 1].y;
      totalMotion += Math.sqrt(dx * dx + dy * dy);
    }
    const avgMotion = totalMotion / (facePositions.length - 1);
    result.checks.motionDetected = avgMotion > 1.5;
  }
  onProgress?.("motionDetected", result.checks.motionDetected ? "passed" : "failed");

  onProgress?.("headMovement", "checking");
  await new Promise(r => setTimeout(r, 200));

  const straightPoses = headPoses.filter(p => p.frameIndex >= PHASE_STRAIGHT.start && p.frameIndex <= PHASE_STRAIGHT.end);
  const rightPoses = headPoses.filter(p => p.frameIndex >= PHASE_TURN_RIGHT.start && p.frameIndex <= PHASE_TURN_RIGHT.end);
  const leftPoses = headPoses.filter(p => p.frameIndex >= PHASE_TURN_LEFT.start && p.frameIndex <= PHASE_TURN_LEFT.end);

  let headMovementDetected = false;

  if (straightPoses.length > 0 && rightPoses.length > 0 && leftPoses.length > 0) {
    const straightAvgYaw = straightPoses.reduce((a, b) => a + b.yaw, 0) / straightPoses.length;
    const rightAvgYaw = rightPoses.reduce((a, b) => a + b.yaw, 0) / rightPoses.length;
    const leftAvgYaw = leftPoses.reduce((a, b) => a + b.yaw, 0) / leftPoses.length;

    const rightDelta = rightAvgYaw - straightAvgYaw;
    const leftDelta = leftAvgYaw - straightAvgYaw;

    const hasRightTurn = Math.abs(rightDelta) > 0.03;
    const hasLeftTurn = Math.abs(leftDelta) > 0.03;
    const directionsDiffer = (rightDelta > 0 && leftDelta < 0) || (rightDelta < 0 && leftDelta > 0);

    headMovementDetected = (hasRightTurn && hasLeftTurn && directionsDiffer);
  }

  if (!headMovementDetected && headPoses.length >= 5) {
    const yaws = headPoses.map(p => p.yaw);
    const yawRange = Math.max(...yaws) - Math.min(...yaws);
    headMovementDetected = yawRange > 0.1;
  }

  result.checks.headMovement = headMovementDetected;
  onProgress?.("headMovement", result.checks.headMovement ? "passed" : "failed");

  onProgress?.("consistentDescriptor", "checking");
  await new Promise(r => setTimeout(r, 200));
  if (descriptors.length >= 3) {
    let consistentPairs = 0;
    let totalPairs = 0;
    for (let i = 0; i < descriptors.length; i++) {
      for (let j = i + 1; j < descriptors.length; j++) {
        const dist = euclideanDistanceFloat(descriptors[i], descriptors[j]);
        if (dist < 0.45) consistentPairs++;
        totalPairs++;
      }
    }
    result.checks.consistentDescriptor = totalPairs > 0 && (consistentPairs / totalPairs) > 0.7;
  }
  onProgress?.("consistentDescriptor", result.checks.consistentDescriptor ? "passed" : "failed");

  if (!result.checks.consistentDescriptor) {
    result.message = "Face identity is not consistent across frames. Please keep still and try again.";
    return result;
  }

  const criticalChecks = [
    result.checks.faceDetected,
    result.checks.textureAnalysis,
    result.checks.screenDetection,
    result.checks.eyeOpenness,
    result.checks.consistentDescriptor,
    result.checks.headMovement,
  ];

  const softChecks = [
    result.checks.blinkDetected,
    result.checks.motionDetected,
  ];

  const criticalPassed = criticalChecks.every(c => c);
  const softPassed = softChecks.filter(c => c).length >= 1;

  result.isLive = criticalPassed && softPassed;

  if (result.isLive) {
    result.message = "Liveness verified. Real face confirmed.";
  } else {
    const failed = [];
    if (!result.checks.screenDetection) failed.push("screen/photo detected");
    if (!result.checks.textureAnalysis) failed.push("flat texture");
    if (!result.checks.headMovement) failed.push("head movement not detected - turn your head left and right");
    if (!result.checks.blinkDetected && !result.checks.motionDetected) failed.push("no blink or motion detected");
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
    { key: "blinkDetected" as const, label: "Blink Detection", status: "pending" as const },
    { key: "motionDetected" as const, label: "Motion Analysis", status: "pending" as const },
    { key: "headMovement" as const, label: "Head Movement Check", status: "pending" as const },
    { key: "consistentDescriptor" as const, label: "Identity Consistency", status: "pending" as const },
  ];
}
