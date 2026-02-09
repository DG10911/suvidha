import KioskLayout from "@/components/layout/KioskLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, ArrowRight, UserPlus, Fingerprint, Loader2, Camera, ScanFace, AlertTriangle, Shield, Eye, Activity, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { savePreferences, loadPreferences } from "@/lib/userPreferences";
import { t } from "@/lib/translations";
import QRCode from "qrcode";
import { loadFaceModels, performLivenessCheck, detectFaceDescriptorMultiFrame, descriptorToArray, type LivenessResult } from "@/lib/faceUtils";

interface LivenessStep {
  key: string;
  label: string;
  icon: React.ReactNode;
  status: "pending" | "checking" | "passed" | "failed";
}

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
  const streamRef = useRef<MediaStream | null>(null);
  const [lang, setLang] = useState(() => loadPreferences().language);
  const [livenessSteps, setLivenessSteps] = useState<LivenessStep[]>([]);
  const [scanProgress, setScanProgress] = useState(0);

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

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
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

  const initLivenessSteps = (): LivenessStep[] => [
    { key: "faceDetected", label: "Face Detection", icon: <ScanFace className="w-5 h-5" />, status: "pending" },
    { key: "textureAnalysis", label: "Texture & Anti-Spoof", icon: <Shield className="w-5 h-5" />, status: "pending" },
    { key: "eyeOpenness", label: "Eye & Retina Scan", icon: <Eye className="w-5 h-5" />, status: "pending" },
    { key: "blinkDetected", label: "Blink Detection", icon: <Activity className="w-5 h-5" />, status: "pending" },
    { key: "motionDetected", label: "Motion Analysis", icon: <Fingerprint className="w-5 h-5" />, status: "pending" },
    { key: "consistentDescriptor", label: "Identity Consistency", icon: <CheckCircle2 className="w-5 h-5" />, status: "pending" },
  ];

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
      const steps = initLivenessSteps();
      setLivenessSteps(steps);
      setScanProgress(0);

      const livenessResult = await performLivenessCheck(video, (stepKey, status) => {
        setLivenessSteps(prev => prev.map(s =>
          s.key === stepKey ? { ...s, status } : s
        ));
        const stepIndex = steps.findIndex(s => s.key === stepKey);
        if (stepIndex >= 0) {
          setScanProgress(Math.round(((stepIndex + 1) / steps.length) * 100));
        }
      });

      if (!livenessResult.isLive) {
        setFaceError(livenessResult.message);
        setStep("fake-detected");
        return;
      }

      const descriptor = await detectFaceDescriptorMultiFrame(video, 3, 300);
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
      <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
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
                <div className="flex items-center justify-center gap-2 mt-3 text-sm text-blue-600 font-medium">
                  <Shield className="w-4 h-4" />
                  <span>Anti-spoof &amp; liveness verification enabled</span>
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
                    ref={videoRef} 
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
              className="w-full space-y-6"
            >
              <div className="text-center">
                <h3 className="text-3xl font-bold font-heading mb-2">Verifying Real Face</h3>
                <p className="text-lg text-muted-foreground">Running security checks for registration...</p>
              </div>

              <div className="flex gap-6 items-start">
                <div className="relative w-48 h-48 rounded-2xl overflow-hidden bg-black border-4 border-blue-300 flex-shrink-0">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 border-4 border-blue-400/50 rounded-2xl pointer-events-none">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-green-400"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-green-400"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-green-400"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-green-400"></div>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 h-0.5 bg-green-400 animate-[scan_1.5s_ease-in-out_infinite]"></div>
                </div>

                <div className="flex-1 space-y-3">
                  {livenessSteps.map((s) => (
                    <div
                      key={s.key}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-300 ${
                        s.status === "passed" ? "border-green-300 bg-green-50" :
                        s.status === "failed" ? "border-red-300 bg-red-50" :
                        s.status === "checking" ? "border-blue-300 bg-blue-50 animate-pulse" :
                        "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div className={`flex-shrink-0 ${
                        s.status === "passed" ? "text-green-600" :
                        s.status === "failed" ? "text-red-500" :
                        s.status === "checking" ? "text-blue-600" :
                        "text-gray-400"
                      }`}>
                        {s.status === "checking" ? <Loader2 className="w-5 h-5 animate-spin" /> :
                         s.status === "passed" ? <CheckCircle2 className="w-5 h-5" /> :
                         s.status === "failed" ? <XCircle className="w-5 h-5" /> :
                         s.icon}
                      </div>
                      <span className={`text-sm font-semibold ${
                        s.status === "passed" ? "text-green-700" :
                        s.status === "failed" ? "text-red-600" :
                        s.status === "checking" ? "text-blue-700" :
                        "text-gray-500"
                      }`}>
                        {s.label}
                      </span>
                      {s.status === "passed" && (
                        <span className="ml-auto text-xs text-green-600 font-bold">PASS</span>
                      )}
                      {s.status === "failed" && (
                        <span className="ml-auto text-xs text-red-500 font-bold">FAIL</span>
                      )}
                    </div>
                  ))}
                </div>
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
                Keep your face still and look directly at the camera
              </p>
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
                  <li className="flex items-center gap-2"><XCircle className="w-4 h-4" /> Photos and printouts are not allowed</li>
                  <li className="flex items-center gap-2"><XCircle className="w-4 h-4" /> Screen displays are not allowed</li>
                  <li className="flex items-center gap-2"><XCircle className="w-4 h-4" /> Only real faces can be registered</li>
                </ul>
              </div>

              <div className="flex flex-col gap-4 max-w-md mx-auto">
                <Button
                  size="lg"
                  className="h-16 text-xl rounded-2xl gap-3 bg-blue-600 hover:bg-blue-700"
                  onClick={() => { setStep("facescan"); setFaceError(null); setScanProgress(0); }}
                >
                  <ScanFace className="w-6 h-6" />
                  {t("try_again", lang)}
                </Button>
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
                <h2 className="text-4xl font-bold font-heading text-amber-700">Duplicate Face Detected</h2>
                <p className="text-xl text-muted-foreground mt-2">{signupError}</p>
              </div>

              <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-6 max-w-md mx-auto space-y-4">
                <p className="text-amber-700 font-medium">This face already matches an existing account. Each person can only have one account.</p>
                <p className="text-sm text-muted-foreground">If you already have an account, please use Face Login or Mobile Login instead.</p>
              </div>

              <div className="flex flex-col gap-4 max-w-md mx-auto">
                <Button
                  size="lg"
                  className="h-16 text-xl rounded-2xl gap-3 bg-blue-600 hover:bg-blue-700"
                  onClick={() => setLocation("/login/face")}
                >
                  <ScanFace className="w-6 h-6" />
                  Use Face Login
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-16 text-xl rounded-2xl"
                  onClick={() => setLocation("/login/mobile")}
                >
                  Use Mobile Login
                </Button>
                <Button
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => { setStep("facescan"); setSignupError(null); }}
                >
                  Try with different face
                </Button>
              </div>
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
                <div className="w-32 h-32 rounded-full border-4 border-blue-200 overflow-hidden bg-blue-50 flex items-center justify-center">
                  {faceCapture && faceCapture !== "simulated" ? (
                    <img src={faceCapture} alt="Captured face" className="w-full h-full object-cover" />
                  ) : (
                    <ScanFace className="w-16 h-16 text-blue-400" />
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-green-600 font-bold text-sm">Liveness Verified</span>
                </div>
                <h3 className="text-3xl font-bold font-heading">{t("processing_face", lang)}</h3>
                <p className="text-xl text-muted-foreground">{t("generating_profile", lang)}</p>
              </div>
              <div className="flex gap-2 mt-4">
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
              </div>
            </motion.div>
          )}

          {step === "qr" && signupResult && (
            <motion.div 
              key="qr"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full space-y-8"
            >
              <div className="text-center">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h2 className="text-4xl font-bold font-heading">{t("registration_success", lang)}</h2>
                <p className="text-xl text-muted-foreground">
                  {faceCapture ? t("face_registered_msg", lang) : t("qr_code_msg", lang)}
                </p>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-xl border-4 border-primary/20 flex flex-col items-center gap-8 max-w-md mx-auto relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-2 bg-primary"></div>
                <div className="text-center">
                   <h3 className="text-2xl font-bold text-primary">SUVIDHA PASS</h3>
                   <p className="text-sm font-medium text-muted-foreground">{t("citizen_id", lang)}: {signupResult.suvidhaId}</p>
                </div>

                {qrDataUrl && (
                  <div className="p-4 bg-white border-2 border-border rounded-2xl">
                    <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
                  </div>
                )}

                {faceCapture && (
                  <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl w-full">
                    <ScanFace className="w-6 h-6 flex-shrink-0" />
                    <span className="font-medium">{t("face_id_registered", lang)}</span>
                    <div className="ml-auto flex gap-1">
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">Verified</span>
                    </div>
                  </div>
                )}

                <div className="text-center space-y-2">
                  <p className="font-bold text-lg">{signupResult.name}</p>
                  <p className="text-muted-foreground">{t("scan_any_kiosk", lang)}</p>
                </div>

                <div className="flex gap-4 w-full">
                   <Button variant="outline" className="flex-1 h-14 rounded-xl" onClick={handlePrintCard}>{t("print_card", lang)}</Button>
                   <Button className="flex-1 h-14 rounded-xl" onClick={() => setLocation("/dashboard")}>{t("go_dashboard", lang)}</Button>
                </div>
              </div>

              <p className="text-center text-muted-foreground">
                {t("digital_copy_sent", lang)}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </KioskLayout>
  );
}
