import KioskLayout from "@/components/layout/KioskLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  MessageSquare, Search, RefreshCw, Plus, ArrowLeft, ArrowRight,
  CheckCircle2, Loader2, Clock, AlertTriangle, FileText,
  Camera, Upload, XCircle, CircleAlert, Phone, MapPin,
  Calendar, ChevronRight, RotateCcw, Eye, Printer
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { t } from "@/lib/translations";
import { loadPreferences } from "@/lib/userPreferences";

type MainAction = "menu" | "register" | "check_status" | "reopen";
type RegisterStep = "category" | "details" | "review" | "success";

const serviceCategories = [
  { id: "electricity", icon: "⚡", label: "Electricity", items: ["Power Outage", "Billing Issue", "Meter Fault", "Load Change", "New Connection"] },
  { id: "gas", icon: "🔥", label: "Gas", items: ["Cylinder Delivery", "Leakage", "Billing Issue", "Subsidy Issue", "New Connection"] },
  { id: "water", icon: "💧", label: "Water", items: ["No Water Supply", "Leakage", "Dirty Water", "Low Pressure", "New Connection"] },
  { id: "waste", icon: "🗑️", label: "Waste", items: ["Missed Pickup", "Overflowing Bins", "Bulk Waste", "Street Sweeping"] },
  { id: "infrastructure", icon: "🏗️", label: "Infrastructure", items: ["Pothole", "Streetlight", "Drainage", "Public Toilet", "Park"] },
  { id: "other", icon: "📋", label: "Other / General", items: ["Corruption", "Staff Behavior", "Delay in Service", "Wrong Charges", "Other"] },
];

type Complaint = {
  id: string; service: string; category: string; description: string;
  status: "submitted" | "in_progress" | "resolved" | "closed" | "rejected";
  urgency: string; filedDate: string; lastUpdate: string;
  assignedTo: string; sla: string; resolution?: string;
  timeline: { date: string; status: string; note: string }[];
};

function mapApiToComplaint(apiData: any): Complaint {
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";
  const slaHours = apiData.slaDeadline ? Math.round((new Date(apiData.slaDeadline).getTime() - new Date(apiData.createdAt).getTime()) / (1000 * 60 * 60)) : 72;
  const timeline = (apiData.timeline || []).map((t: any) => ({
    date: new Date(t.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }),
    status: t.status === "submitted" ? "Submitted" : t.status === "in_progress" ? "In Progress" : t.status === "resolved" ? "Resolved" : t.status === "closed" ? "Closed" : t.status === "assigned" ? "Assigned" : "Update",
    note: t.note || "",
  })).reverse();
  return {
    id: apiData.complaintId,
    service: apiData.service || "",
    category: apiData.category || "",
    description: apiData.description || "",
    status: (apiData.status === "in_progress" ? "in_progress" : apiData.status) as Complaint["status"],
    urgency: apiData.urgency || "normal",
    filedDate: formatDate(apiData.createdAt),
    lastUpdate: formatDate(apiData.updatedAt || apiData.createdAt),
    assignedTo: apiData.assignedTo || "Pending Assignment",
    sla: `${slaHours} hours`,
    resolution: apiData.status === "resolved" || apiData.status === "closed" ? (timeline.find((t: any) => t.status === "Resolved" || t.status === "Closed")?.note || undefined) : undefined,
    timeline,
  };
}

const menuItems = [
  { id: "register" as MainAction, icon: Plus, color: "bg-green-600", label: "register_new_complaint", desc: "register_complaint_desc" },
  { id: "check_status" as MainAction, icon: Search, color: "bg-blue-600", label: "check_complaint_status", desc: "check_status_desc" },
  { id: "reopen" as MainAction, icon: RotateCcw, color: "bg-orange-600", label: "reopen_ticket", desc: "reopen_ticket_desc" },
];

export default function ComplaintCenter() {
  const [, setLocation] = useLocation();
  const [action, setAction] = useState<MainAction>("menu");
  const [lang, setLang] = useState(() => loadPreferences().language);

  const [registerStep, setRegisterStep] = useState<RegisterStep>("category");
  const [selectedService, setSelectedService] = useState("");
  const [selectedSubcat, setSelectedSubcat] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("normal");
  const [contactPhone, setContactPhone] = useState("");
  const [location, setLocationText] = useState("");
  const [pinnedCoords, setPinnedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [generatedId, setGeneratedId] = useState("");

  const [searchId, setSearchId] = useState("");
  const [searchError, setSearchError] = useState("");
  const [foundComplaint, setFoundComplaint] = useState<Complaint | null>(null);
  const [searching, setSearching] = useState(false);

  const [reopenId, setReopenId] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [reopenError, setReopenError] = useState("");
  const [reopenComplaint, setReopenComplaint] = useState<Complaint | null>(null);
  const [reopenSearching, setReopenSearching] = useState(false);
  const [reopenSuccess, setReopenSuccess] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.language) setLang(detail.language);
    };
    window.addEventListener("prefs-changed", handler);
    return () => window.removeEventListener("prefs-changed", handler);
  }, []);

  useEffect(() => {
    if (!showMap || !mapRef.current) return;
    if (leafletMapRef.current) return;

    const loadLeaflet = async () => {
      const L = await import("leaflet");
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
      await new Promise(r => setTimeout(r, 100));

      const map = L.map(mapRef.current!, { zoomControl: true }).setView([21.2514, 81.6296], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const pinIcon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });

      map.on("click", (e: any) => {
        const { lat, lng } = e.latlng;
        setPinnedCoords({ lat, lng });
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
        }
      });

      leafletMapRef.current = map;
      setTimeout(() => map.invalidateSize(), 200);
    };

    loadLeaflet();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [showMap]);

  const resetAll = () => {
    setAction("menu");
    setRegisterStep("category");
    setSelectedService("");
    setSelectedSubcat("");
    setDescription("");
    setUrgency("normal");
    setContactPhone("");
    setLocationText("");
    setPinnedCoords(null);
    setShowMap(false);
    setGeneratedId("");
    setSearchId("");
    setSearchError("");
    setFoundComplaint(null);
    setReopenId("");
    setReopenReason("");
    setReopenError("");
    setReopenComplaint(null);
    setReopenSuccess(false);
  };

  const handleSearch = async () => {
    setSearchError("");
    setFoundComplaint(null);
    setSearching(true);
    const normalized = searchId.trim();
    try {
      const res = await fetch(`/api/complaints/${encodeURIComponent(normalized)}`);
      const data = await res.json();
      if (data.success && data.complaint) {
        setFoundComplaint(mapApiToComplaint(data.complaint));
      } else {
        setSearchError(t("complaint_not_found", lang));
      }
    } catch {
      setSearchError(t("complaint_not_found", lang));
    } finally {
      setSearching(false);
    }
  };

  const handleReopenSearch = async () => {
    setReopenError("");
    setReopenComplaint(null);
    setReopenSearching(true);
    const normalized = reopenId.trim();
    try {
      const res = await fetch(`/api/complaints/${encodeURIComponent(normalized)}`);
      const data = await res.json();
      if (data.success && data.complaint) {
        const mapped = mapApiToComplaint(data.complaint);
        if (mapped.status === "resolved" || mapped.status === "closed") {
          setReopenComplaint(mapped);
        } else {
          setReopenError(t("ticket_not_eligible", lang));
        }
      } else {
        setReopenError(t("complaint_not_found", lang));
      }
    } catch {
      setReopenError(t("complaint_not_found", lang));
    } finally {
      setReopenSearching(false);
    }
  };

  const handleReopen = async () => {
    if (!reopenComplaint) return;
    setReopenSearching(true);
    try {
      const res = await fetch(`/api/complaints/${encodeURIComponent(reopenComplaint.id)}/reopen`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reopenReason }),
      });
      const data = await res.json();
      if (data.success) {
        setReopenSuccess(true);
      } else {
        setReopenError(data.message || "Failed to reopen complaint");
      }
    } catch {
      setReopenError("Failed to reopen complaint");
    } finally {
      setReopenSearching(false);
    }
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmitComplaint = async () => {
    setSubmitting(true);
    const userId = sessionStorage.getItem("userId") || "1";
    const serviceLabel = serviceCategories.find(c => c.id === selectedService)?.label || selectedService;
    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          service: serviceLabel,
          category: selectedSubcat,
          description,
          urgency,
          locationAddress: location || undefined,
          latitude: pinnedCoords?.lat || undefined,
          longitude: pinnedCoords?.lng || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.complaint) {
        setGeneratedId(data.complaint.complaintId);
        setRegisterStep("success");
      } else {
        alert(data.message || "Failed to submit complaint");
      }
    } catch {
      alert("Failed to submit complaint. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintReceipt = (complaintId: string, service: string, category: string) => {
    const printDiv = document.createElement("div");
    printDiv.className = "print-area";
    printDiv.innerHTML = `
      <div style="max-width: 500px; margin: 0 auto; font-family: Arial, sans-serif; padding: 24px;">
        <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 16px; margin-bottom: 16px;">
          <h1 style="font-size: 22px; font-weight: bold; margin: 0;">SUVIDHA COMPLAINT RECEIPT</h1>
          <p style="font-size: 12px; color: #666; margin: 4px 0 0 0;">Government of Chhattisgarh</p>
        </div>
        <div style="margin-bottom: 12px;">
          <p style="font-size: 12px; color: #666; margin: 0;">${t("complaint_id", lang)}</p>
          <p style="font-size: 18px; font-weight: bold; margin: 2px 0 0 0;">#${complaintId}</p>
        </div>
        <div style="margin-bottom: 12px;">
          <p style="font-size: 12px; color: #666; margin: 0;">${t("service_type", lang)}</p>
          <p style="font-size: 16px; font-weight: bold; margin: 2px 0 0 0;">${service}</p>
        </div>
        <div style="margin-bottom: 12px;">
          <p style="font-size: 12px; color: #666; margin: 0;">${t("category", lang)}</p>
          <p style="font-size: 16px; font-weight: bold; margin: 2px 0 0 0;">${category}</p>
        </div>
        <div style="margin-bottom: 12px;">
          <p style="font-size: 12px; color: #666; margin: 0;">${t("description", lang)}</p>
          <p style="font-size: 14px; margin: 2px 0 0 0;">${description || "N/A"}</p>
        </div>
        <div style="margin-bottom: 16px;">
          <p style="font-size: 12px; color: #666; margin: 0;">Date / Time</p>
          <p style="font-size: 14px; margin: 2px 0 0 0;">${new Date().toLocaleString()}</p>
        </div>
        <hr style="border: 1px solid #ccc; margin: 16px 0;" />
        <p style="font-size: 12px; color: #666; text-align: center;">${t("sms_updates", lang)}</p>
      </div>
    `;
    document.body.appendChild(printDiv);
    window.print();
    document.body.removeChild(printDiv);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted": return "bg-blue-100 text-blue-700 border-blue-200";
      case "in_progress": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "resolved": return "bg-green-100 text-green-700 border-green-200";
      case "closed": return "bg-gray-100 text-gray-700 border-gray-200";
      case "rejected": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "submitted": return t("status_submitted", lang);
      case "in_progress": return t("status_in_progress", lang);
      case "resolved": return t("status_resolved", lang);
      case "closed": return t("status_closed", lang);
      case "rejected": return t("status_rejected", lang);
      default: return status;
    }
  };

  const getTimelineIcon = (status: string) => {
    switch (status) {
      case "Submitted": return <FileText className="w-4 h-4" />;
      case "Assigned": return <ChevronRight className="w-4 h-4" />;
      case "In Progress": return <Loader2 className="w-4 h-4" />;
      case "Update": return <Clock className="w-4 h-4" />;
      case "Resolved": return <CheckCircle2 className="w-4 h-4" />;
      case "Closed": return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getTimelineColor = (status: string) => {
    switch (status) {
      case "Submitted": return "bg-blue-500";
      case "Assigned": return "bg-indigo-500";
      case "In Progress": return "bg-yellow-500";
      case "Update": return "bg-orange-500";
      case "Resolved": return "bg-green-500";
      case "Closed": return "bg-gray-500";
      default: return "bg-gray-400";
    }
  };

  const renderMenu = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-10 h-10 text-purple-600" />
        </div>
        <h2 className="text-3xl font-bold">{t("complaint_center", lang)}</h2>
        <p className="text-lg text-muted-foreground mt-2">{t("complaint_center_desc", lang)}</p>
      </div>
      <div className="grid grid-cols-3 gap-5">
        {menuItems.map((item) => (
          <motion.button
            key={item.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setAction(item.id)}
            className="bg-white rounded-3xl p-6 border-2 border-transparent hover:border-primary/20 shadow-md hover:shadow-xl transition-all text-left"
          >
            <div className={`w-14 h-14 rounded-2xl ${item.color} text-white flex items-center justify-center mb-4 shadow-md`}>
              <item.icon className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold mb-1">{t(item.label as any, lang)}</h3>
            <p className="text-sm text-muted-foreground">{t(item.desc as any, lang)}</p>
          </motion.button>
        ))}
      </div>

      <div className="bg-white rounded-3xl p-6 border border-border shadow-sm">
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Phone className="w-5 h-5 text-primary" />
          {t("helpline_info", lang)}
        </h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-secondary/50 rounded-xl p-3">
            <p className="font-bold">1800-233-4455</p>
            <p className="text-muted-foreground">{t("toll_free", lang)}</p>
          </div>
          <div className="bg-secondary/50 rounded-xl p-3">
            <p className="font-bold">1906</p>
            <p className="text-muted-foreground">{t("gas_emergency", lang)}</p>
          </div>
          <div className="bg-secondary/50 rounded-xl p-3">
            <p className="font-bold">112</p>
            <p className="text-muted-foreground">{t("general_emergency", lang)}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRegister = () => {
    if (registerStep === "category") {
      return (
        <div className="space-y-6">
          {!selectedService ? (
            <>
              <h3 className="text-2xl font-bold">{t("select_service_type", lang)}</h3>
              <div className="grid grid-cols-3 gap-4">
                {serviceCategories.map((cat) => (
                  <motion.button
                    key={cat.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedService(cat.id)}
                    className="bg-white rounded-2xl p-5 border-2 border-transparent hover:border-primary/30 shadow-sm hover:shadow-md transition-all text-left"
                  >
                    <span className="text-3xl mb-2 block">{cat.icon}</span>
                    <h4 className="text-lg font-bold">{cat.label}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{cat.items.length} {t("issue_types", lang)}</p>
                  </motion.button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-2">
                <Button variant="ghost" size="sm" onClick={() => { setSelectedService(""); setSelectedSubcat(""); }}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <h3 className="text-2xl font-bold">{t("select_issue", lang)}</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {serviceCategories.find(c => c.id === selectedService)?.items.map((item) => (
                  <motion.button
                    key={item}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setSelectedSubcat(item); setRegisterStep("details"); }}
                    className={`bg-white rounded-2xl p-5 border-2 text-left text-lg font-medium transition-all ${
                      selectedSubcat === item ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                    }`}
                  >
                    {item}
                  </motion.button>
                ))}
              </div>
            </>
          )}
        </div>
      );
    }

    if (registerStep === "details") {
      return (
        <div className="space-y-6 bg-white p-8 rounded-3xl border border-border">
          <h3 className="text-2xl font-bold">{t("complaint_details", lang)}</h3>
          <div className="bg-secondary/50 rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">{serviceCategories.find(c => c.id === selectedService)?.icon}</span>
            <div>
              <p className="font-bold">{serviceCategories.find(c => c.id === selectedService)?.label}</p>
              <p className="text-sm text-muted-foreground">{selectedSubcat}</p>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-lg">{t("describe_issue", lang)} *</Label>
            <Textarea
              placeholder={t("describe_placeholder", lang)}
              className="min-h-[120px] text-lg p-4 rounded-xl border-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-lg"><MapPin className="w-4 h-4 inline mr-1" />{t("location_address", lang)}</Label>
              <Input
                placeholder={t("enter_location", lang)}
                className="h-14 text-lg rounded-xl border-2"
                value={location}
                onChange={(e) => setLocationText(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-lg"><Phone className="w-4 h-4 inline mr-1" />{t("contact_phone", lang)}</Label>
              <Input
                placeholder={t("enter_phone", lang)}
                className="h-14 text-lg rounded-xl border-2"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-lg"><MapPin className="w-4 h-4 inline mr-1" />{t("pin_location", lang)}</Label>
              <Button
                variant={showMap ? "default" : "outline"}
                size="sm"
                className="rounded-xl gap-2"
                onClick={() => setShowMap(!showMap)}
              >
                <MapPin className="w-4 h-4" />
                {showMap ? t("location_pinned", lang) : t("tap_map_pin", lang)}
              </Button>
            </div>
            {pinnedCoords && (
              <p className="text-sm text-green-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                {t("location_pinned", lang)}: {pinnedCoords.lat.toFixed(5)}, {pinnedCoords.lng.toFixed(5)}
              </p>
            )}
            {showMap && (
              <div
                ref={mapRef}
                className="w-full h-[300px] rounded-xl border-2 border-border overflow-hidden z-0"
                style={{ position: "relative" }}
              />
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-lg">{t("urgency_level", lang)}</Label>
            <RadioGroup value={urgency} onValueChange={setUrgency} className="flex gap-4">
              <div className="flex items-center space-x-2 bg-secondary/50 p-4 rounded-xl flex-1 border-2 border-transparent data-[state=checked]:border-green-500 cursor-pointer">
                <RadioGroupItem value="normal" id="u1" />
                <Label htmlFor="u1" className="text-lg cursor-pointer">{t("normal", lang)}</Label>
              </div>
              <div className="flex items-center space-x-2 bg-secondary/50 p-4 rounded-xl flex-1 border-2 border-transparent data-[state=checked]:border-orange-500 cursor-pointer">
                <RadioGroupItem value="high" id="u2" />
                <Label htmlFor="u2" className="text-lg cursor-pointer">{t("high", lang)}</Label>
              </div>
              <div className="flex items-center space-x-2 bg-secondary/50 p-4 rounded-xl flex-1 border-2 border-transparent data-[state=checked]:border-red-500 cursor-pointer">
                <RadioGroupItem value="emergency" id="u3" />
                <Label htmlFor="u3" className="text-lg cursor-pointer text-red-600 font-bold">{t("emergency", lang)}</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-lg">{t("evidence", lang)}</Label>
            <div className="flex gap-4">
              <Button variant="outline" className="h-20 flex-1 rounded-xl gap-2 text-lg border-2 border-dashed">
                <Camera className="w-7 h-7" />
                {t("take_photo", lang)}
              </Button>
              <Button variant="outline" className="h-20 flex-1 rounded-xl gap-2 text-lg border-2 border-dashed">
                <Upload className="w-7 h-7" />
                {t("upload_file", lang)}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (registerStep === "review") {
      return (
        <div className="space-y-6 bg-white p-8 rounded-3xl border border-border">
          <h3 className="text-2xl font-bold">{t("review_complaint", lang)}</h3>
          <div className="grid grid-cols-2 gap-6 text-lg">
            <div>
              <p className="text-muted-foreground text-sm">{t("service_type", lang)}</p>
              <p className="font-bold">{serviceCategories.find(c => c.id === selectedService)?.label}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">{t("category", lang)}</p>
              <p className="font-bold">{selectedSubcat}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground text-sm">{t("description", lang)}</p>
              <p className="font-medium">{description || "—"}</p>
            </div>
            {location && (
              <div>
                <p className="text-muted-foreground text-sm">{t("location_address", lang)}</p>
                <p className="font-medium">{location}</p>
              </div>
            )}
            {pinnedCoords && (
              <div>
                <p className="text-muted-foreground text-sm">{t("pin_location", lang)}</p>
                <p className="font-medium text-green-600">{pinnedCoords.lat.toFixed(5)}, {pinnedCoords.lng.toFixed(5)}</p>
              </div>
            )}
            {contactPhone && (
              <div>
                <p className="text-muted-foreground text-sm">{t("contact_phone", lang)}</p>
                <p className="font-medium">{contactPhone}</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground text-sm">{t("urgency", lang)}</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold uppercase ${
                urgency === "emergency" ? "bg-red-100 text-red-700" :
                urgency === "high" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
              }`}>
                {urgency}
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (registerStep === "success") {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-8 text-center bg-white rounded-3xl border border-border">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center text-green-600"
          >
            <CheckCircle2 className="w-16 h-16" />
          </motion.div>
          <div>
            <h2 className="text-3xl font-bold mb-2">{t("complaint_registered", lang)}</h2>
            <p className="text-xl text-muted-foreground">{t("complaint_id", lang)}: <span className="font-mono font-bold text-foreground">#{generatedId}</span></p>
          </div>
          <div className="p-4 bg-blue-50 rounded-xl max-w-md border border-blue-200">
            <p className="text-blue-800 font-medium">{t("sms_updates", lang)}</p>
          </div>
          <div className="p-4 bg-secondary/50 rounded-xl max-w-md">
            <p className="text-sm text-muted-foreground">{t("track_with_id", lang)}</p>
          </div>
          <div className="flex gap-4 w-full max-w-md px-8">
            <Button className="flex-1 h-14 text-lg rounded-xl" onClick={() => setLocation("/dashboard")}>
              {t("go_dashboard", lang)}
            </Button>
            <Button variant="outline" className="flex-1 h-14 text-lg rounded-xl gap-2" onClick={() => handlePrintReceipt(generatedId, selectedService, selectedSubcat)}>
              <Printer className="w-5 h-5" />
              {t("print_receipt", lang)}
            </Button>
          </div>
          <Button variant="ghost" className="text-lg" onClick={resetAll}>
            {t("file_another", lang)}
          </Button>
        </div>
      );
    }

    return null;
  };

  const renderCheckStatus = () => (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Search className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold">{t("check_complaint_status", lang)}</h2>
        <p className="text-muted-foreground mt-1">{t("enter_complaint_id", lang)}</p>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-border shadow-sm">
        <div className="flex gap-3">
          <Input
            placeholder="SUV-2026-XXXX"
            className="h-16 text-xl rounded-xl border-2 font-mono flex-1"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchId.trim() && handleSearch()}
          />
          <Button
            className="h-16 px-8 text-lg rounded-xl"
            onClick={handleSearch}
            disabled={!searchId.trim() || searching}
          >
            {searching ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-3">{t("sample_ids", lang)}: SUV-2026-1001, SUV-2026-1002, SUV-2026-1003, SUV-2026-1004</p>
      </div>

      {searchError && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center gap-3">
          <XCircle className="w-6 h-6 text-red-500 shrink-0" />
          <p className="text-red-700 text-lg">{searchError}</p>
        </motion.div>
      )}

      {foundComplaint && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="bg-white rounded-3xl p-6 border border-border shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold">#{foundComplaint.id}</h3>
                <p className="text-muted-foreground">{foundComplaint.service} — {foundComplaint.category}</p>
              </div>
              <span className={`px-4 py-2 rounded-full text-sm font-bold border ${getStatusColor(foundComplaint.status)}`}>
                {getStatusLabel(foundComplaint.status)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-secondary/50 rounded-xl p-3">
                <p className="text-xs text-muted-foreground">{t("filed_date", lang)}</p>
                <p className="font-bold">{foundComplaint.filedDate}</p>
              </div>
              <div className="bg-secondary/50 rounded-xl p-3">
                <p className="text-xs text-muted-foreground">{t("last_update", lang)}</p>
                <p className="font-bold">{foundComplaint.lastUpdate}</p>
              </div>
              <div className="bg-secondary/50 rounded-xl p-3">
                <p className="text-xs text-muted-foreground">{t("assigned_to", lang)}</p>
                <p className="font-bold text-sm">{foundComplaint.assignedTo}</p>
              </div>
              <div className="bg-secondary/50 rounded-xl p-3">
                <p className="text-xs text-muted-foreground">{t("sla_time", lang)}</p>
                <p className="font-bold">{foundComplaint.sla}</p>
              </div>
            </div>

            <div className="bg-secondary/30 rounded-xl p-4 mb-4">
              <p className="text-sm text-muted-foreground mb-1">{t("description", lang)}</p>
              <p className="font-medium">{foundComplaint.description}</p>
            </div>

            {foundComplaint.resolution && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-green-700 font-bold mb-1">{t("resolution", lang)}</p>
                <p className="text-green-800">{foundComplaint.resolution}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12 rounded-xl gap-2" onClick={() => handlePrintReceipt(foundComplaint.id, foundComplaint.service, foundComplaint.category)}>
                <Printer className="w-5 h-5" />
                {t("print_receipt", lang)}
              </Button>
              {(foundComplaint.status === "resolved" || foundComplaint.status === "closed") && (
                <Button variant="outline" className="flex-1 h-12 rounded-xl gap-2 border-orange-300 text-orange-700 hover:bg-orange-50" onClick={() => {
                  setAction("reopen");
                  setReopenId(foundComplaint.id);
                  setReopenComplaint(foundComplaint);
                }}>
                  <RotateCcw className="w-5 h-5" />
                  {t("reopen_ticket", lang)}
                </Button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-border shadow-sm">
            <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              {t("complaint_timeline", lang)}
            </h4>
            <div className="relative">
              {foundComplaint.timeline.map((entry, idx) => (
                <div key={idx} className="flex gap-4 mb-6 last:mb-0">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full ${getTimelineColor(entry.status)} text-white flex items-center justify-center shrink-0`}>
                      {getTimelineIcon(entry.status)}
                    </div>
                    {idx < foundComplaint.timeline.length - 1 && (
                      <div className="w-0.5 h-full bg-gray-200 mt-1 min-h-[20px]" />
                    )}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{entry.status}</span>
                      <span className="text-xs text-muted-foreground">{entry.date}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{entry.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );

  const renderReopen = () => (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <RotateCcw className="w-8 h-8 text-orange-600" />
        </div>
        <h2 className="text-2xl font-bold">{t("reopen_ticket", lang)}</h2>
        <p className="text-muted-foreground mt-1">{t("reopen_ticket_info", lang)}</p>
      </div>

      {!reopenComplaint && !reopenSuccess && (
        <div className="bg-white rounded-3xl p-6 border border-border shadow-sm">
          <Label className="text-lg mb-3 block">{t("enter_complaint_id", lang)}</Label>
          <div className="flex gap-3">
            <Input
              placeholder="SUV-2026-XXXX"
              className="h-16 text-xl rounded-xl border-2 font-mono flex-1"
              value={reopenId}
              onChange={(e) => setReopenId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && reopenId.trim() && handleReopenSearch()}
            />
            <Button
              className="h-16 px-8 text-lg rounded-xl"
              onClick={handleReopenSearch}
              disabled={!reopenId.trim() || reopenSearching}
            >
              {reopenSearching ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-3">{t("reopen_eligible_note", lang)}</p>
        </div>
      )}

      {reopenError && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
          <p className="text-red-700 text-lg">{reopenError}</p>
        </motion.div>
      )}

      {reopenComplaint && !reopenSuccess && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="bg-white rounded-3xl p-6 border border-border shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold">#{reopenComplaint.id}</h3>
                <p className="text-muted-foreground">{reopenComplaint.service} — {reopenComplaint.category}</p>
              </div>
              <span className={`px-4 py-2 rounded-full text-sm font-bold border ${getStatusColor(reopenComplaint.status)}`}>
                {getStatusLabel(reopenComplaint.status)}
              </span>
            </div>

            {reopenComplaint.resolution && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-green-700 font-bold mb-1">{t("previous_resolution", lang)}</p>
                <p className="text-green-800">{reopenComplaint.resolution}</p>
              </div>
            )}

            <div className="space-y-4">
              <Label className="text-lg">{t("reopen_reason", lang)} *</Label>
              <Textarea
                placeholder={t("reopen_reason_placeholder", lang)}
                className="min-h-[120px] text-lg p-4 rounded-xl border-2"
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
              />
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1 h-14 text-lg rounded-xl" onClick={() => { setReopenComplaint(null); setReopenId(""); setReopenReason(""); }}>
                {t("cancel", lang)}
              </Button>
              <Button
                className="flex-1 h-14 text-lg rounded-xl bg-orange-600 hover:bg-orange-700 gap-2"
                onClick={handleReopen}
                disabled={!reopenReason.trim() || reopenSearching}
              >
                {reopenSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <RotateCcw className="w-5 h-5" />}
                {t("confirm_reopen", lang)}
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {reopenSuccess && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-12 space-y-6 text-center bg-white rounded-3xl border border-border">
          <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
            <RefreshCw className="w-12 h-12" />
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-2">{t("ticket_reopened", lang)}</h2>
            <p className="text-xl text-muted-foreground">{t("complaint_id", lang)}: <span className="font-mono font-bold text-foreground">#{reopenId}</span></p>
          </div>
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl max-w-md">
            <p className="text-orange-800 font-medium">{t("reopen_confirmation_msg", lang)}</p>
          </div>
          <div className="flex gap-4 w-full max-w-md px-8">
            <Button className="flex-1 h-14 text-lg rounded-xl" onClick={() => setLocation("/dashboard")}>
              {t("go_dashboard", lang)}
            </Button>
            <Button variant="outline" className="flex-1 h-14 text-lg rounded-xl" onClick={() => {
              setAction("check_status");
              setSearchId(reopenId);
              setReopenSuccess(false);
            }}>
              {t("view_status", lang)}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );

  const registerSteps: RegisterStep[] = ["category", "details", "review", "success"];
  const registerStepIndex = registerSteps.indexOf(registerStep);

  return (
    <KioskLayout>
      <div className="h-full flex flex-col max-w-5xl mx-auto w-full">
        {action !== "menu" && (
          <div className="mb-6">
            <Button variant="ghost" className="gap-2 text-lg mb-4" onClick={resetAll}>
              <ArrowLeft className="w-5 h-5" />
              {t("back_to_menu", lang)}
            </Button>
          </div>
        )}

        {action === "register" && registerStep !== "success" && (
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              {["category", "details", "review", "success"].map((step, idx) => (
                <span
                  key={step}
                  className={`text-sm font-bold uppercase tracking-wider ${idx <= registerStepIndex ? "text-primary" : "text-muted-foreground"}`}
                >
                  {t(step as any, lang)}
                </span>
              ))}
            </div>
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${((registerStepIndex + 1) / 4) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${action}-${registerStep}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {action === "menu" && renderMenu()}
              {action === "register" && renderRegister()}
              {action === "check_status" && renderCheckStatus()}
              {action === "reopen" && renderReopen()}
            </motion.div>
          </AnimatePresence>
        </div>

        {action === "register" && registerStep !== "success" && registerStep !== "category" && (
          <div className="flex justify-between pt-6 mt-auto">
            <Button
              variant="outline"
              size="lg"
              className="h-16 px-8 text-xl rounded-2xl gap-2"
              onClick={() => {
                if (registerStep === "details") setRegisterStep("category");
                else if (registerStep === "review") setRegisterStep("details");
              }}
            >
              <ArrowLeft className="w-6 h-6" />
              {t("back", lang)}
            </Button>
            <Button
              size="lg"
              className="h-16 px-12 text-xl rounded-2xl gap-2 shadow-lg shadow-primary/20"
              onClick={() => {
                if (registerStep === "details") setRegisterStep("review");
                else if (registerStep === "review") handleSubmitComplaint();
              }}
              disabled={registerStep === "details" && !description.trim()}
            >
              {registerStep === "review" ? t("submit_complaint", lang) : t("next_step", lang)}
              <ArrowRight className="w-6 h-6" />
            </Button>
          </div>
        )}
      </div>
    </KioskLayout>
  );
}
