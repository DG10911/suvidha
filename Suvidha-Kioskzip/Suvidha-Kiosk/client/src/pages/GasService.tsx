import KioskLayout from "@/components/layout/KioskLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Flame, CreditCard, Truck, AlertTriangle, Plus, ArrowLeft, ArrowRight,
  CheckCircle2, Loader2, CircleAlert, Phone, Search, FileText, Package
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { t } from "@/lib/translations";
import { loadPreferences } from "@/lib/userPreferences";
import PaymentFlow from "@/components/PaymentFlow";

type ServiceAction = "menu" | "cylinder_booking" | "leakage" | "new_connection" | "delivery_tracking" | "subsidy" | "pay_bill";
type BookingStep = "select" | "confirm" | "payment";

const cylinderTypes = [
  { id: "14.2kg", name: "14.2 kg Domestic", price: 903, icon: "🔵" },
  { id: "19kg", name: "19 kg Commercial", price: 1850, icon: "🔴" },
  { id: "5kg", name: "5 kg FTL", price: 435, icon: "🟢" },
];

const mockDeliveries = [
  { id: "DEL-8834", type: "14.2 kg Domestic", status: "Out for Delivery", eta: "Today, 2:00 PM", driver: "Ramesh", phone: "+91 98765xxxxx" },
  { id: "DEL-8790", type: "14.2 kg Domestic", status: "Delivered", eta: "Feb 01, 2026", driver: "Suresh", phone: "+91 98765xxxxx" },
];

const menuItems = [
  { id: "cylinder_booking" as ServiceAction, icon: Package, color: "bg-orange-500", label: "book_cylinder" },
  { id: "pay_bill" as ServiceAction, icon: CreditCard, color: "bg-blue-500", label: "pay_gas_bill" },
  { id: "leakage" as ServiceAction, icon: CircleAlert, color: "bg-red-600", label: "report_leakage", emergency: true },
  { id: "new_connection" as ServiceAction, icon: Plus, color: "bg-green-500", label: "new_gas_connection" },
  { id: "delivery_tracking" as ServiceAction, icon: Truck, color: "bg-indigo-500", label: "track_delivery" },
  { id: "subsidy" as ServiceAction, icon: FileText, color: "bg-purple-500", label: "subsidy_status" },
];

export default function GasService() {
  const [, setLocation] = useLocation();
  const [action, setAction] = useState<ServiceAction>("menu");
  const [bookingStep, setBookingStep] = useState<BookingStep>("select");
  const [selectedCylinder, setSelectedCylinder] = useState<typeof cylinderTypes[0] | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [lang, setLang] = useState(() => loadPreferences().language);
  const [complaintId, setComplaintId] = useState("");
  const [submitError, setSubmitError] = useState("");

  const [gasId, setGasId] = useState("");
  const [gasIdValid, setGasIdValid] = useState(false);
  const [newConnForm, setNewConnForm] = useState({ name: "", address: "", phone: "", aadhaar: "", type: "domestic" });
  const [leakageForm, setLeakageForm] = useState({ location: "", description: "", severity: "" });
  const [subsidyData, setSubsidyData] = useState<{ name: string; lpgId: string; subsidy: string; lastCredit: string; bank: string } | null>(null);

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
          const gasService = data.services.find((s: any) => s.serviceName === "Gas");
          if (gasService && gasService.consumerId) {
            setGasId(gasService.consumerId);
          }
        }
      })
      .catch(err => console.error("Failed to fetch linked services:", err));
  }, []);

  const resetToMenu = () => {
    setAction("menu");
    setBookingStep("select");
    setSelectedCylinder(null);
    setFormSubmitted(false);
    setGasId("");
    setGasIdValid(false);
    setSubsidyData(null);
  };

  const handleFormSubmit = async () => {
    setLoading(true);
    setSubmitError("");
    try {
      const userId = loadPreferences().userId || "1";
      let service = "Gas";
      let category = "";
      let description = "";
      let urgency = "medium";

      switch (action) {
        case "leakage":
          category = "Leakage Emergency";
          description = leakageForm.description;
          urgency = "high";
          break;
        case "new_connection":
          category = "New Connection";
          description = `New gas connection for ${newConnForm.name} at ${newConnForm.address}`;
          break;
        case "cylinder_booking":
          category = "Cylinder Booking";
          description = `Booking ${quantity}x ${selectedCylinder?.name}`;
          break;
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

  const handleSubsidyLookup = () => {
    setLoading(true);
    setTimeout(() => {
      setSubsidyData({
        name: "Rajesh Kumar",
        lpgId: gasId || "LPG-445566",
        subsidy: "₹203.77 per cylinder",
        lastCredit: "₹203.77 on 15 Jan 2026",
        bank: "SBI A/c ending 4532",
      });
      setLoading(false);
    }, 1500);
  };

  const handleGasLookup = () => {
    setLoading(true);
    setTimeout(() => {
      setGasIdValid(true);
      setLoading(false);
    }, 1500);
  };

  const renderContent = () => {
    if (formSubmitted) {
      return (
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
            <Button variant="outline" className="h-14 px-8 text-lg rounded-xl" onClick={resetToMenu}>{t("more_services", lang)}</Button>
          </div>
        </motion.div>
      );
    }

    switch (action) {
      case "menu":
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-orange-600">
                <Flame className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold">{t("gas_services", lang)}</h2>
              <p className="text-lg text-muted-foreground">{t("select_gas_service", lang)}</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setAction(item.id)}
                  className={`bg-white rounded-2xl p-5 border-2 border-transparent hover:border-primary/30 shadow-md hover:shadow-xl transition-all text-center group relative ${item.emergency ? "hover:border-red-300" : ""}`}
                >
                  {item.emergency && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">{t("emergency", lang)}</span>}
                  <div className={`w-14 h-14 rounded-xl ${item.color} text-white flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-md`}>
                    <item.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold group-hover:text-primary transition-colors">{t(item.label as any, lang)}</h3>
                </button>
              ))}
            </div>
          </div>
        );

      case "cylinder_booking":
        if (bookingStep === "select") {
          return (
            <div className="space-y-6">
              <div className="text-center mb-4">
                <h2 className="text-3xl font-bold">{t("book_cylinder", lang)}</h2>
                <p className="text-lg text-muted-foreground">{t("select_cylinder_type", lang)}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {cylinderTypes.map((cyl) => (
                  <button key={cyl.id} onClick={() => setSelectedCylinder(cyl)} className={`bg-white rounded-2xl p-6 border-2 text-center transition-all ${selectedCylinder?.id === cyl.id ? "border-primary bg-primary/5 shadow-lg" : "border-border hover:border-primary/30"}`}>
                    <span className="text-4xl block mb-3">{cyl.icon}</span>
                    <h3 className="text-lg font-bold">{cyl.name}</h3>
                    <p className="text-2xl font-bold text-primary mt-2">₹{cyl.price}</p>
                  </button>
                ))}
              </div>
              {selectedCylinder && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl p-6 border border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-medium">{t("quantity", lang)}</span>
                    <div className="flex items-center gap-4">
                      <Button variant="outline" size="sm" className="h-10 w-10 rounded-xl" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</Button>
                      <span className="text-2xl font-bold w-8 text-center">{quantity}</span>
                      <Button variant="outline" size="sm" className="h-10 w-10 rounded-xl" onClick={() => setQuantity(Math.min(5, quantity + 1))}>+</Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t pt-4">
                    <span className="text-lg font-bold">{t("total_amount", lang)}</span>
                    <span className="text-3xl font-bold text-primary">₹{(selectedCylinder.price * quantity).toLocaleString("en-IN")}</span>
                  </div>
                </motion.div>
              )}
              <div className="flex justify-between">
                <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-2xl gap-2" onClick={resetToMenu}>
                  <ArrowLeft className="w-5 h-5" />{t("back", lang)}
                </Button>
                <Button size="lg" className="h-14 px-10 text-lg rounded-2xl gap-2 shadow-lg" onClick={() => setBookingStep("payment")} disabled={!selectedCylinder}>
                  {t("proceed_pay", lang)}<ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          );
        }
        if (bookingStep === "payment" && selectedCylinder) {
          return (
            <PaymentFlow
              amount={selectedCylinder.price * quantity}
              billDetails={[
                { label: t("cylinder_type", lang), value: selectedCylinder.name },
                { label: t("quantity", lang), value: String(quantity) },
                { label: t("unit_price", lang), value: `₹${selectedCylinder.price}` },
              ]}
              lang={lang}
              onComplete={() => setLocation("/dashboard")}
              onBack={() => setBookingStep("select")}
            />
          );
        }
        return null;

      case "pay_bill":
        if (!gasIdValid) {
          return (
            <div className="space-y-6">
              <div className="text-center mb-4">
                <h2 className="text-3xl font-bold">{t("pay_gas_bill", lang)}</h2>
                <p className="text-lg text-muted-foreground">{t("enter_gas_id", lang)}</p>
              </div>
              <div className="bg-white rounded-3xl p-8 border border-border shadow-sm space-y-6">
                <div className="flex gap-3">
                  <Input value={gasId} onChange={(e) => setGasId(e.target.value)} placeholder="LPG Consumer Number" className="flex-1 h-16 text-2xl text-center font-mono rounded-xl border-2" />
                  <Button size="lg" className="h-16 px-8 text-lg rounded-xl gap-2" onClick={handleGasLookup} disabled={gasId.length < 4 || loading}>
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    {t("fetch_bill", lang)}
                  </Button>
                </div>
              </div>
              <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-2xl gap-2" onClick={resetToMenu}>
                <ArrowLeft className="w-5 h-5" />{t("back", lang)}
              </Button>
            </div>
          );
        }
        return (
          <PaymentFlow
            amount={1245}
            billDetails={[
              { label: t("consumer_id", lang), value: gasId },
              { label: t("name", lang), value: "Rajesh Kumar" },
              { label: "Connection Type", value: "Domestic PNG" },
              { label: "Billing Period", value: "Jan-Feb 2026" },
              { label: "Units (SCM)", value: "45.2" },
            ]}
            lang={lang}
            onComplete={() => setLocation("/dashboard")}
            onBack={() => { setGasIdValid(false); setGasId(""); }}
          />
        );

      case "leakage":
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-red-600 animate-pulse">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold text-red-700">{t("report_leakage", lang)}</h2>
              <p className="text-lg text-muted-foreground">{t("gas_emergency_desc", lang)}</p>
            </div>
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 flex items-start gap-4">
              <Phone className="w-8 h-8 text-red-600 mt-1" />
              <div>
                <p className="font-bold text-red-800 text-lg">{t("emergency_helpline", lang)}</p>
                <p className="text-3xl font-bold text-red-600 font-mono">1906</p>
                <p className="text-sm text-red-600 mt-1">{t("available_24x7", lang)}</p>
              </div>
            </div>
            <div className="bg-white rounded-3xl p-6 border border-border shadow-sm space-y-5">
              <div className="space-y-2">
                <Label className="text-base">{t("location", lang)}</Label>
                <Input value={leakageForm.location} onChange={(e) => setLeakageForm({...leakageForm, location: e.target.value})} className="h-14 text-lg rounded-xl" placeholder="Address where leak is detected" />
              </div>
              <div className="space-y-2">
                <Label className="text-base">{t("severity", lang)}</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[{v: "mild", c: "border-yellow-400 bg-yellow-50"}, {v: "moderate", c: "border-orange-400 bg-orange-50"}, {v: "severe", c: "border-red-400 bg-red-50"}].map(({v, c}) => (
                    <button key={v} onClick={() => setLeakageForm({...leakageForm, severity: v})} className={`p-4 rounded-xl border-2 text-center font-bold capitalize transition-all ${leakageForm.severity === v ? c : "border-border hover:border-primary/30"}`}>{v}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-base">{t("describe_issue", lang)}</Label>
                <Textarea value={leakageForm.description} onChange={(e) => setLeakageForm({...leakageForm, description: e.target.value})} className="text-lg rounded-xl min-h-[100px]" placeholder="Describe the smell/situation" />
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-2xl gap-2" onClick={resetToMenu}>
                <ArrowLeft className="w-5 h-5" />{t("back", lang)}
              </Button>
              <Button size="lg" className="h-14 px-10 text-lg rounded-2xl gap-2 shadow-lg bg-red-600 hover:bg-red-700" onClick={handleFormSubmit} disabled={!leakageForm.location || !leakageForm.severity || loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {t("report_now", lang)}<ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        );

      case "new_connection":
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h2 className="text-3xl font-bold">{t("new_gas_connection", lang)}</h2>
              <p className="text-lg text-muted-foreground">{t("fill_connection_form", lang)}</p>
            </div>
            <div className="bg-white rounded-3xl p-6 border border-border shadow-sm space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-base">{t("full_name", lang)}</Label>
                  <Input value={newConnForm.name} onChange={(e) => setNewConnForm({...newConnForm, name: e.target.value})} className="h-14 text-lg rounded-xl" placeholder="Full name as per Aadhaar" />
                </div>
                <div className="space-y-2">
                  <Label className="text-base">{t("phone_number", lang)}</Label>
                  <Input value={newConnForm.phone} onChange={(e) => setNewConnForm({...newConnForm, phone: e.target.value})} className="h-14 text-lg rounded-xl" placeholder="10-digit mobile" maxLength={10} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-base">{t("address", lang)}</Label>
                <Textarea value={newConnForm.address} onChange={(e) => setNewConnForm({...newConnForm, address: e.target.value})} className="text-lg rounded-xl" placeholder="Complete address" />
              </div>
              <div className="space-y-2">
                <Label className="text-base">{t("aadhaar_number", lang)}</Label>
                <Input value={newConnForm.aadhaar} onChange={(e) => setNewConnForm({...newConnForm, aadhaar: e.target.value})} className="h-14 text-lg rounded-xl" placeholder="12-digit Aadhaar" maxLength={12} />
              </div>
              <div className="space-y-2">
                <Label className="text-base">{t("connection_type", lang)}</Label>
                <div className="grid grid-cols-2 gap-3">
                  {["domestic", "commercial"].map((ct) => (
                    <button key={ct} onClick={() => setNewConnForm({...newConnForm, type: ct})} className={`p-4 rounded-xl border-2 text-center font-medium capitalize transition-all ${newConnForm.type === ct ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>{ct}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-2xl gap-2" onClick={resetToMenu}>
                <ArrowLeft className="w-5 h-5" />{t("back", lang)}
              </Button>
              <Button size="lg" className="h-14 px-10 text-lg rounded-2xl gap-2 shadow-lg" onClick={handleFormSubmit} disabled={!newConnForm.name || !newConnForm.address || !newConnForm.phone || loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {t("submit_application", lang)}<ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        );

      case "delivery_tracking":
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h2 className="text-3xl font-bold">{t("track_delivery", lang)}</h2>
              <p className="text-lg text-muted-foreground">{t("delivery_status_desc", lang)}</p>
            </div>
            <div className="space-y-4">
              {mockDeliveries.map((del) => (
                <div key={del.id} className={`bg-white rounded-2xl p-6 border-2 ${del.status === "Out for Delivery" ? "border-green-200" : "border-border"} shadow-sm`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Order ID</p>
                      <p className="font-bold font-mono text-lg">{del.id}</p>
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${del.status === "Out for Delivery" ? "bg-green-100 text-green-700" : "bg-secondary text-muted-foreground"}`}>
                      {del.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div><p className="text-muted-foreground">{t("cylinder_type", lang)}</p><p className="font-bold">{del.type}</p></div>
                    <div><p className="text-muted-foreground">{del.status === "Delivered" ? "Delivered" : "ETA"}</p><p className="font-bold">{del.eta}</p></div>
                    <div><p className="text-muted-foreground">Delivery Person</p><p className="font-bold">{del.driver}</p></div>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-2xl gap-2" onClick={resetToMenu}>
              <ArrowLeft className="w-5 h-5" />{t("back", lang)}
            </Button>
          </div>
        );

      case "subsidy":
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h2 className="text-3xl font-bold">{t("subsidy_status", lang)}</h2>
              <p className="text-lg text-muted-foreground">{t("check_subsidy_desc", lang)}</p>
            </div>
            {!subsidyData ? (
              <div className="bg-white rounded-3xl p-8 border border-border shadow-sm space-y-6">
                <div className="flex gap-3">
                  <Input value={gasId} onChange={(e) => setGasId(e.target.value)} placeholder="LPG Consumer ID" className="flex-1 h-16 text-2xl text-center font-mono rounded-xl border-2" />
                  <Button size="lg" className="h-16 px-8 text-lg rounded-xl gap-2" onClick={handleSubsidyLookup} disabled={gasId.length < 3 || loading}>
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    {t("check_status", lang)}
                  </Button>
                </div>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-3xl p-6 border border-border shadow-sm space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-border">
                  <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{subsidyData.name}</h3>
                    <p className="text-muted-foreground">LPG ID: {subsidyData.lpgId}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <p className="text-xs text-green-600">{t("subsidy_amount", lang)}</p>
                    <p className="font-bold text-xl text-green-700">{subsidyData.subsidy}</p>
                  </div>
                  <div className="bg-secondary/30 rounded-xl p-4">
                    <p className="text-xs text-muted-foreground">{t("last_credit", lang)}</p>
                    <p className="font-bold">{subsidyData.lastCredit}</p>
                  </div>
                  <div className="bg-secondary/30 rounded-xl p-4 col-span-2">
                    <p className="text-xs text-muted-foreground">{t("bank_account", lang)}</p>
                    <p className="font-bold">{subsidyData.bank}</p>
                  </div>
                </div>
              </motion.div>
            )}
            <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-2xl gap-2" onClick={resetToMenu}>
              <ArrowLeft className="w-5 h-5" />{t("back", lang)}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <KioskLayout>
      <div className="h-full flex flex-col max-w-4xl mx-auto w-full">
        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{submitError}</span>
            <Button variant="ghost" size="sm" className="ml-auto text-red-700" onClick={() => setSubmitError("")}>Dismiss</Button>
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.div key={`${action}-${bookingStep}-${formSubmitted}-${gasIdValid}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1">
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </KioskLayout>
  );
}
