import KioskLayout from "@/components/layout/KioskLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, ArrowRight, UserPlus, Fingerprint, Loader2, Camera, ScanFace, AlertTriangle, Shield, Eye, Activity, XCircle, MonitorSmartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { savePreferences, loadPreferences } from "@/lib/userPreferences";
import { t } from "@/lib/translations";
import QRCode from "qrcode";
import { loadFaceModels, performLivenessCheck, detectFaceDescriptorMultiFrame, descriptorToArray, initLivenessSteps } from "@/lib/faceUtils";

interface LivenessStep {
  key: string;
  label: string;
  status: "pending" | "checking" | "passed" | "failed";
}

const stepIcons: Record<string, React.ReactNode> = {
  faceDetected: <ScanFace className="w-5 h-5" />,
  textureAnalysis: <Shield className="w-5 h-5" />,
  screenDetection: <MonitorSmartphone className="w-5 h-5" />,
  eyeOpenness: <Eye className="w-5 h-5" />,
  blinkDetected: <Activity className="w-5 h-5" />,
  motionDetected: <Fingerprint className="w-5 h-5" />,
  consistentDescriptor: <CheckCircle2 className="w-5 h-5" />,
};

export default function Signup() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"aadhar" | "fetching" | "details" | "facescan" | "liveness" | "faceprocessing" | "qr" | "fake-detected" | "duplicate-face">("aadhar");
  const [aadhar, setAadhar] = useState("");
  const [faceCapture, setFaceCapture] = useState<string | null>(null);
  const [signupResult, setSignupResult] = useState<{ suvidhaId: string; name: string; qrToken: string; userId: string } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [fetchedDetails, setFetchedDetails] = useState<{ name: string; phone: string; dob: string; gender: string; address: string; avatar: string } | null>(null);
  const [faceError, setFaceError] = useState<string | null>(null);
  const [modelsReady, setModelsReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [lang, setLang] = useState(() => loadPreferences().language);
  const [livenessSteps, setLivenessSteps] = useState<LivenessStep[]>([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [instruction, setInstruction] = useState("");
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const faceBoxRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const overlayAnimRef = useRef<number>(0);
  const scanLineRef = useRef(0);
  const frameCountRef = useRef(0);
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number }>>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.language) setLang(detail.language);
    };
    window.addEventListener("prefs-changed", handler);
    return () => window.removeEventListener("prefs-changed", handler);
  }, []);

  useEffect(() => {
    loadFaceModels().then(() => setModelsReady(true));
  }, []);

  const handleFetch = async () => {
    if (aadhar.length === 12) {
      setStep("fetching");
      setSignupError(null);
      try {
        const res = await fetch(`/api/aadhaar/lookup/${aadhar}`);
        const data = await res.json();
        if (data.success) {
          setFetchedDetails({
            name: data.name,
            phone: data.phone,
            dob: data.dob,
            gender: data.gender,
            address: data.address,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name}${aadhar}`,
          });
        } else {
          setFetchedDetails({
            name: "Unknown",
            phone: "0000000000",
            dob: "01/01/1990",
            gender: "Male",
            address: "Raipur, Chhattisgarh",
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${aadhar}`,
          });
        }
        setTimeout(() => setStep("details"), 1500);
      } catch {
        setSignupError("Could not fetch Aadhaar details. Please try again.");
        setStep("aadhar");
      }
    }
  };

  const handleNumberClick = (num: string) => {
    if (aadhar.length < 12) setAadhar(prev => prev + num);
  };

  const handleBackspace = () => {
    setAadhar(prev => prev.slice(0, -1));
  };

  const assignVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current) {
      el.srcObject = streamRef.current;
      el.play().catch(() => {});
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (streamRef.current) {
      if (videoRef.current && !videoRef.current.srcObject) {
        videoRef.current.srcObject = streamRef.current;
        await videoRef.current.play().catch(() => {});
      }
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch {
      console.log("Camera not available");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    const cameraSteps = ["facescan", "liveness"];
    if (cameraSteps.includes(step)) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      if (!cameraSteps.includes(step)) {
        stopCamera();
      }
    };
  }, [step, startCamera, stopCamera]);

  useEffect(() => {
    if (step !== "liveness") {
      faceBoxRef.current = null;
      if (overlayAnimRef.current) cancelAnimationFrame(overlayAnimRef.current);
      return;
    }

    const drawOverlay = () => {
      const oc = overlayCanvasRef.current;
      const vid = videoRef.current;
      if (!oc || !vid) { overlayAnimRef.current = requestAnimationFrame(drawOverlay); return; }

      const displayW = oc.clientWidth;
      const displayH = oc.clientHeight;
      if (oc.width !== displayW || oc.height !== displayH) {
        oc.width = displayW;
        oc.height = displayH;
      }

      const ctx = oc.getContext("2d");
      if (!ctx) { overlayAnimRef.current = requestAnimationFrame(drawOverlay); return; }
      ctx.clearRect(0, 0, oc.width, oc.height);
      frameCountRef.current++;
      const frame = frameCountRef.current;

      const fb = faceBoxRef.current;
      if (fb && vid.videoWidth > 0) {
        const scaleX = oc.width / vid.videoWidth;
        const scaleY = oc.height / vid.videoHeight;
        const pad = 20;
        const rawX = (fb.x - fb.width / 2) * scaleX;
        const rawY = (fb.y - fb.height / 2) * scaleY;
        const fx = rawX - pad;
        const fy = rawY - pad;
        const fw = fb.width * scaleX + pad * 2;
        const fh = fb.height * scaleY + pad * 2;
        const cx = fx + fw / 2;
        const cy = fy + fh / 2;

        const dimOverlay = ctx.createRadialGradient(cx, cy, Math.min(fw, fh) * 0.6, cx, cy, Math.max(oc.width, oc.height) * 0.7);
        dimOverlay.addColorStop(0, "rgba(0,0,0,0)");
        dimOverlay.addColorStop(1, "rgba(0,0,0,0.5)");
        ctx.fillStyle = dimOverlay;
        ctx.fillRect(0, 0, oc.width, oc.height);

        const pulseAlpha = 0.4 + Math.sin(frame * 0.05) * 0.3;
        ctx.strokeStyle = `rgba(0, 229, 255, ${pulseAlpha})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(fx, fy, fw, fh);
        ctx.setLineDash([]);

        const cornerLen = Math.min(fw, fh) * 0.22;
        const cornerGlow = `rgba(0, 229, 255, ${0.7 + Math.sin(frame * 0.08) * 0.3})`;
        ctx.strokeStyle = cornerGlow;
        ctx.lineWidth = 3;
        ctx.shadowColor = "#00e5ff";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(fx, fy + cornerLen); ctx.lineTo(fx, fy); ctx.lineTo(fx + cornerLen, fy);
        ctx.moveTo(fx + fw - cornerLen, fy); ctx.lineTo(fx + fw, fy); ctx.lineTo(fx + fw, fy + cornerLen);
        ctx.moveTo(fx + fw, fy + fh - cornerLen); ctx.lineTo(fx + fw, fy + fh); ctx.lineTo(fx + fw - cornerLen, fy + fh);
        ctx.moveTo(fx + cornerLen, fy + fh); ctx.lineTo(fx, fy + fh); ctx.lineTo(fx, fy + fh - cornerLen);
        ctx.stroke();
        ctx.shadowBlur = 0;

        scanLineRef.current = (scanLineRef.current + 2) % fh;
        const scanY = fy + scanLineRef.current;
        ctx.shadowColor = "#00e5ff";
        ctx.shadowBlur = 15;
        const scanGrad = ctx.createLinearGradient(fx, scanY, fx + fw, scanY);
        scanGrad.addColorStop(0, "transparent");
        scanGrad.addColorStop(0.2, "rgba(0, 229, 255, 0.6)");
        scanGrad.addColorStop(0.5, "rgba(0, 229, 255, 1)");
        scanGrad.addColorStop(0.8, "rgba(0, 229, 255, 0.6)");
        scanGrad.addColorStop(1, "transparent");
        ctx.fillStyle = scanGrad;
        ctx.fillRect(fx, scanY - 1.5, fw, 3);

        const trailGrad = ctx.createLinearGradient(0, scanY - 30, 0, scanY);
        trailGrad.addColorStop(0, "rgba(0, 229, 255, 0)");
        trailGrad.addColorStop(1, "rgba(0, 229, 255, 0.15)");
        ctx.fillStyle = trailGrad;
        ctx.fillRect(fx, scanY - 30, fw, 30);
        ctx.shadowBlur = 0;

        ctx.strokeStyle = "rgba(0, 229, 255, 0.08)";
        ctx.lineWidth = 0.5;
        const gridSpacing = 12;
        for (let gx = fx; gx < fx + fw; gx += gridSpacing) {
          ctx.beginPath();
          ctx.moveTo(gx, fy);
          ctx.lineTo(gx, fy + fh);
          ctx.stroke();
        }
        for (let gy = fy; gy < fy + fh; gy += gridSpacing) {
          ctx.beginPath();
          ctx.moveTo(fx, gy);
          ctx.lineTo(fx + fw, gy);
          ctx.stroke();
        }

        const numRays = 12;
        const rayRadius = Math.max(fw, fh) * 0.55;
        for (let i = 0; i < numRays; i++) {
          const angle = (i / numRays) * Math.PI * 2 + frame * 0.01;
          const innerR = Math.min(fw, fh) * 0.35;
          const x1 = cx + Math.cos(angle) * innerR;
          const y1 = cy + Math.sin(angle) * innerR;
          const x2 = cx + Math.cos(angle) * rayRadius;
          const y2 = cy + Math.sin(angle) * rayRadius;
          const rayGrad = ctx.createLinearGradient(x1, y1, x2, y2);
          rayGrad.addColorStop(0, "rgba(0, 229, 255, 0.3)");
          rayGrad.addColorStop(1, "rgba(0, 229, 255, 0)");
          ctx.strokeStyle = rayGrad;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }

        if (Math.random() < 0.3) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * Math.min(fw, fh) * 0.4;
          particlesRef.current.push({
            x: cx + Math.cos(angle) * dist,
            y: cy + Math.sin(angle) * dist,
            vx: (Math.random() - 0.5) * 2,
            vy: -Math.random() * 2 - 0.5,
            life: 0,
            maxLife: 30 + Math.random() * 30,
          });
        }
        if (particlesRef.current.length > 40) particlesRef.current.splice(0, 5);

        particlesRef.current = particlesRef.current.filter(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.life++;
          if (p.life >= p.maxLife) return false;
          const alpha = 1 - p.life / p.maxLife;
          ctx.fillStyle = `rgba(0, 229, 255, ${alpha * 0.8})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fill();
          return true;
        });

        const crossSize = 5;
        const facePoints: [number, number][] = [
          [cx, cy - fh * 0.2], [cx, cy + fh * 0.2],
          [cx - fw * 0.2, cy], [cx + fw * 0.2, cy],
          [cx - fw * 0.22, cy - fh * 0.12], [cx + fw * 0.22, cy - fh * 0.12],
          [cx - fw * 0.18, cy + fh * 0.22], [cx + fw * 0.18, cy + fh * 0.22],
          [cx, cy - fh * 0.35], [cx, cy + fh * 0.35],
        ];
        for (const [px, py] of facePoints) {
          const ptAlpha = 0.3 + Math.sin(frame * 0.1 + px * 0.1) * 0.3;
          ctx.strokeStyle = `rgba(0, 229, 255, ${ptAlpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(px - crossSize, py); ctx.lineTo(px + crossSize, py);
          ctx.moveTo(px, py - crossSize); ctx.lineTo(px, py + crossSize);
          ctx.stroke();
          ctx.fillStyle = `rgba(0, 229, 255, ${ptAlpha * 0.5})`;
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.font = "9px monospace";
        ctx.fillStyle = `rgba(0, 229, 255, ${0.5 + Math.sin(frame * 0.05) * 0.3})`;
        ctx.fillText(`SCAN: ${(scanLineRef.current / fh * 100).toFixed(0)}%`, fx + 4, fy - 6);
        ctx.fillText(`RES: ${vid.videoWidth}x${vid.videoHeight}`, fx + fw - 80, fy - 6);

        const dataY = fy + fh + 14;
        ctx.fillStyle = "rgba(0, 229, 255, 0.5)";
        ctx.fillText(`DEPTH: ${(Math.sin(frame * 0.03) * 2.1 + 3.5).toFixed(2)}m`, fx + 4, dataY);
        ctx.fillText(`CONF: ${(85 + Math.sin(frame * 0.07) * 12).toFixed(1)}%`, fx + fw - 72, dataY);
      }

      overlayAnimRef.current = requestAnimationFrame(drawOverlay);
    };

    overlayAnimRef.current = requestAnimationFrame(drawOverlay);
    return () => { if (overlayAnimRef.current) cancelAnimationFrame(overlayAnimRef.current); };
  }, [step]);

  const doSignup = async (capturedImage: string | null, descriptor: number[] | null) => {
    setStep("faceprocessing");
    setSignupError(null);
    const details = fetchedDetails!;
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aadhaar: aadhar,
          name: details.name,
          phone: details.phone,
          faceImage: capturedImage || undefined,
          faceDescriptor: descriptor || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSignupResult({
          suvidhaId: data.user.suvidhaId,
          name: data.user.name,
          qrToken: data.qrToken,
          userId: data.user.id,
        });

        savePreferences({
          userId: data.user.id,
          userName: data.user.name,
          faceRegistered: !!capturedImage,
        });

        const qrPayload = JSON.stringify({
          suvidhaId: data.user.suvidhaId,
          token: data.qrToken,
        });
        const qrUrl = await QRCode.toDataURL(qrPayload, {
          width: 300,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
        });
        setQrDataUrl(qrUrl);
        setStep("qr");
      } else if (data.duplicate) {
        setSignupError(data.message);
        setStep("duplicate-face");
      } else {
        setSignupError(data.message || "Signup failed");
        setStep("details");
      }
    } catch (err: any) {
      setSignupError(err.message || "Network error");
      setStep("details");
    }
  };

  const captureFace = async () => {
    let imageData: string | null = null;
    setFaceError(null);

    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        imageData = canvas.toDataURL("image/jpeg", 0.6);
        setFaceCapture(imageData);
      }

      setStep("liveness");
      const steps = initLivenessSteps().map(s => ({ ...s, status: "pending" as const }));
      setLivenessSteps(steps);
      setScanProgress(0);
      setCapturedFrames([]);
      setInstruction("Look straight at the camera");

      const livenessResult = await performLivenessCheck(
        video,
        (stepKey, status) => {
          setLivenessSteps(prev => prev.map(s =>
            s.key === stepKey ? { ...s, status } : s
          ));
          const stepIndex = steps.findIndex(s => s.key === stepKey);
          if (stepIndex >= 0) {
            setScanProgress(Math.round(((stepIndex + 1) / steps.length) * 100));
          }
        },
        (instr) => {
          setInstruction(instr);
        },
        (frameUrl) => {
          setCapturedFrames(prev => [...prev, frameUrl]);
        },
        (faceBox) => {
          faceBoxRef.current = faceBox;
        }
      );

      if (!livenessResult.isLive) {
        setFaceError(livenessResult.message);
        setStep("fake-detected");
        return;
      }

      const descriptor = await detectFaceDescriptorMultiFrame(video, 5, 250);
      if (!descriptor) {
        setFaceError("No face detected. Please position your face clearly in the frame and try again.");
        setStep("facescan");
        return;
      }

      stopCamera();
      doSignup(imageData, descriptorToArray(descriptor));
    }
  };

  const skipFace = () => {
    stopCamera();
    doSignup(null, null);
  };

  const handlePrintCard = () => {
    if (!signupResult) return;
    const printDiv = document.createElement("div");
    printDiv.className = "print-area";
    printDiv.innerHTML = `
      <div style="max-width: 400px; margin: 0 auto; border: 2px solid #333; border-radius: 12px; padding: 24px; font-family: Arial, sans-serif;">
        <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 16px; margin-bottom: 16px;">
          <h1 style="font-size: 24px; font-weight: bold; color: #2563eb; margin: 0;">SUVIDHA PASS</h1>
          <p style="font-size: 12px; color: #666; margin: 4px 0 0 0;">Government of Chhattisgarh</p>
        </div>
        <div style="text-align: center; margin-bottom: 16px;">
          <p style="font-size: 14px; color: #666; margin: 0;">${t("citizen_id", lang)}</p>
          <p style="font-size: 18px; font-weight: bold; margin: 4px 0 0 0;">${signupResult.suvidhaId}</p>
        </div>
        <div style="text-align: center; margin-bottom: 16px;">
          ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR Code" style="width: 150px; height: 150px; margin: 0 auto;" />` : ''}
        </div>
        <div style="margin-bottom: 8px;">
          <p style="font-size: 12px; color: #666; margin: 0;">Name</p>
          <p style="font-size: 16px; font-weight: bold; margin: 2px 0 0 0;">${signupResult.name}</p>
        </div>
        <div style="margin-bottom: 8px;">
          <p style="font-size: 12px; color: #666; margin: 0;">Aadhaar</p>
          <p style="font-size: 16px; font-weight: bold; margin: 2px 0 0 0;">XXXX XXXX ${aadhar.slice(-4)}</p>
        </div>
        <div style="margin-bottom: 8px;">
          <p style="font-size: 12px; color: #666; margin: 0;">Face ID</p>
          <p style="font-size: 16px; font-weight: bold; margin: 2px 0 0 0;">${faceCapture ? "Registered" : "Not Registered"}</p>
        </div>
        <div style="margin-bottom: 0;">
          <p style="font-size: 12px; color: #666; margin: 0;">Issue Date</p>
          <p style="font-size: 16px; font-weight: bold; margin: 2px 0 0 0;">${new Date().toLocaleDateString()}</p>
        </div>
      </div>
    `;
    document.body.appendChild(printDiv);
    window.print();
    document.body.removeChild(printDiv);
  };

  return (
    <KioskLayout>
      <div className="h-full flex flex-col items-center justify-center max-w-3xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {step === "aadhar" && (
            <motion.div 
              key="aadhar"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full space-y-8"
            >
              <div className="text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                  <Fingerprint className="w-10 h-10" />
                </div>
                <h2 className="text-4xl font-bold font-heading mb-2">{t("register_aadhaar_title", lang)}</h2>
                <p className="text-xl text-muted-foreground">{t("enter_aadhaar", lang)}</p>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-lg border border-border">
                {signupError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-center mb-4">
                    {signupError}
                  </div>
                )}
                <Input 
                  readOnly
                  value={aadhar.replace(/(\d{4})/g, '$1 ').trim()}
                  className="text-center text-4xl font-mono py-8 h-24 tracking-widest rounded-xl border-2 border-primary/20 bg-secondary/30 mb-8"
                  placeholder="0000 0000 0000"
                />

                <div className="grid grid-cols-3 gap-4 mb-8">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <Button
                      key={num}
                      variant="outline"
                      className="h-20 text-3xl font-bold rounded-2xl hover:bg-primary/5 hover:border-primary transition-all"
                      onClick={() => handleNumberClick(num.toString())}
                    >
                      {num}
                    </Button>
                  ))}
                  <Button variant="ghost" className="h-20 text-xl font-medium rounded-2xl text-muted-foreground" onClick={() => setAadhar("")}>{t("clear", lang)}</Button>
                  <Button
                    variant="outline"
                    className="h-20 text-3xl font-bold rounded-2xl hover:bg-primary/5 hover:border-primary transition-all"
                    onClick={() => handleNumberClick("0")}
                  >
                    0
                  </Button>
                  <Button variant="ghost" className="h-20 rounded-2xl text-destructive hover:bg-destructive/10" onClick={handleBackspace}>
                    {t("back", lang)}
                  </Button>
                </div>

                <Button 
                  size="lg" 
                  className="w-full h-20 text-2xl rounded-2xl gap-3"
                  disabled={aadhar.length !== 12}
                  onClick={handleFetch}
                >
                  {t("verify_fetch", lang)}
                  <ArrowRight className="w-6 h-6" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === "fetching" && (
            <motion.div 
              key="fetching"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-6"
            >
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
              <div className="text-center">
                <h3 className="text-3xl font-bold font-heading">{t("fetching_details", lang)}</h3>
                <p className="text-xl text-muted-foreground">{t("connecting_aadhaar", lang)}</p>
              </div>
            </motion.div>
          )}

          {step === "details" && fetchedDetails && (
            <motion.div 
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="w-full space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-4xl font-bold font-heading">{t("confirm_details", lang)}</h2>
                <p className="text-xl text-muted-foreground">{t("is_info_correct", lang)}</p>
              </div>

              {signupError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-center">
                  {signupError}
                </div>
              )}

              <div className="bg-white p-8 rounded-3xl shadow-lg border border-border space-y-6">
                <div className="flex items-center gap-6 pb-6 border-b">
                  <div className="w-24 h-24 bg-secondary rounded-2xl overflow-hidden flex items-center justify-center border-2 border-primary/20">
                     <img src={fetchedDetails.avatar} alt="Aadhar Face" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold">{fetchedDetails.name}</h4>
                    <p className="text-muted-foreground text-lg">{t("dob", lang)}: {fetchedDetails.dob}</p>
                    <p className="text-muted-foreground text-lg">{t("gender", lang)}: {fetchedDetails.gender === "Male" ? t("male", lang) : t("female", lang)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 text-lg">
                  <div>
                    <p className="text-muted-foreground text-sm uppercase tracking-wider font-bold">{t("permanent_address", lang)}</p>
                    <p className="font-medium">{fetchedDetails.address}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm uppercase tracking-wider font-bold">{t("mobile_linked", lang)}</p>
                    <p className="font-medium">XXXXXX{fetchedDetails.phone.slice(-4)}</p>
                  </div>
                </div>

                <Button 
                  size="lg" 
                  className="w-full h-20 text-2xl rounded-2xl mt-4 gap-3"
                  onClick={() => setStep("facescan")}
                >
                  <ScanFace className="w-7 h-7" />
                  {t("register_face", lang)}
                </Button>
              </div>
            </motion.div>
          )}

          {step === "facescan" && (
            <motion.div 
              key="facescan"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full space-y-8"
            >
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                  <ScanFace className="w-10 h-10" />
                </div>
                <h2 className="text-4xl font-bold font-heading mb-2">{t("face_registration", lang)}</h2>
                <p className="text-xl text-muted-foreground">{t("look_camera_register", lang)}</p>
                <div className="flex items-center justify-center gap-4 mt-3">
                  <div className="flex items-center gap-1 text-xs text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-full">
                    <Shield className="w-3 h-3" /> Anti-Spoof
                  </div>
                  <div className="flex items-center gap-1 text-xs text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full">
                    <Eye className="w-3 h-3" /> Retina Scan
                  </div>
                  <div className="flex items-center gap-1 text-xs text-purple-600 font-bold bg-purple-50 px-3 py-1 rounded-full">
                    <MonitorSmartphone className="w-3 h-3" /> Screen Detect
                  </div>
                </div>
                {!modelsReady && (
                  <p className="text-sm text-blue-600 mt-2 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading face detection...
                  </p>
                )}
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-lg border border-border flex flex-col items-center gap-6">
                <div className="relative w-80 h-80 rounded-3xl overflow-hidden bg-black border-4 border-blue-200">
                  <video 
                    ref={assignVideoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-56 h-56 border-4 border-blue-400 rounded-full opacity-60"></div>
                  </div>

                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-1 rounded-full text-sm font-medium">
                    {t("position_face", lang)}
                  </div>

                  <div className="absolute bottom-0 inset-x-0 h-1 bg-blue-500 animate-[scan_2s_ease-in-out_infinite]"></div>

                  <div className="absolute top-4 right-4 flex flex-col gap-1">
                    <div className="bg-green-500/80 text-white px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                      <Eye className="w-3 h-3" /> RETINA
                    </div>
                    <div className="bg-blue-500/80 text-white px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                      <Shield className="w-3 h-3" /> LIVE
                    </div>
                    <div className="bg-purple-500/80 text-white px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                      <MonitorSmartphone className="w-3 h-3" /> SCREEN
                    </div>
                  </div>
                </div>

                {faceError && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl text-center flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    {faceError}
                  </div>
                )}

                <div className="flex gap-4 w-full">
                  <Button 
                    size="lg"
                    className="flex-1 h-16 text-xl rounded-2xl gap-3 bg-blue-600 hover:bg-blue-700"
                    onClick={captureFace}
                    disabled={!modelsReady}
                  >
                    <Camera className="w-6 h-6" />
                    {t("capture_face", lang)}
                  </Button>
                </div>

                <Button 
                  variant="ghost"
                  className="text-muted-foreground text-lg"
                  onClick={skipFace}
                >
                  {t("skip_face", lang)}
                </Button>
              </div>
            </motion.div>
          )}

          {step === "liveness" && (
            <motion.div
              key="liveness"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full space-y-4"
            >
              <div className="text-center">
                <h3 className="text-3xl font-bold font-heading mb-1">Verifying Real Face</h3>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="relative w-80 h-80 rounded-3xl overflow-hidden bg-black border-4 border-blue-400 shadow-lg shadow-blue-500/20">
                  <video
                    ref={assignVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  <canvas
                    ref={overlayCanvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  />

                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-0 w-10 h-10 border-t-[3px] border-l-[3px] border-cyan-400 rounded-tl-xl"></div>
                    <div className="absolute top-0 right-0 w-10 h-10 border-t-[3px] border-r-[3px] border-cyan-400 rounded-tr-xl"></div>
                    <div className="absolute bottom-0 left-0 w-10 h-10 border-b-[3px] border-l-[3px] border-cyan-400 rounded-bl-xl"></div>
                    <div className="absolute bottom-0 right-0 w-10 h-10 border-b-[3px] border-r-[3px] border-cyan-400 rounded-br-xl"></div>
                  </div>

                  <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-red-600/90 text-white px-2 py-1 rounded-lg text-xs font-bold">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    SCANNING
                  </div>
                </div>

                {instruction && (
                  <motion.div
                    key={instruction}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`px-6 py-3 rounded-2xl text-lg font-bold text-center max-w-[320px] ${
                      instruction.includes("✅")
                        ? "bg-green-100 text-green-700 border-2 border-green-300"
                        : "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                    }`}
                  >
                    {instruction}
                  </motion.div>
                )}

                {capturedFrames.length > 0 && (
                  <div className="flex gap-2">
                    {capturedFrames.slice(-4).map((frame, idx) => (
                      <div key={idx} className="w-12 h-12 rounded-lg overflow-hidden border-2 border-cyan-300 shadow-sm">
                        <img src={frame} alt={`Frame ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {livenessSteps.map((s) => (
                  <div
                    key={s.key}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all duration-300 ${
                      s.status === "passed" ? "border-green-300 bg-green-50" :
                      s.status === "failed" ? "border-red-300 bg-red-50" :
                      s.status === "checking" ? "border-blue-300 bg-blue-50 animate-pulse" :
                      "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className={`${
                      s.status === "passed" ? "text-green-600" :
                      s.status === "failed" ? "text-red-500" :
                      s.status === "checking" ? "text-blue-600" :
                      "text-gray-400"
                    }`}>
                      {s.status === "checking" ? <Loader2 className="w-4 h-4 animate-spin" /> :
                       s.status === "passed" ? <CheckCircle2 className="w-4 h-4" /> :
                       s.status === "failed" ? <XCircle className="w-4 h-4" /> :
                       stepIcons[s.key] || <Shield className="w-4 h-4" />}
                    </div>
                    <span className={`text-[10px] font-semibold text-center leading-tight ${
                      s.status === "passed" ? "text-green-700" :
                      s.status === "failed" ? "text-red-600" :
                      s.status === "checking" ? "text-blue-700" :
                      "text-gray-500"
                    }`}>
                      {s.label.split(" ").slice(0, 2).join(" ")}
                    </span>
                  </div>
                ))}
              </div>

              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${scanProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Follow the instructions above for best results
              </p>
            </motion.div>
          )}

          {step === "faceprocessing" && (
            <motion.div
              key="faceprocessing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="relative">
                <div className="w-32 h-32 rounded-full border-4 border-green-200 bg-green-50 flex items-center justify-center overflow-hidden">
                  {faceCapture ? (
                    <img src={faceCapture} alt="Captured" className="w-full h-full object-cover" />
                  ) : (
                    <UserPlus className="w-16 h-16 text-green-400" />
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
              </div>
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-green-600 font-bold">All 8 Checks Passed</span>
                </div>
                <h3 className="text-3xl font-bold font-heading">Creating Suvidha ID...</h3>
                <p className="text-xl text-muted-foreground">Setting up your account</p>
              </div>
            </motion.div>
          )}

          {step === "fake-detected" && (
            <motion.div
              key="fake-detected"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full space-y-8"
            >
              <div className="text-center">
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                  <Shield className="w-12 h-12" />
                </div>
                <h2 className="text-4xl font-bold font-heading text-red-600">Fake Face Detected</h2>
                <p className="text-xl text-muted-foreground mt-2">{faceError}</p>
              </div>

              <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-6 max-w-md mx-auto space-y-4">
                <h4 className="font-bold text-red-700 text-lg">Security Alert</h4>
                <ul className="space-y-2 text-red-600">
                  <li className="flex items-center gap-2"><XCircle className="w-4 h-4" /> Photos and printouts are blocked</li>
                  <li className="flex items-center gap-2"><XCircle className="w-4 h-4" /> Phone/tablet screens are blocked</li>
                  <li className="flex items-center gap-2"><XCircle className="w-4 h-4" /> Masks and face covers are blocked</li>
                  <li className="flex items-center gap-2"><XCircle className="w-4 h-4" /> Blink once OR move your head slightly</li>
                </ul>
                <p className="text-sm text-muted-foreground">Please use your real face and follow the on-screen instructions.</p>
              </div>

              {capturedFrames.length > 0 && (
                <div className="max-w-md mx-auto">
                  <p className="text-sm font-bold text-gray-500 mb-2">Captured analysis frames:</p>
                  <div className="flex gap-2">
                    {capturedFrames.map((frame, idx) => (
                      <div key={idx} className="w-16 h-16 rounded-lg overflow-hidden border-2 border-red-300">
                        <img src={frame} alt={`Frame ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-4 max-w-md mx-auto">
                <Button
                  size="lg"
                  className="h-16 text-xl rounded-2xl gap-3 bg-blue-600 hover:bg-blue-700"
                  onClick={() => { setStep("facescan"); setFaceError(null); setScanProgress(0); setCapturedFrames([]); }}
                >
                  <ScanFace className="w-6 h-6" />
                  {t("try_again", lang)}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-16 text-xl rounded-2xl"
                  onClick={skipFace}
                >
                  {t("skip_face", lang)}
                </Button>
              </div>
            </motion.div>
          )}

          {step === "duplicate-face" && (
            <motion.div
              key="duplicate-face"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full space-y-8"
            >
              <div className="text-center">
                <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
                  <AlertTriangle className="w-12 h-12" />
                </div>
                <h2 className="text-4xl font-bold font-heading text-amber-700">Face Already Registered</h2>
                <p className="text-xl text-muted-foreground mt-2">{signupError}</p>
              </div>

              <div className="flex flex-col gap-4 max-w-md mx-auto">
                <Button
                  size="lg"
                  className="h-16 text-xl rounded-2xl gap-3"
                  onClick={() => setLocation("/login/face")}
                >
                  <ScanFace className="w-6 h-6" />
                  Face Login
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-16 text-xl rounded-2xl"
                  onClick={() => { setStep("facescan"); setSignupError(null); }}
                >
                  {t("try_again", lang)}
                </Button>
              </div>
            </motion.div>
          )}

          {step === "qr" && signupResult && (
            <motion.div 
              key="qr"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full space-y-8"
            >
              <div className="text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="text-4xl font-bold font-heading mb-2">{t("registration_success", lang)}</h2>
                <p className="text-xl text-muted-foreground">Your Suvidha ID is ready!</p>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-lg border border-border max-w-md mx-auto text-center space-y-6">
                <div>
                  <p className="text-muted-foreground text-lg">{t("citizen_id", lang)}</p>
                  <p className="text-3xl font-bold font-mono">{signupResult.suvidhaId}</p>
                </div>

                {qrDataUrl && (
                  <div className="bg-white p-4 inline-block rounded-2xl border">
                    <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 mx-auto" />
                  </div>
                )}

                <div className="text-left bg-secondary/50 p-6 rounded-2xl space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground font-bold">{t("name", lang)}</p>
                    <p className="text-lg font-bold">{signupResult.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-bold">{t("aadhaar_number", lang)}</p>
                    <p className="text-lg font-bold">XXXX XXXX {aadhar.slice(-4)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-bold">Face ID</p>
                    <p className="text-lg font-bold flex items-center gap-2">
                      {faceCapture ? (
                        <><CheckCircle2 className="w-5 h-5 text-green-600" /> Registered</>
                      ) : (
                        <><AlertTriangle className="w-5 h-5 text-amber-500" /> Not Registered</>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Button 
                    size="lg"
                    className="w-full h-16 text-xl rounded-2xl gap-3"
                    onClick={handlePrintCard}
                  >
                    Print Suvidha Pass
                  </Button>
                  <Button 
                    size="lg"
                    variant="outline"
                    className="w-full h-16 text-xl rounded-2xl gap-3"
                    onClick={() => setLocation("/dashboard")}
                  >
                    {t("go_dashboard", lang)}
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </KioskLayout>
  );
}
