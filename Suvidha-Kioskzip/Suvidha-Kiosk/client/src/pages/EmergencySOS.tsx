import KioskLayout from "@/components/layout/KioskLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ShieldAlert, Phone, Flame, Siren, Zap, Droplets,
  ArrowLeft, CheckCircle2, Loader2, Clock, AlertTriangle, X
} from "lucide-react";
import { loadPreferences } from "@/lib/userPreferences";

interface EmergencyService {
  id: string;
  name: string;
  number: string;
  icon: typeof Phone;
  color: string;
  bg: string;
  description: string;
}

interface EmergencyLog {
  id: number;
  serviceType: string;
  notes: string | null;
  status: string;
  createdAt: string;
}

const emergencyServices: EmergencyService[] = [
  { id: "police", name: "Police", number: "100", icon: ShieldAlert, color: "text-blue-700", bg: "bg-blue-600", description: "Crime, theft, harassment, or any law & order issue" },
  { id: "ambulance", name: "Ambulance", number: "108", icon: Siren, color: "text-red-700", bg: "bg-red-600", description: "Medical emergency, accident, or health crisis" },
  { id: "fire", name: "Fire Brigade", number: "101", icon: Flame, color: "text-orange-700", bg: "bg-orange-600", description: "Fire, explosion, or building collapse" },
  { id: "gas_leak", name: "Gas Leak", number: "1906", icon: Flame, color: "text-amber-700", bg: "bg-amber-600", description: "LPG gas leak or cylinder emergency" },
  { id: "electricity", name: "Electricity", number: "1912", icon: Zap, color: "text-yellow-700", bg: "bg-yellow-500", description: "Electric shock, wire down, transformer fire" },
  { id: "water", name: "Water Emergency", number: "1800-233-4455", icon: Droplets, color: "text-cyan-700", bg: "bg-cyan-600", description: "Water main burst, contamination, or flooding" },
];

export default function EmergencySOS() {
  const [, navigate] = useLocation();
  const [selectedService, setSelectedService] = useState<EmergencyService | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [referenceId, setReferenceId] = useState("");
  const [history, setHistory] = useState<EmergencyLog[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const userId = loadPreferences().userId || "guest";

  useEffect(() => {
    fetch(`/api/emergency/history?userId=${userId}`)
      .then(r => r.json())
      .then(data => { if (data.success) setHistory(data.history); })
      .catch(() => {});
  }, [sent]);

  const handleSendAlert = async () => {
    if (!selectedService) return;
    setLoading(true);
    try {
      const res = await fetch("/api/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          serviceType: selectedService.id,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReferenceId(data.referenceId);
        setSent(true);
      }
    } catch {}
    setLoading(false);
  };

  const resetForm = () => {
    setSelectedService(null);
    setNotes("");
    setSent(false);
    setReferenceId("");
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
    catch { return d; }
  };

  return (
    <KioskLayout>
      <div className="h-full flex flex-col max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="lg" className="rounded-full h-12 w-12 p-0" onClick={() => {
            if (showHistory) { setShowHistory(false); return; }
            if (selectedService && !sent) { resetForm(); return; }
            navigate("/dashboard");
          }}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex-1">
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-red-600" />
              Emergency Services
            </h2>
            <p className="text-muted-foreground">Quick access to emergency helplines</p>
          </div>
          {history.length > 0 && (
            <Button variant="outline" className="rounded-xl gap-2" onClick={() => setShowHistory(!showHistory)}>
              <Clock className="w-4 h-4" />
              History ({history.length})
            </Button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {showHistory ? (
            <motion.div key="hist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 flex-1">
              <h3 className="text-xl font-bold">Emergency History</h3>
              {history.map(log => {
                const svc = emergencyServices.find(s => s.id === log.serviceType);
                return (
                  <div key={log.id} className="bg-white rounded-xl p-4 border shadow-sm flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${svc?.bg || "bg-gray-500"}`}>
                      {svc ? <svc.icon className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{svc?.name || log.serviceType}</p>
                      {log.notes && <p className="text-sm text-muted-foreground">{log.notes}</p>}
                      <span className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</span>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">EMG-{log.id}</span>
                  </div>
                );
              })}
            </motion.div>
          ) : sent ? (
            <motion.div key="sent" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex items-center justify-center">
              <div className="bg-white rounded-3xl p-10 shadow-xl border text-center max-w-lg">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-14 h-14 text-green-600" />
                </div>
                <h3 className="text-3xl font-bold text-green-700 mb-2">Alert Sent!</h3>
                <p className="text-lg text-muted-foreground mb-2">
                  Your {selectedService?.name} emergency alert has been registered.
                </p>
                <div className="bg-red-50 rounded-xl p-4 border border-red-200 my-4">
                  <p className="text-lg font-bold text-red-700">
                    Call {selectedService?.number} for immediate help
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">Reference: <span className="font-mono font-bold">{referenceId}</span></p>
                <div className="flex gap-3 mt-6">
                  <Button className="flex-1 h-14 rounded-xl text-lg" onClick={() => navigate("/dashboard")}>Dashboard</Button>
                  <Button variant="outline" className="flex-1 h-14 rounded-xl text-lg" onClick={resetForm}>New Alert</Button>
                </div>
              </div>
            </motion.div>
          ) : !selectedService ? (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
                <p className="text-red-800 font-medium">In case of life-threatening emergency, please call the number directly. This kiosk logs your emergency for follow-up.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {emergencyServices.map((svc, i) => (
                  <motion.button
                    key={svc.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedService(svc)}
                    className={`${svc.bg} rounded-2xl p-6 text-white text-left shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-95`}
                  >
                    <svc.icon className="w-10 h-10 mb-3" />
                    <h3 className="text-2xl font-bold">{svc.name}</h3>
                    <p className="text-white/80 text-sm mt-1">{svc.description}</p>
                    <div className="mt-3 flex items-center gap-2 bg-white/20 rounded-xl px-3 py-2 w-fit">
                      <Phone className="w-4 h-4" />
                      <span className="font-bold text-lg">{svc.number}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="detail" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 space-y-4">
              <div className={`${selectedService.bg} rounded-2xl p-6 text-white`}>
                <div className="flex items-center gap-4">
                  <selectedService.icon className="w-12 h-12" />
                  <div>
                    <h3 className="text-2xl font-bold">{selectedService.name} Emergency</h3>
                    <p className="text-white/80">Helpline: {selectedService.number}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-4">
                <div>
                  <label className="block font-medium mb-2">Describe your emergency (optional)</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Location, situation details, number of people affected..."
                    className="rounded-xl min-h-[100px]"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="h-14 flex-1 rounded-xl text-lg" onClick={resetForm}>Cancel</Button>
                <Button className="h-14 flex-1 rounded-xl text-lg bg-red-600 hover:bg-red-700 gap-2 shadow-lg" onClick={handleSendAlert} disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldAlert className="w-5 h-5" />}
                  Send Emergency Alert
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </KioskLayout>
  );
}
