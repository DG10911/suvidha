import KioskLayout from "@/components/layout/KioskLayout";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { ScanFace, CheckCircle2, Loader2, Camera, XCircle, AlertTriangle, Eye, Shield, Fingerprint, Activity, MonitorSmartphone, Move } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { savePreferences, loadPreferences } from "@/lib/userPreferences";
import { t } from "@/lib/translations";
import { loadFaceModels, performLivenessCheck, descriptorToArray, detectFaceDescriptorMultiFrame, initLivenessSteps } from "@/lib/faceUtils";

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
  headMovement: <Move className="w-5 h-5" />,
  consistentDescriptor: <CheckCircle2 className="w-5 h-5" />,
};

export default function FaceLogin() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"loading" | "scanning" | "liveness" | "processing" | "success" | "failed" | "no-face" | "fake-detected">("loading");
  const [matchedUser, setMatchedUser] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [faceCapture, setFaceCapture] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [lang, setLang] = useState(() => loadPreferences().language);
  const [modelsReady, setModelsReady] = useState(false);
  const [livenessSteps, setLivenessSteps] = useState<LivenessStep[]>([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [instruction, setInstruction] = useState("");
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.language) setLang(detail.language);
    };
    window.addEventListener("prefs-changed", handler);
    return () => window.removeEventListener("prefs-changed", handler);
  }, []);

  useEffect(() => {
    loadFaceModels().then(() => {
      setModelsReady(true);
      setStep("scanning");
    });
  }, []);

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
    if ((step === "scanning" || step === "liveness") && modelsReady) {
      startCamera();
    }
    return () => {
      if (step !== "scanning" && step !== "liveness") {
        stopCamera();
      }
    };
  }, [step, modelsReady, startCamera, stopCamera]);

  const attemptFaceLogin = async () => {
    if (!videoRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (canvas) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        setFaceCapture(canvas.toDataURL("image/jpeg", 0.6));
      }
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
      }
    );

    if (!livenessResult.isLive) {
      setErrorMsg(livenessResult.message);
      setStep("fake-detected");
      return;
    }

    setStep("processing");
    setInstruction("");

    try {
      const descriptor = await detectFaceDescriptorMultiFrame(video, 5, 250);

      if (!descriptor) {
        setErrorMsg("No face detected in the camera. Please make sure your face is clearly visible and well-lit.");
        setStep("no-face");
        return;
      }

      stopCamera();

      const res = await fetch("/api/auth/face-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faceDescriptor: descriptorToArray(descriptor) }),
      });
      const data = await res.json();

      if (data.success && data.user) {
        setMatchedUser(data.user.name || "Citizen");
        savePreferences({
          userId: data.user.id,
          userName: data.user.name || "Citizen",
          faceRegistered: true,
        });
        setStep("success");
        setTimeout(() => setLocation("/dashboard"), 2000);
      } else {
        setErrorMsg(data.message || "Face not recognized");
        setStep("failed");
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setStep("failed");
    }
  };

  return (
    <KioskLayout>
      <div className="h-full flex flex-col items-center justify-center max-w-3xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {step === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-6"
            >
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
              <div className="text-center">
                <h3 className="text-3xl font-bold font-heading">{t("face_login_title", lang)}</h3>
                <p className="text-xl text-muted-foreground mt-2">Loading face recognition models...</p>
              </div>
            </motion.div>
          )}

          {step === "scanning" && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full space-y-8"
            >
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                  <ScanFace className="w-10 h-10" />
                </div>
                <h2 className="text-4xl font-bold font-heading mb-2">{t("face_login_title", lang)}</h2>
                <p className="text-xl text-muted-foreground">{t("look_camera_login", lang)}</p>
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
                    <div className="w-56 h-56 border-4 border-blue-400 rounded-full opacity-60 animate-pulse"></div>
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

                <Button
                  size="lg"
                  className="w-full h-16 text-xl rounded-2xl gap-3 bg-blue-600 hover:bg-blue-700"
                  onClick={attemptFaceLogin}
                >
                  <Camera className="w-6 h-6" />
                  {t("scan_login", lang)}
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
              className="w-full space-y-5"
            >
              <div className="text-center">
                <h3 className="text-3xl font-bold font-heading mb-1">Verifying Real Face</h3>
                <p className="text-lg text-muted-foreground">Running 8-layer security verification...</p>
              </div>

              <div className="flex gap-5 items-start">
                <div className="flex flex-col items-center gap-3 flex-shrink-0">
                  <div className="relative w-52 h-52 rounded-2xl overflow-hidden bg-black border-4 border-blue-300">
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

                  {instruction && (
                    <motion.div
                      key={instruction}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold text-center max-w-[220px]"
                    >
                      {instruction}
                    </motion.div>
                  )}

                  {capturedFrames.length > 0 && (
                    <div className="flex gap-1.5">
                      {capturedFrames.slice(-4).map((frame, idx) => (
                        <div key={idx} className="w-11 h-11 rounded-lg overflow-hidden border-2 border-green-300">
                          <img src={frame} alt={`Frame ${idx + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  {livenessSteps.map((s) => (
                    <div
                      key={s.key}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 transition-all duration-300 ${
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
                         stepIcons[s.key] || <Shield className="w-5 h-5" />}
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
                Follow the instructions above for best results
              </p>
            </motion.div>
          )}

          {step === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="relative">
                <div className="w-32 h-32 rounded-full border-4 border-green-200 bg-green-50 flex items-center justify-center overflow-hidden">
                  {faceCapture ? (
                    <img src={faceCapture} alt="Captured" className="w-full h-full object-cover" />
                  ) : (
                    <ScanFace className="w-16 h-16 text-green-400" />
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-green-600 font-bold">All 8 Checks Passed</span>
                </div>
                <h3 className="text-3xl font-bold font-heading">{t("identifying", lang)}</h3>
                <p className="text-xl text-muted-foreground">{t("matching_face", lang)}</p>
              </div>
              <div className="flex gap-2 mt-4">
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
              </div>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full space-y-8"
            >
              <div className="text-center">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h2 className="text-4xl font-bold font-heading">{t("welcome_back", lang)}</h2>
                <p className="text-2xl text-primary font-bold mt-2">{matchedUser}</p>
                <p className="text-xl text-muted-foreground mt-2">{t("settings_restored", lang)}</p>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-lg border-4 border-green-200 max-w-md mx-auto">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center overflow-hidden">
                    {faceCapture ? (
                      <img src={faceCapture} alt="Face" className="w-full h-full object-cover" />
                    ) : (
                      <ScanFace className="w-8 h-8 text-green-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-lg font-bold">{t("face_verified", lang)}</p>
                    <p className="text-muted-foreground">{t("settings_auto_restored", lang)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Anti-Spoof
                  </div>
                  <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Retina
                  </div>
                  <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <MonitorSmartphone className="w-3 h-3" /> Screen Check
                  </div>
                  <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <Move className="w-3 h-3" /> Head Movement
                  </div>
                </div>
                <div className="w-full bg-green-100 rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2 }}
                    className="h-full bg-green-500 rounded-full"
                  />
                </div>
                <p className="text-center text-sm text-muted-foreground mt-3">{t("redirecting_dashboard", lang)}</p>
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
                <p className="text-xl text-muted-foreground mt-2">{errorMsg}</p>
              </div>

              <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-6 max-w-md mx-auto space-y-4">
                <h4 className="font-bold text-red-700 text-lg">Security Alert</h4>
                <ul className="space-y-2 text-red-600">
                  <li className="flex items-center gap-2"><XCircle className="w-4 h-4" /> Photos and printouts are blocked</li>
                  <li className="flex items-center gap-2"><XCircle className="w-4 h-4" /> Phone/tablet screens are blocked</li>
                  <li className="flex items-center gap-2"><XCircle className="w-4 h-4" /> Masks and face covers are blocked</li>
                  <li className="flex items-center gap-2"><XCircle className="w-4 h-4" /> Head movement & blink required</li>
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
                  onClick={() => { setStep("scanning"); setErrorMsg(""); setScanProgress(0); setCapturedFrames([]); }}
                >
                  <ScanFace className="w-6 h-6" />
                  {t("try_again", lang)}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-16 text-xl rounded-2xl"
                  onClick={() => setLocation("/login/mobile")}
                >
                  {t("login_mobile", lang)}
                </Button>
              </div>
            </motion.div>
          )}

          {step === "no-face" && (
            <motion.div
              key="no-face"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full space-y-8"
            >
              <div className="text-center">
                <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
                  <AlertTriangle className="w-12 h-12" />
                </div>
                <h2 className="text-4xl font-bold font-heading">No Face Detected</h2>
                <p className="text-xl text-muted-foreground mt-2">{errorMsg}</p>
              </div>

              <div className="flex flex-col gap-4 max-w-md mx-auto">
                <Button
                  size="lg"
                  className="h-16 text-xl rounded-2xl gap-3 bg-blue-600 hover:bg-blue-700"
                  onClick={() => { setStep("scanning"); setErrorMsg(""); }}
                >
                  <ScanFace className="w-6 h-6" />
                  {t("try_again", lang)}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-16 text-xl rounded-2xl"
                  onClick={() => setLocation("/login/mobile")}
                >
                  {t("login_mobile", lang)}
                </Button>
              </div>
            </motion.div>
          )}

          {step === "failed" && (
            <motion.div
              key="failed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full space-y-8"
            >
              <div className="text-center">
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                  <XCircle className="w-12 h-12" />
                </div>
                <h2 className="text-4xl font-bold font-heading">{t("face_not_recognized", lang)}</h2>
                <p className="text-xl text-muted-foreground mt-2">{errorMsg || t("face_not_recognized_msg", lang)}</p>
              </div>

              <div className="flex flex-col gap-4 max-w-md mx-auto">
                <Button
                  size="lg"
                  className="h-16 text-xl rounded-2xl gap-3 bg-blue-600 hover:bg-blue-700"
                  onClick={() => { setStep("scanning"); setErrorMsg(""); setCapturedFrames([]); }}
                >
                  <ScanFace className="w-6 h-6" />
                  {t("try_again", lang)}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-16 text-xl rounded-2xl"
                  onClick={() => setLocation("/login/mobile")}
                >
                  {t("login_mobile", lang)}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </KioskLayout>
  );
}
