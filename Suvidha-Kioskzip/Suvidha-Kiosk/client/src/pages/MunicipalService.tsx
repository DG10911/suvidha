import KioskLayout from "@/components/layout/KioskLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import {
  Droplets, Trash2, Construction, CreditCard, Plus, AlertTriangle,
  ArrowLeft, ArrowRight, CheckCircle2, Loader2, Search, Landmark,
  CircleAlert, Wrench, Lightbulb, Layers
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { t } from "@/lib/translations";
import { loadPreferences } from "@/lib/userPreferences";
import PaymentFlow from "@/components/PaymentFlow";

type Tab = "water" | "waste" | "infrastructure";
type WaterAction = "menu" | "pay_bill" | "new_connection" | "leakage" | "quality";
type WasteAction = "menu" | "missed_pickup" | "bulk_waste" | "schedule";
type InfraAction = "menu" | "pothole" | "streetlight" | "drainage";

const mockWaterBill = { name: "Priya Sharma", address: "12, Civil Lines, Bilaspur", amount: 850, consumerId: "WTR-445678", period: "Jan-Feb 2026", usage: "12,500 Litres", dueDate: "25 Mar 2026" };

function getInitialTab(): Tab {
  const path = window.location.pathname;
  if (path.includes("/service/waste")) return "waste";
  if (path.includes("/service/infrastructure")) return "infrastructure";
  return "water";
}

export default function MunicipalService() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>(getInitialTab);
  const [waterAction, setWaterAction] = useState<WaterAction>("menu");
  const [wasteAction, setWasteAction] = useState<WasteAction>("menu");
  const [infraAction, setInfraAction] = useState<InfraAction>("menu");
  const [loading, setLoading] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [waterIdFound, setWaterIdFound] = useState(false);
  const [waterId, setWaterId] = useState("");
  const [lang, setLang] = useState(() => loadPreferences().language);
  const [complaintId, setComplaintId] = useState("");
  const [submitError, setSubmitError] = useState("");

  const [leakageForm, setLeakageForm] = useState({ location: "", description: "", severity: "" });
  const [newConnForm, setNewConnForm] = useState({ name: "", address: "", phone: "", property: "residential" });
  const [wasteForm, setWasteForm] = useState({ area: "", description: "", type: "" });
  const [infraForm, setInfraForm] = useState({ location: "", description: "", type: "" });

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.language) setLang(detail.language);
    };
    window.addEventListener("prefs-changed", handler);
    return () => window.removeEventListener("prefs-changed", handler);
  }, []);

  useEffect(() => {
    const userId = loadPreferences().userId || "1";
    fetch(`/api/linked-services/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.services) {
          const waterService = data.services.find((s: any) => s.serviceName === "Water");
          if (waterService && waterService.consumerId) {
            setWaterId(waterService.consumerId);
          }
        }
      })
      .catch(err => console.error("Failed to fetch linked services:", err));
  }, []);

  const resetAll = () => {
    setWaterAction("menu");
    setWasteAction("menu");
    setInfraAction("menu");
    setFormSubmitted(false);
    setShowPayment(false);
    setWaterIdFound(false);
    setWaterId("");
  };

  const handleFormSubmit = async () => {
    setLoading(true);
    try {
      const userId = loadPreferences().userId || "1";
      let service = "Municipal";
      let category = "";
      let description = "";
      let urgency = "medium";

      if (tab === "water") {
        switch (waterAction) {
          case "leakage":
            category = "Water Leakage";
            description = leakageForm.description;
            break;
          case "new_connection":
            category = "New Water Connection";
            description = `New water connection for ${newConnForm.name}`;
            break;
          case "quality":
            category = "Water Quality";
            description = "Water quality complaint";
            break;
        }
      } else if (tab === "waste") {
        category = `Waste - ${wasteAction}`;
        description = wasteForm.description;
      } else if (tab === "infrastructure") {
        category = `Infrastructure - ${infraAction}`;
        description = infraForm.description;
      }

      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, service, category, description, urgency }),
      });
      const data = await res.json();
      if (data.success) {
        setComplaintId(data.complaint.complaintId);
        setFormSubmitted(true);
      } else {
        setSubmitError(data.message || "Failed to submit request. Please try again.");
      }
    } catch (err) {
      console.error("Failed to submit complaint:", err);
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleWaterLookup = () => {
    setLoading(true);
    setTimeout(() => {
      setWaterIdFound(true);
      setLoading(false);
    }, 1500);
  };

  const tabs = [
    { id: "water" as Tab, icon: Droplets, label: "water_services", color: "text-blue-600 border-blue-500 bg-blue-50" },
    { id: "waste" as Tab, icon: Trash2, label: "waste_management", color: "text-green-600 border-green-500 bg-green-50" },
    { id: "infrastructure" as Tab, icon: Construction, label: "urban_infrastructure", color: "text-slate-600 border-slate-500 bg-slate-50" },
  ];

  if (formSubmitted) {
    return (
      <KioskLayout>
        <div className="h-full flex flex-col max-w-4xl mx-auto w-full justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-12 space-y-8 text-center bg-white rounded-3xl border border-border">
            <div className="w-28 h-28 bg-green-100 rounded-full flex items-center justify-center text-green-600">
              <CheckCircle2 className="w-14 h-14" />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-2">{t("request_submitted", lang)}</h2>
              <p className="text-xl text-muted-foreground">{t("complaint_id", lang)} <span className="font-mono font-bold">#{complaintId}</span></p>
            </div>
            <p className="text-lg text-muted-foreground max-w-sm">{t("sms_updates", lang)}</p>
            <div className="flex gap-4">
              <Button className="h-14 px-8 text-lg rounded-xl" onClick={() => setLocation("/dashboard")}>{t("go_dashboard", lang)}</Button>
              <Button variant="outline" className="h-14 px-8 text-lg rounded-xl" onClick={resetAll}>{t("more_services", lang)}</Button>
            </div>
          </motion.div>
        </div>
      </KioskLayout>
    );
  }

  const renderWater = () => {
    if (showPayment) {
      return (
        <PaymentFlow
          amount={mockWaterBill.amount}
          billDetails={[
            { label: t("consumer_id", lang), value: mockWaterBill.consumerId },
            { label: t("name", lang), value: mockWaterBill.name },
            { label: "Billing Period", value: mockWaterBill.period },
            { label: "Water Usage", value: mockWaterBill.usage },
            { label: t("due_date", lang), value: mockWaterBill.dueDate },
          ]}
          lang={lang}
          onComplete={() => setLocation("/dashboard")}
          onBack={() => setShowPayment(false)}
        />
      );
    }

    switch (waterAction) {
      case "menu":
        return (
          <div className="grid grid-cols-2 gap-4">
            {[
              { id: "pay_bill" as WaterAction, icon: CreditCard, color: "bg-blue-500", label: "pay_water_bill" },
              { id: "new_connection" as WaterAction, icon: Plus, color: "bg-teal-500", label: "new_water_connection" },
              { id: "leakage" as WaterAction, icon: CircleAlert, color: "bg-red-500", label: "report_water_leak" },
              { id: "quality" as WaterAction, icon: Droplets, color: "bg-purple-500", label: "water_quality_issue" },
            ].map((item) => (
              <button key={item.id} onClick={() => setWaterAction(item.id)} className="bg-white rounded-2xl p-6 border-2 border-transparent hover:border-primary/30 shadow-md hover:shadow-xl transition-all text-left group">
                <div className={`w-12 h-12 rounded-xl ${item.color} text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold group-hover:text-primary">{t(item.label as any, lang)}</h3>
              </button>
            ))}
          </div>
        );
      case "pay_bill":
        if (!waterIdFound) {
          return (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-center">{t("pay_water_bill", lang)}</h3>
              <div className="bg-white rounded-2xl p-6 border border-border space-y-4">
                <div className="flex gap-3">
                  <Input value={waterId} onChange={(e) => setWaterId(e.target.value)} placeholder="Water Consumer ID" className="flex-1 h-14 text-xl text-center font-mono rounded-xl border-2" />
                  <Button size="lg" className="h-14 px-6 rounded-xl gap-2" onClick={handleWaterLookup} disabled={waterId.length < 3 || loading}>
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    {t("fetch_bill", lang)}
                  </Button>
                </div>
              </div>
              <Button variant="outline" className="h-12 px-6 text-base rounded-xl gap-2" onClick={() => setWaterAction("menu")}>
                <ArrowLeft className="w-4 h-4" />{t("back", lang)}
              </Button>
            </div>
          );
        }
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-center">{t("bill_details", lang)}</h3>
            <div className="bg-white rounded-2xl p-6 border border-border">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-secondary/30 rounded-xl p-3"><p className="text-xs text-muted-foreground">{t("name", lang)}</p><p className="font-bold">{mockWaterBill.name}</p></div>
                <div className="bg-secondary/30 rounded-xl p-3"><p className="text-xs text-muted-foreground">{t("consumer_id", lang)}</p><p className="font-bold font-mono">{mockWaterBill.consumerId}</p></div>
                <div className="bg-secondary/30 rounded-xl p-3"><p className="text-xs text-muted-foreground">Usage</p><p className="font-bold">{mockWaterBill.usage}</p></div>
                <div className="bg-primary/5 border-2 border-primary/20 rounded-xl p-3"><p className="text-xs text-muted-foreground">{t("total_amount", lang)}</p><p className="font-bold text-2xl text-primary">₹{mockWaterBill.amount}</p></div>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" className="h-12 px-6 rounded-xl gap-2" onClick={() => { setWaterIdFound(false); setWaterId(""); }}>
                <ArrowLeft className="w-4 h-4" />{t("back", lang)}
              </Button>
              <Button className="h-12 px-8 rounded-xl gap-2 shadow-lg" onClick={() => setShowPayment(true)}>
                {t("proceed_pay", lang)}<ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );
      case "new_connection":
        return (
          <div className="space-y-5">
            <h3 className="text-2xl font-bold text-center">{t("new_water_connection", lang)}</h3>
            <div className="bg-white rounded-2xl p-6 border border-border space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>{t("full_name", lang)}</Label><Input value={newConnForm.name} onChange={(e) => setNewConnForm({...newConnForm, name: e.target.value})} className="h-12 rounded-xl" /></div>
                <div className="space-y-2"><Label>{t("phone_number", lang)}</Label><Input value={newConnForm.phone} onChange={(e) => setNewConnForm({...newConnForm, phone: e.target.value})} className="h-12 rounded-xl" maxLength={10} /></div>
              </div>
              <div className="space-y-2"><Label>{t("address", lang)}</Label><Textarea value={newConnForm.address} onChange={(e) => setNewConnForm({...newConnForm, address: e.target.value})} className="rounded-xl" /></div>
              <div className="space-y-2">
                <Label>{t("property_type", lang)}</Label>
                <div className="grid grid-cols-3 gap-3">
                  {["residential", "commercial", "industrial"].map((pt) => (
                    <button key={pt} onClick={() => setNewConnForm({...newConnForm, property: pt})} className={`p-3 rounded-xl border-2 text-center font-medium capitalize ${newConnForm.property === pt ? "border-primary bg-primary/5" : "border-border"}`}>{pt}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" className="h-12 px-6 rounded-xl gap-2" onClick={() => setWaterAction("menu")}><ArrowLeft className="w-4 h-4" />{t("back", lang)}</Button>
              <Button className="h-12 px-8 rounded-xl gap-2 shadow-lg" onClick={handleFormSubmit} disabled={!newConnForm.name || !newConnForm.address || loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{t("submit_application", lang)}<ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );
      case "leakage":
      case "quality":
        return (
          <div className="space-y-5">
            <h3 className="text-2xl font-bold text-center">{waterAction === "leakage" ? t("report_water_leak", lang) : t("water_quality_issue", lang)}</h3>
            <div className="bg-white rounded-2xl p-6 border border-border space-y-4">
              <div className="space-y-2"><Label>{t("location", lang)}</Label><Input value={leakageForm.location} onChange={(e) => setLeakageForm({...leakageForm, location: e.target.value})} className="h-12 rounded-xl" placeholder="Area / Street" /></div>
              <div className="space-y-2"><Label>{t("describe_issue", lang)}</Label><Textarea value={leakageForm.description} onChange={(e) => setLeakageForm({...leakageForm, description: e.target.value})} className="rounded-xl min-h-[100px]" /></div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" className="h-12 px-6 rounded-xl gap-2" onClick={() => setWaterAction("menu")}><ArrowLeft className="w-4 h-4" />{t("back", lang)}</Button>
              <Button className="h-12 px-8 rounded-xl gap-2 shadow-lg" onClick={handleFormSubmit} disabled={!leakageForm.location || loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{t("submit_complaint", lang)}<ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderWaste = () => {
    switch (wasteAction) {
      case "menu":
        return (
          <div className="grid grid-cols-2 gap-4">
            {[
              { id: "missed_pickup" as WasteAction, icon: Trash2, color: "bg-red-500", label: "missed_pickup" },
              { id: "bulk_waste" as WasteAction, icon: Layers, color: "bg-amber-500", label: "bulk_waste_request" },
              { id: "schedule" as WasteAction, icon: AlertTriangle, color: "bg-green-500", label: "overflowing_bins" },
            ].map((item) => (
              <button key={item.id} onClick={() => setWasteAction(item.id)} className="bg-white rounded-2xl p-6 border-2 border-transparent hover:border-primary/30 shadow-md hover:shadow-xl transition-all text-left group">
                <div className={`w-12 h-12 rounded-xl ${item.color} text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold group-hover:text-primary">{t(item.label as any, lang)}</h3>
              </button>
            ))}
          </div>
        );
      default:
        return (
          <div className="space-y-5">
            <h3 className="text-2xl font-bold text-center">
              {wasteAction === "missed_pickup" ? t("missed_pickup", lang) : wasteAction === "bulk_waste" ? t("bulk_waste_request", lang) : t("overflowing_bins", lang)}
            </h3>
            <div className="bg-white rounded-2xl p-6 border border-border space-y-4">
              <div className="space-y-2"><Label>{t("affected_area", lang)}</Label><Input value={wasteForm.area} onChange={(e) => setWasteForm({...wasteForm, area: e.target.value})} className="h-12 rounded-xl" placeholder="Colony / Ward" /></div>
              {wasteAction === "bulk_waste" && (
                <div className="space-y-2">
                  <Label>{t("waste_type", lang)}</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {["Construction", "Garden", "Furniture"].map((wt) => (
                      <button key={wt} onClick={() => setWasteForm({...wasteForm, type: wt})} className={`p-3 rounded-xl border-2 text-center font-medium ${wasteForm.type === wt ? "border-primary bg-primary/5" : "border-border"}`}>{wt}</button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2"><Label>{t("describe_issue", lang)}</Label><Textarea value={wasteForm.description} onChange={(e) => setWasteForm({...wasteForm, description: e.target.value})} className="rounded-xl min-h-[100px]" /></div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" className="h-12 px-6 rounded-xl gap-2" onClick={() => setWasteAction("menu")}><ArrowLeft className="w-4 h-4" />{t("back", lang)}</Button>
              <Button className="h-12 px-8 rounded-xl gap-2 shadow-lg" onClick={handleFormSubmit} disabled={!wasteForm.area || loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{t("submit_complaint", lang)}<ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );
    }
  };

  const renderInfra = () => {
    switch (infraAction) {
      case "menu":
        return (
          <div className="grid grid-cols-3 gap-4">
            {[
              { id: "pothole" as InfraAction, icon: Construction, color: "bg-orange-500", label: "report_pothole" },
              { id: "streetlight" as InfraAction, icon: Lightbulb, color: "bg-yellow-500", label: "streetlight_issue" },
              { id: "drainage" as InfraAction, icon: Wrench, color: "bg-slate-500", label: "drainage_issue" },
            ].map((item) => (
              <button key={item.id} onClick={() => setInfraAction(item.id)} className="bg-white rounded-2xl p-5 border-2 border-transparent hover:border-primary/30 shadow-md hover:shadow-xl transition-all text-center group">
                <div className={`w-12 h-12 rounded-xl ${item.color} text-white flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold group-hover:text-primary">{t(item.label as any, lang)}</h3>
              </button>
            ))}
          </div>
        );
      default:
        return (
          <div className="space-y-5">
            <h3 className="text-2xl font-bold text-center">
              {infraAction === "pothole" ? t("report_pothole", lang) : infraAction === "streetlight" ? t("streetlight_issue", lang) : t("drainage_issue", lang)}
            </h3>
            <div className="bg-white rounded-2xl p-6 border border-border space-y-4">
              <div className="space-y-2"><Label>{t("location", lang)}</Label><Input value={infraForm.location} onChange={(e) => setInfraForm({...infraForm, location: e.target.value})} className="h-12 rounded-xl" placeholder="Road name / Landmark" /></div>
              <div className="space-y-2"><Label>{t("describe_issue", lang)}</Label><Textarea value={infraForm.description} onChange={(e) => setInfraForm({...infraForm, description: e.target.value})} className="rounded-xl min-h-[100px]" /></div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-sm text-amber-700">
                <AlertTriangle className="w-4 h-4" />
                {t("photo_recommended", lang)}
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" className="h-12 px-6 rounded-xl gap-2" onClick={() => setInfraAction("menu")}><ArrowLeft className="w-4 h-4" />{t("back", lang)}</Button>
              <Button className="h-12 px-8 rounded-xl gap-2 shadow-lg" onClick={handleFormSubmit} disabled={!infraForm.location || loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{t("submit_complaint", lang)}<ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <KioskLayout>
      <div className="h-full flex flex-col max-w-4xl mx-auto w-full space-y-5">
        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{submitError}</span>
            <Button variant="ghost" size="sm" className="ml-auto text-red-700" onClick={() => setSubmitError("")}>Dismiss</Button>
          </div>
        )}
        <div className="text-center">
          <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-2 text-teal-600">
            <Landmark className="w-7 h-7" />
          </div>
          <h2 className="text-3xl font-bold">{t("municipal_services", lang)}</h2>
        </div>

        <div className="flex gap-2 bg-secondary/50 p-1.5 rounded-2xl">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              onClick={() => { setTab(tb.id); resetAll(); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-base transition-all ${
                tab === tb.id ? `${tb.color} border-2 shadow-sm` : "text-muted-foreground hover:bg-white/50 border-2 border-transparent"
              }`}
            >
              <tb.icon className="w-5 h-5" />
              {t(tb.label as any, lang)}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={`${tab}-${waterAction}-${wasteAction}-${infraAction}-${showPayment}-${waterIdFound}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1">
            {tab === "water" && renderWater()}
            {tab === "waste" && renderWaste()}
            {tab === "infrastructure" && renderInfra()}
          </motion.div>
        </AnimatePresence>
      </div>
    </KioskLayout>
  );
}
