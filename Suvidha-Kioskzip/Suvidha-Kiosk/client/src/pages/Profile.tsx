import KioskLayout from "@/components/layout/KioskLayout";
import {
  User, Globe, Scan, QrCode, Shield, Zap, Droplets, Flame, Check, Trash2,
  Phone, Clock, LogOut, Settings, Link2, Unlink, AlertTriangle, CheckCircle2,
  Camera, Loader2, Printer, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import { loadPreferences, savePreferences } from "@/lib/userPreferences";
import { t, type TranslationKey } from "@/lib/translations";
import {
  getLinkedServices,
  toggleLinkedService,
  getRequests,
  getDocuments,
  getNotifications,
  fetchLinkedServicesFromApi,
  fetchRequestsFromApi,
  fetchDocumentsFromApi,
  fetchNotificationsFromApi,
  apiToggleLinkedService,
  type LinkedService,
  type ServiceRequest,
  type KioskDocument,
  type KioskNotification,
} from "@/lib/kioskStore";
import { useLocation } from "wouter";
import { loadFaceModels, detectFaceDescriptorMultiFrame, descriptorToArray } from "@/lib/faceUtils";
import QRCode from "qrcode";

const serviceIcons: Record<string, typeof Zap> = {
  electricity: Zap,
  water: Droplets,
  gas: Flame,
  waste: Trash2,
};

const serviceColors: Record<string, string> = {
  electricity: "text-yellow-600 bg-yellow-100",
  water: "text-blue-600 bg-blue-100",
  gas: "text-orange-600 bg-orange-100",
  waste: "text-green-600 bg-green-100",
};

export default function Profile() {
  const [prefs, setPrefs] = useState(() => loadPreferences());
  const [linkedServices, setLinkedServices] = useState<LinkedService[]>(() => getLinkedServices());
  const [requests, setRequests] = useState<ServiceRequest[]>(() => getRequests());
  const [documents, setDocuments] = useState<KioskDocument[]>(() => getDocuments());
  const [notifications, setNotifications] = useState<KioskNotification[]>(() => getNotifications());
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connectInput, setConnectInput] = useState("");
  const [disconnectConfirm, setDisconnectConfirm] = useState<string | null>(null);
  const [, navigate] = useLocation();

  const [hasFace, setHasFace] = useState(false);
  const [faceLoading, setFaceLoading] = useState(true);
  const [showFaceCapture, setShowFaceCapture] = useState(false);
  const [faceStep, setFaceStep] = useState<"ready" | "capturing" | "processing" | "success" | "error">("ready");
  const [faceError, setFaceError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrSuvidhaId, setQrSuvidhaId] = useState<string | null>(null);
  const [qrUserName, setQrUserName] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  const lang = prefs.language;

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) setPrefs(detail);
    };
    window.addEventListener("prefs-changed", handler);
    return () => window.removeEventListener("prefs-changed", handler);
  }, []);

  useEffect(() => {
    const handler = () => {
      setLinkedServices(getLinkedServices());
      setRequests(getRequests());
      setDocuments(getDocuments());
      setNotifications(getNotifications());
    };
    window.addEventListener("kiosk-store-changed", handler);
    return () => window.removeEventListener("kiosk-store-changed", handler);
  }, []);

  useEffect(() => { fetchLinkedServicesFromApi().then(setLinkedServices); }, []);
  useEffect(() => { fetchRequestsFromApi().then(setRequests); }, []);
  useEffect(() => { fetchDocumentsFromApi().then(setDocuments); }, []);
  useEffect(() => { fetchNotificationsFromApi().then(setNotifications); }, []);

  useEffect(() => {
    if (!prefs.userId) return;
    setFaceLoading(true);
    fetch(`/api/user/${prefs.userId}/face-status`)
      .then(r => r.json())
      .then(data => {
        setHasFace(data.hasFace || false);
        setFaceLoading(false);
      })
      .catch(() => setFaceLoading(false));
  }, [prefs.userId]);

  useEffect(() => {
    if (!prefs.userId) return;
    fetch(`/api/user/${prefs.userId}/qr-token`)
      .then(r => r.json())
      .then(async (data) => {
        if (data.success && data.token) {
          setQrToken(data.token);
          setQrSuvidhaId(data.suvidhaId);
          setQrUserName(data.userName);
          const qrPayload = JSON.stringify({ token: data.token, suvidhaId: data.suvidhaId });
          const url = await QRCode.toDataURL(qrPayload, {
            width: 300,
            margin: 2,
            color: { dark: "#000000", light: "#ffffff" },
          });
          setQrDataUrl(url);
        }
      })
      .catch(() => {});
  }, [prefs.userId]);

  const stats = {
    requests: requests.length,
    activeRequests: requests.filter((r) => r.status === "submitted" || r.status === "in_progress").length,
    documents: documents.length,
    unreadNotifs: notifications.filter((n) => !n.read).length,
  };

  const handleConnect = async (serviceId: string) => {
    if (!connectInput.trim()) return;
    await apiToggleLinkedService(serviceId, true, connectInput.trim());
    setLinkedServices(getLinkedServices());
    setConnectingId(null);
    setConnectInput("");
  };

  const handleDisconnect = async (serviceId: string) => {
    await apiToggleLinkedService(serviceId, false, "");
    setLinkedServices(getLinkedServices());
    setDisconnectConfirm(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("suvidha_user_prefs");
    navigate("/thank-you");
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => { stopCamera(); };
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setFaceError("Could not access camera. Please allow camera permission.");
      setFaceStep("error");
    }
  }, []);

  const handleOpenFaceCapture = async () => {
    setShowFaceCapture(true);
    setFaceStep("ready");
    setFaceError(null);
    await loadFaceModels();
    await startCamera();
  };

  const handleCloseFaceCapture = () => {
    stopCamera();
    setShowFaceCapture(false);
    setFaceStep("ready");
    setFaceError(null);
  };

  const handleCaptureFace = async () => {
    if (!videoRef.current) return;
    setFaceStep("capturing");
    setFaceError(null);

    try {
      await loadFaceModels();
      setFaceStep("processing");
      const descriptor = await detectFaceDescriptorMultiFrame(videoRef.current);
      if (!descriptor) {
        setFaceError("Could not detect a face. Please look directly at the camera and try again.");
        setFaceStep("error");
        return;
      }

      const descriptorArray = descriptorToArray(descriptor);
      const res = await fetch(`/api/user/${prefs.userId}/register-face`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faceDescriptor: descriptorArray }),
      });
      const data = await res.json();

      if (data.success) {
        setFaceStep("success");
        setHasFace(true);
        savePreferences({ ...prefs, faceRegistered: true });
        stopCamera();
        setTimeout(() => {
          setShowFaceCapture(false);
          setFaceStep("ready");
        }, 2000);
      } else {
        setFaceError(data.message || "Failed to register face");
        setFaceStep("error");
      }
    } catch (err: any) {
      setFaceError("Face registration failed. Please try again.");
      setFaceStep("error");
    }
  };

  const handlePrintQr = () => {
    if (!qrDataUrl) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Suvidha Pass - QR Code</title>
      <style>
        body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .card { border: 2px solid #1d4ed8; border-radius: 16px; padding: 32px; max-width: 360px; text-align: center; }
        .header { background: #1d4ed8; color: white; padding: 12px; border-radius: 10px; margin-bottom: 20px; }
        .header h1 { font-size: 20px; margin: 0; }
        .header p { font-size: 12px; margin: 4px 0 0; opacity: 0.9; }
        .qr-img { width: 200px; height: 200px; margin: 16px auto; }
        .name { font-size: 18px; font-weight: bold; margin: 12px 0 4px; }
        .id { font-size: 14px; color: #555; margin-bottom: 8px; font-family: monospace; }
        .footer { font-size: 11px; color: #888; margin-top: 16px; border-top: 1px solid #ddd; padding-top: 12px; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>
      <div class="card">
        <div class="header"><h1>SUVIDHA</h1><p>Citizen Services Kiosk</p></div>
        <img class="qr-img" src="${qrDataUrl}" alt="QR Code" />
        <div class="name">${qrUserName || prefs.userName || "Citizen"}</div>
        <div class="id">${qrSuvidhaId || "N/A"}</div>
        <div class="footer">
          Scan this QR code at any Suvidha Kiosk for instant login.<br/>
          Keep this card safe. Do not share with others.
        </div>
      </div></body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  return (
    <KioskLayout>
      <div className="space-y-5 max-w-3xl mx-auto w-full">
        <div>
          <h2 className="text-3xl font-bold font-heading">{t("profile_settings", lang)}</h2>
          <p className="text-lg text-muted-foreground mt-1">{t("profile_desc", lang)}</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 border border-border shadow-sm"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <User className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold">{prefs.userName || t("welcome_citizen", lang)}</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" />
                {qrSuvidhaId || (prefs.userId ? `ID: ${prefs.userId.slice(0, 8)}...` : "Guest")} - {t("session_secure", lang)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-3 bg-secondary/30 rounded-xl">
              <p className="text-2xl font-bold text-primary">{stats.requests}</p>
              <p className="text-xs text-muted-foreground">Total Requests</p>
            </div>
            <div className="text-center p-3 bg-secondary/30 rounded-xl">
              <p className="text-2xl font-bold text-amber-600">{stats.activeRequests}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
            <div className="text-center p-3 bg-secondary/30 rounded-xl">
              <p className="text-2xl font-bold text-blue-600">{stats.documents}</p>
              <p className="text-xs text-muted-foreground">Documents</p>
            </div>
            <div className="text-center p-3 bg-secondary/30 rounded-xl">
              <p className="text-2xl font-bold text-rose-600">{stats.unreadNotifs}</p>
              <p className="text-xs text-muted-foreground">Unread</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl p-6 border border-border shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Your Suvidha Pass (QR Code)</h3>
            <QrCode className="w-5 h-5 text-muted-foreground" />
          </div>

          {qrDataUrl ? (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="bg-white border-2 border-primary/20 rounded-2xl p-4 shadow-sm">
                <img src={qrDataUrl} alt="Your QR Code" className="w-48 h-48" />
              </div>
              <div className="flex-1 space-y-3 text-center sm:text-left">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-bold text-lg">{qrUserName || prefs.userName || "Citizen"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Suvidha ID</p>
                  <p className="font-mono font-bold text-lg text-primary">{qrSuvidhaId || "N/A"}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Show this QR code at any Suvidha Kiosk for instant login. Keep it safe.
                </p>
                <Button
                  className="gap-2 rounded-xl"
                  onClick={handlePrintQr}
                >
                  <Printer className="w-4 h-4" />
                  Print Suvidha Pass
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <QrCode className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No QR code available for your account.</p>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 border border-border shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">{t("login_methods", lang)}</h3>
            <Shield className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Scan className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="font-medium block">Face Login</span>
                <span className="text-xs text-muted-foreground">
                  {faceLoading ? "Checking..." : hasFace ? "Face ID registered" : "Not registered"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {faceLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : hasFace ? (
                  <>
                    <span className="text-xs text-green-600 bg-green-100 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs"
                      onClick={handleOpenFaceCapture}
                    >
                      Re-scan
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    className="rounded-full text-xs gap-1"
                    onClick={handleOpenFaceCapture}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Register Face
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Phone className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="font-medium block">Mobile OTP</span>
                <span className="text-xs text-muted-foreground">Verified</span>
              </div>
              <span className="text-xs text-green-600 bg-green-100 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Active
              </span>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <QrCode className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="font-medium block">QR Code</span>
                <span className="text-xs text-muted-foreground">{qrToken ? "Available" : "Not available"}</span>
              </div>
              {qrToken ? (
                <span className="text-xs text-green-600 bg-green-100 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Active
                </span>
              ) : (
                <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full font-medium">
                  Inactive
                </span>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl p-6 border border-border shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">{t("current_language", lang)} & Accessibility</h3>
            <Settings className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-3 gap-4 p-4 bg-secondary/30 rounded-xl">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t("current_language", lang)}</p>
              <p className="font-bold flex items-center justify-center gap-1">
                <Globe className="w-4 h-4" /> {prefs.language}
              </p>
            </div>
            <div className="text-center border-x border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t("text_size", lang)}</p>
              <p className="font-bold capitalize">{prefs.fontSize}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t("high_contrast", lang)}</p>
              <p className="font-bold">{prefs.highContrast ? t("on", lang) : t("off", lang)}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Change language and accessibility settings using the controls in the header above.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 border border-border shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">{t("linked_services", lang)}</h3>
            <Link2 className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {linkedServices.map((service) => {
              const SvcIcon = serviceIcons[service.id] || Zap;
              const color = serviceColors[service.id] || "text-gray-600 bg-gray-100";
              return (
                <div key={service.id} className="rounded-xl border border-border overflow-hidden">
                  <div className="flex items-center gap-3 p-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                      <SvcIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium block">{service.name}</span>
                      {service.connected && service.consumerId && (
                        <span className="text-xs text-muted-foreground font-mono">ID: {service.consumerId}</span>
                      )}
                    </div>
                    {service.connected ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-green-600 font-medium flex items-center gap-1 bg-green-100 px-3 py-1 rounded-full">
                          <Check className="w-3.5 h-3.5" /> Connected
                        </span>
                        {disconnectConfirm === service.id ? (
                          <div className="flex gap-1">
                            <Button size="sm" variant="destructive" className="rounded-full text-xs" onClick={() => handleDisconnect(service.id)}>
                              Confirm
                            </Button>
                            <Button size="sm" variant="outline" className="rounded-full text-xs" onClick={() => setDisconnectConfirm(null)}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDisconnectConfirm(service.id)}
                            className="w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors"
                            title="Disconnect"
                          >
                            <Unlink className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ) : connectingId === service.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={connectInput}
                          onChange={(e) => setConnectInput(e.target.value)}
                          placeholder="Enter Consumer ID"
                          className="px-3 py-1.5 rounded-lg border border-border text-sm w-40 focus:outline-none focus:ring-2 focus:ring-primary"
                          autoFocus
                        />
                        <Button size="sm" className="rounded-full text-xs" onClick={() => handleConnect(service.id)} disabled={!connectInput.trim()}>
                          Link
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-full text-xs" onClick={() => { setConnectingId(null); setConnectInput(""); }}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" className="rounded-full text-sm" onClick={() => setConnectingId(service.id)}>
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl p-6 border border-border shadow-sm"
        >
          <h3 className="text-xl font-bold mb-4">Session Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between p-2 rounded-lg bg-secondary/30">
              <span className="text-muted-foreground">Session Status</span>
              <span className="font-medium text-green-600 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> Active & Secure
              </span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-secondary/30">
              <span className="text-muted-foreground">Kiosk Location</span>
              <span className="font-medium">Suvidha Kendra, Raipur</span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-secondary/30">
              <span className="text-muted-foreground">Auto-Logout</span>
              <span className="font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> After 5 minutes of inactivity
              </span>
            </div>
          </div>
        </motion.div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
          <p className="font-medium">Need Help?</p>
          <p className="text-blue-600">Call toll-free: 1800-233-4455 | Use the AI Assistant (bottom-right button) for instant help</p>
        </div>
      </div>

      <AnimatePresence>
        {showFaceCapture && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 relative"
            >
              <button
                onClick={handleCloseFaceCapture}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-2xl font-bold text-center mb-4">
                {hasFace ? "Re-scan Face" : "Register Face ID"}
              </h3>

              {faceStep === "success" ? (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                  </div>
                  <p className="text-xl font-bold text-green-700">Face Registered Successfully!</p>
                  <p className="text-muted-foreground mt-1">You can now use Face Login at any Suvidha Kiosk.</p>
                </div>
              ) : (
                <>
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-video mb-4">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover mirror"
                      style={{ transform: "scaleX(-1)" }}
                    />
                    {(faceStep === "capturing" || faceStep === "processing") && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="text-center text-white">
                          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-2" />
                          <p className="text-lg font-medium">
                            {faceStep === "capturing" ? "Capturing..." : "Processing face data..."}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {faceError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-center mb-4 flex items-center justify-center gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">{faceError}</span>
                    </div>
                  )}

                  <p className="text-center text-muted-foreground text-sm mb-4">
                    Look directly at the camera. Keep your face centered and well-lit.
                  </p>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 h-14 text-lg rounded-xl"
                      onClick={handleCloseFaceCapture}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 h-14 text-lg rounded-xl gap-2"
                      onClick={handleCaptureFace}
                      disabled={faceStep === "capturing" || faceStep === "processing"}
                    >
                      {faceStep === "capturing" || faceStep === "processing" ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                      ) : (
                        <><Camera className="w-5 h-5" /> Capture Face</>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </KioskLayout>
  );
}
