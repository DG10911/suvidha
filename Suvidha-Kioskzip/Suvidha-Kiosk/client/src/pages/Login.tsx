import KioskLayout from "@/components/layout/KioskLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowRight, Delete, Camera, CheckCircle2, Loader2, XCircle, QrCode, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { t } from "@/lib/translations";
import { loadPreferences, savePreferences } from "@/lib/userPreferences";
import { Html5Qrcode } from "html5-qrcode";

export default function Login() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/login/:method");
  const method = params?.method || "mobile";

  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [lang, setLang] = useState(() => loadPreferences().language);

  const [qrStep, setQrStep] = useState<"scanning" | "processing" | "success" | "failed" | "no-camera">("scanning");
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<string>("qr-reader-" + Math.random().toString(36).slice(2));
  const isMountedRef = useRef(true);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.language) setLang(detail.language);
    };
    window.addEventListener("prefs-changed", handler);
    return () => window.removeEventListener("prefs-changed", handler);
  }, []);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) {
          await scannerRef.current.stop();
        }
      } catch {}
      try {
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
  }, []);

  const handleQrSuccess = useCallback(async (decodedText: string) => {
    if (!isMountedRef.current) return;
    setScannedData(decodedText);
    setQrStep("processing");
    await stopScanner();

    try {
      const res = await fetch("/api/auth/qr-validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrData: decodedText }),
      });
      const data = await res.json();

      if (!isMountedRef.current) return;

      if (data.success) {
        savePreferences({
          userName: data.userName || data.user?.name || "Citizen User",
          userId: data.userId || data.user?.id,
        });
        setQrStep("success");
        setTimeout(() => {
          if (isMountedRef.current) setLocation("/dashboard");
        }, 2000);
      } else {
        setQrError(data.message || "Invalid QR code");
        setQrStep("failed");
      }
    } catch {
      if (!isMountedRef.current) return;
      setQrError("Could not verify QR code. Please try again.");
      setQrStep("failed");
    }
  }, [stopScanner, setLocation]);

  const startScanner = useCallback(async () => {
    await stopScanner();
    setQrError(null);

    const containerId = scannerContainerRef.current;
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleQrSuccess(decodedText);
        },
        () => {}
      );
    } catch (err: any) {
      if (!isMountedRef.current) return;
      const msg = err?.message || String(err);
      if (msg.includes("NotAllowedError") || msg.includes("Permission") || msg.includes("denied")) {
        setQrStep("no-camera");
        setQrError("Camera access was denied. Please allow camera permission and try again.");
      } else if (msg.includes("NotFoundError") || msg.includes("Requested device not found")) {
        setQrStep("no-camera");
        setQrError("No camera found on this device.");
      } else {
        setQrStep("no-camera");
        setQrError("Could not start camera. You can enter your Suvidha ID manually below.");
      }
    }
  }, [stopScanner, handleQrSuccess]);

  useEffect(() => {
    isMountedRef.current = true;
    if (method === "qr" && qrStep === "scanning") {
      const timer = setTimeout(() => startScanner(), 300);
      return () => {
        clearTimeout(timer);
        isMountedRef.current = false;
        stopScanner();
      };
    }
    return () => { isMountedRef.current = false; };
  }, [method, qrStep, startScanner, stopScanner]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopScanner();
    };
  }, [stopScanner]);

  const handleRetry = async () => {
    setQrStep("scanning");
    setScannedData(null);
    setQrError(null);
  };

  const [manualId, setManualId] = useState("");
  const handleManualSubmit = async () => {
    if (!manualId.trim()) return;
    handleQrSuccess(manualId.trim());
  };

  const handleNumberClick = (num: string) => {
    if (step === "phone") {
      if (phoneNumber.length < 10) setPhoneNumber(prev => prev + num);
    } else {
      if (otp.length < 6) setOtp(prev => prev + num);
    }
  };

  const handleBackspace = () => {
    if (step === "phone") {
      setPhoneNumber(prev => prev.slice(0, -1));
    } else {
      setOtp(prev => prev.slice(0, -1));
    }
  };

  const [loginError, setLoginError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [otpSentMsg, setOtpSentMsg] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const sendOtpRequest = async () => {
    setLoginError(null);
    setSending(true);
    setOtpSentMsg(null);
    try {
      const res = await fetch("/api/auth/mobile-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNumber }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("otp");
        setOtpSentMsg("OTP sent to +91 " + phoneNumber);
        setResendTimer(30);
      } else {
        setLoginError(data.message || "No account found with this mobile number. Please sign up first.");
      }
    } catch {
      setLoginError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = async () => {
    if (step === "phone") {
      if (phoneNumber.length === 10) {
        await sendOtpRequest();
      }
    } else {
      if (otp.length === 6) {
        setLoginError(null);
        setSending(true);
        try {
          const res = await fetch("/api/auth/verify-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: phoneNumber, otp }),
          });
          const data = await res.json();
          if (data.success && data.user) {
            savePreferences({
              userName: data.user.name || "Citizen User",
              userId: data.user.id,
            });
            setLocation("/dashboard");
          } else {
            setLoginError(data.message || "Invalid OTP. Please try again.");
            setOtp("");
          }
        } catch {
          setLoginError("Something went wrong. Please try again.");
        } finally {
          setSending(false);
        }
      }
    }
  };

  return (
    <KioskLayout>
      <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold font-heading mb-2">
            {method === "qr" ? t("scan_qr_title", lang) : t("mobile_login", lang)}
          </h2>
          <p className="text-xl text-muted-foreground">
            {method === "qr"
              ? t("scan_qr_desc", lang)
              : step === "phone" ? t("enter_mobile", lang) : t("enter_otp", lang)
            }
          </p>
        </div>

        {method === "mobile" ? (
          <div className="w-full bg-white p-8 rounded-3xl shadow-lg border border-border">
            <div className="mb-8">
              <Input
                readOnly
                value={step === "phone" ? phoneNumber : otp}
                className="text-center text-4xl font-mono py-8 h-24 tracking-[0.5em] rounded-xl border-2 border-primary/20 focus-visible:ring-primary bg-secondary/30"
                placeholder={step === "phone" ? "----------" : "------"}
              />
            </div>

            {otpSentMsg && step === "otp" && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-center mb-4 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>{otpSentMsg}</span>
              </div>
            )}

            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-center mb-4 flex items-center justify-center gap-2">
                <XCircle className="w-5 h-5 flex-shrink-0" />
                <span>{loginError}</span>
                {loginError.includes("sign up") && (
                  <Button variant="link" className="text-red-700 underline p-0 h-auto" onClick={() => setLocation("/signup")}>
                    Sign Up
                  </Button>
                )}
              </div>
            )}

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
              <Button
                variant="ghost"
                className="h-20 text-xl font-medium rounded-2xl text-muted-foreground"
                onClick={() => setStep("phone")}
                disabled={step === "phone"}
              >
                {t("reset", lang)}
              </Button>
              <Button
                variant="outline"
                className="h-20 text-3xl font-bold rounded-2xl hover:bg-primary/5 hover:border-primary transition-all"
                onClick={() => handleNumberClick("0")}
              >
                0
              </Button>
              <Button
                variant="ghost"
                className="h-20 rounded-2xl text-destructive hover:bg-destructive/10 hover:text-destructive transition-all"
                onClick={handleBackspace}
              >
                <Delete className="w-8 h-8" />
              </Button>
            </div>

            <Button
              size="lg"
              className="w-full h-20 text-2xl rounded-2xl gap-3 shadow-lg shadow-primary/20"
              onClick={handleSubmit}
              disabled={sending || (step === "phone" ? phoneNumber.length !== 10 : otp.length !== 6)}
            >
              {sending ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  {step === "phone" ? "Sending OTP..." : "Verifying..."}
                </>
              ) : (
                <>
                  {step === "phone" ? t("send_otp", lang) : t("verify_login", lang)}
                  <ArrowRight className="w-6 h-6" />
                </>
              )}
            </Button>

            {step === "otp" && (
              <div className="flex items-center justify-center gap-4 mt-4">
                <Button
                  variant="ghost"
                  className="text-base text-muted-foreground"
                  onClick={() => { setStep("phone"); setOtp(""); setOtpSentMsg(null); setLoginError(null); }}
                >
                  Change Number
                </Button>
                <Button
                  variant="ghost"
                  className="text-base text-primary"
                  onClick={sendOtpRequest}
                  disabled={sending || resendTimer > 0}
                >
                  {resendTimer > 0 ? `Resend OTP (${resendTimer}s)` : "Resend OTP"}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {qrStep === "scanning" && (
              <motion.div
                key="scanning"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full bg-white p-8 rounded-3xl shadow-lg border border-border flex flex-col items-center gap-6"
              >
                <div className="w-80 h-80 rounded-2xl overflow-hidden bg-black relative border-4 border-primary/30">
                  <div id={scannerContainerRef.current} className="w-full h-full" />
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-primary animate-[scan_2s_ease-in-out_infinite]" />
                </div>
                <p className="text-center text-muted-foreground text-lg max-w-sm">
                  {t("point_scanner", lang)}
                </p>
              </motion.div>
            )}

            {qrStep === "no-camera" && (
              <motion.div
                key="no-camera"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full bg-white p-8 rounded-3xl shadow-lg border border-border flex flex-col items-center gap-6"
              >
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                  <Camera className="w-10 h-10" />
                </div>
                {qrError && (
                  <p className="text-center text-amber-700 bg-amber-50 border border-amber-200 px-6 py-3 rounded-xl text-base">
                    {qrError}
                  </p>
                )}
                <Button
                  size="lg"
                  className="w-full h-16 text-xl rounded-2xl gap-3"
                  onClick={handleRetry}
                >
                  <RefreshCw className="w-6 h-6" />
                  {t("try_again", lang)}
                </Button>

                <div className="w-full border-t border-border pt-6 mt-2">
                  <p className="text-center text-muted-foreground text-base mb-4">
                    {t("enter_suvidha_id", lang)}
                  </p>
                  <div className="flex gap-3">
                    <Input
                      value={manualId}
                      onChange={(e) => setManualId(e.target.value)}
                      placeholder="SUV-XXXX-X"
                      className="flex-1 h-14 text-xl text-center font-mono rounded-xl border-2"
                    />
                    <Button
                      size="lg"
                      className="h-14 px-8 text-lg rounded-xl"
                      onClick={handleManualSubmit}
                      disabled={!manualId.trim()}
                    >
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {qrStep === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-6"
              >
                <div className="relative">
                  <div className="w-32 h-32 rounded-full border-4 border-primary/30 bg-primary/5 flex items-center justify-center">
                    <QrCode className="w-16 h-16 text-primary/60" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-3xl font-bold font-heading">{t("verifying_qr", lang)}</h3>
                  <p className="text-xl text-muted-foreground">{t("checking_suvidha_id", lang)}</p>
                </div>
                <div className="flex gap-2 mt-4">
                  <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </motion.div>
            )}

            {qrStep === "success" && (
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
                  <h2 className="text-4xl font-bold font-heading">{t("qr_verified", lang)}</h2>
                  <p className="text-xl text-muted-foreground mt-2">{t("redirecting_dashboard", lang)}</p>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-lg border-4 border-green-200 max-w-md mx-auto">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <QrCode className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{t("qr_login_success", lang)}</p>
                      <p className="text-muted-foreground">{t("welcome_kiosk", lang)}</p>
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
                </div>
              </motion.div>
            )}

            {qrStep === "failed" && (
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
                  <h2 className="text-4xl font-bold font-heading">{t("qr_invalid", lang)}</h2>
                  <p className="text-xl text-muted-foreground mt-2">
                    {qrError || t("qr_try_again_msg", lang)}
                  </p>
                </div>

                <div className="flex flex-col gap-4 max-w-md mx-auto">
                  <Button
                    size="lg"
                    className="h-16 text-xl rounded-2xl gap-3"
                    onClick={handleRetry}
                  >
                    <Camera className="w-6 h-6" />
                    {t("scan_again", lang)}
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
        )}
      </div>
    </KioskLayout>
  );
}
