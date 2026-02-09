import KioskLayout from "@/components/layout/KioskLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Zap, CreditCard, FileText, Wrench, CircleAlert, ArrowLeft, ArrowRight,
  CheckCircle2, Search, AlertTriangle, Loader2, Receipt, Plus, Gauge
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { t } from "@/lib/translations";
import { loadPreferences } from "@/lib/userPreferences";
import PaymentFlow from "@/components/PaymentFlow";

type ServiceAction = "menu" | "pay_bill" | "new_connection" | "outage" | "meter_fault" | "billing_correction";
type BillStep = "lookup" | "bill_details" | "payment";

const mockBills: Record<string, { name: string; address: string; amount: number; dueDate: string; units: number; meterNo: string; lastPaid: string; status: string }> = {
  "1234567890": { name: "Rajesh Kumar", address: "45, Shankar Nagar, Raipur", amount: 2350, dueDate: "15 Mar 2026", units: 342, meterNo: "MT-889012", lastPaid: "15 Feb 2026", status: "Unpaid" },
  "9876543210": { name: "Priya Sharma", address: "12, Civil Lines, Bilaspur", amount: 1875, dueDate: "20 Mar 2026", units: 275, meterNo: "MT-445678", lastPaid: "20 Feb 2026", status: "Unpaid" },
  "5555555555": { name: "Amit Verma", address: "78, Devendra Nagar, Raipur", amount: 3100, dueDate: "10 Mar 2026", units: 458, meterNo: "MT-112233", lastPaid: "10 Feb 2026", status: "Overdue" },
};

const menuItems = [
  { id: "pay_bill" as ServiceAction, icon: CreditCard, color: "bg-yellow-500", label: "pay_electricity_bill" },
  { id: "new_connection" as ServiceAction, icon: Plus, color: "bg-blue-500", label: "new_elec_connection" },
  { id: "outage" as ServiceAction, icon: CircleAlert, color: "bg-red-500", label: "report_outage" },
  { id: "meter_fault" as ServiceAction, icon: Gauge, color: "bg-orange-500", label: "meter_fault" },
  { id: "billing_correction" as ServiceAction, icon: FileText, color: "bg-purple-500", label: "billing_correction" },
];

export default function ElectricityService() {
  const [, setLocation] = useLocation();
  const [action, setAction] = useState<ServiceAction>("menu");
  const [billStep, setBillStep] = useState<BillStep>("lookup");
  const [consumerId, setConsumerId] = useState("");
  const [billData, setBillData] = useState<typeof mockBills[string] | null>(null);
  const [lookupError, setLookupError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [lang, setLang] = useState(() => loadPreferences().language);

  const [newConnForm, setNewConnForm] = useState({ name: "", address: "", phone: "", loadType: "single", aadhaar: "" });
  const [outageForm, setOutageForm] = useState({ area: "", description: "" });
  const [meterForm, setMeterForm] = useState({ consumerId: "", issue: "", description: "" });

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.language) setLang(detail.language);
    };
    window.addEventListener("prefs-changed", handler);
    return () => window.removeEventListener("prefs-changed", handler);
  }, []);

  const handleLookup = () => {
    setLoading(true);
    setLookupError(false);
    setTimeout(() => {
      const bill = mockBills[consumerId];
      if (bill) {
        setBillData(bill);
        setBillStep("bill_details");
      } else {
        setLookupError(true);
      }
      setLoading(false);
    }, 1500);
  };

  const resetToMenu = () => {
    setAction("menu");
    setBillStep("lookup");
    setConsumerId("");
    setBillData(null);
    setLookupError(false);
    setFormSubmitted(false);
  };

  const handleFormSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setFormSubmitted(true);
    }, 2000);
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
            <p className="text-xl text-muted-foreground">{t("complaint_id", lang)} <span className="font-mono font-bold">#SUV-{Math.floor(1000 + Math.random() * 9000)}</span></p>
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
              <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-yellow-600">
                <Zap className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold">{t("electricity", lang)}</h2>
              <p className="text-lg text-muted-foreground">{t("select_elec_service", lang)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setAction(item.id)}
                  className="bg-white rounded-2xl p-6 border-2 border-transparent hover:border-primary/30 shadow-md hover:shadow-xl transition-all text-left group"
                >
                  <div className={`w-14 h-14 rounded-xl ${item.color} text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md`}>
                    <item.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{t(item.label as any, lang)}</h3>
                </button>
              ))}
            </div>
          </div>
        );

      case "pay_bill":
        if (billStep === "lookup") {
          return (
            <div className="space-y-6">
              <div className="text-center mb-4">
                <h2 className="text-3xl font-bold">{t("pay_electricity_bill", lang)}</h2>
                <p className="text-lg text-muted-foreground">{t("enter_consumer_id", lang)}</p>
              </div>
              <div className="bg-white rounded-3xl p-8 border border-border shadow-sm space-y-6">
                <div className="space-y-3">
                  <Label className="text-lg">{t("consumer_id", lang)}</Label>
                  <div className="flex gap-3">
                    <Input
                      value={consumerId}
                      onChange={(e) => { setConsumerId(e.target.value); setLookupError(false); }}
                      placeholder="e.g. 1234567890"
                      className="flex-1 h-16 text-2xl text-center font-mono rounded-xl border-2"
                      maxLength={10}
                    />
                    <Button
                      size="lg"
                      className="h-16 px-8 text-lg rounded-xl gap-2"
                      onClick={handleLookup}
                      disabled={consumerId.length < 5 || loading}
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                      {t("fetch_bill", lang)}
                    </Button>
                  </div>
                </div>
                {lookupError && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
                    <AlertTriangle className="w-5 h-5" />
                    <p>{t("consumer_not_found", lang)}</p>
                  </motion.div>
                )}
                <div className="bg-secondary/30 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground">{t("sample_ids", lang)}: <span className="font-mono font-bold">1234567890, 9876543210, 5555555555</span></p>
                </div>
              </div>
              <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-2xl gap-2" onClick={resetToMenu}>
                <ArrowLeft className="w-5 h-5" />
                {t("back", lang)}
              </Button>
            </div>
          );
        }
        if (billStep === "bill_details" && billData) {
          return (
            <div className="space-y-6">
              <div className="text-center mb-2">
                <h2 className="text-3xl font-bold">{t("bill_details", lang)}</h2>
              </div>
              <div className="bg-white rounded-3xl p-6 border border-border shadow-sm">
                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-border">
                  <div className="w-14 h-14 bg-yellow-100 rounded-xl flex items-center justify-center text-yellow-600">
                    <Zap className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{billData.name}</h3>
                    <p className="text-muted-foreground">{billData.address}</p>
                  </div>
                  {billData.status === "Overdue" && (
                    <span className="ml-auto bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold">{t("overdue", lang)}</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-secondary/30 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">{t("consumer_id", lang)}</p>
                    <p className="font-bold font-mono">{consumerId}</p>
                  </div>
                  <div className="bg-secondary/30 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">{t("meter_number", lang)}</p>
                    <p className="font-bold font-mono">{billData.meterNo}</p>
                  </div>
                  <div className="bg-secondary/30 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">{t("units_consumed", lang)}</p>
                    <p className="font-bold">{billData.units} kWh</p>
                  </div>
                  <div className="bg-secondary/30 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">{t("due_date", lang)}</p>
                    <p className="font-bold">{billData.dueDate}</p>
                  </div>
                  <div className="bg-secondary/30 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">{t("last_payment", lang)}</p>
                    <p className="font-bold">{billData.lastPaid}</p>
                  </div>
                  <div className="bg-primary/5 border-2 border-primary/20 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">{t("total_amount", lang)}</p>
                    <p className="font-bold text-2xl text-primary">₹{billData.amount.toLocaleString("en-IN")}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-2xl gap-2" onClick={() => setBillStep("lookup")}>
                  <ArrowLeft className="w-5 h-5" />
                  {t("back", lang)}
                </Button>
                <Button size="lg" className="h-14 px-10 text-lg rounded-2xl gap-2 shadow-lg shadow-primary/20" onClick={() => setBillStep("payment")}>
                  {t("proceed_pay", lang)}
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          );
        }
        if (billStep === "payment" && billData) {
          return (
            <PaymentFlow
              amount={billData.amount}
              billDetails={[
                { label: t("consumer_id", lang), value: consumerId },
                { label: t("name", lang), value: billData.name },
                { label: t("meter_number", lang), value: billData.meterNo },
                { label: t("units_consumed", lang), value: `${billData.units} kWh` },
                { label: t("due_date", lang), value: billData.dueDate },
              ]}
              lang={lang}
              onComplete={() => setLocation("/dashboard")}
              onBack={() => setBillStep("bill_details")}
            />
          );
        }
        return null;

      case "new_connection":
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h2 className="text-3xl font-bold">{t("new_elec_connection", lang)}</h2>
              <p className="text-lg text-muted-foreground">{t("fill_connection_form", lang)}</p>
            </div>
            <div className="bg-white rounded-3xl p-6 border border-border shadow-sm space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-base">{t("full_name", lang)}</Label>
                  <Input value={newConnForm.name} onChange={(e) => setNewConnForm({...newConnForm, name: e.target.value})} className="h-14 text-lg rounded-xl" placeholder="Enter full name" />
                </div>
                <div className="space-y-2">
                  <Label className="text-base">{t("phone_number", lang)}</Label>
                  <Input value={newConnForm.phone} onChange={(e) => setNewConnForm({...newConnForm, phone: e.target.value})} className="h-14 text-lg rounded-xl" placeholder="10-digit number" maxLength={10} />
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
                <Label className="text-base">{t("load_type", lang)}</Label>
                <div className="grid grid-cols-2 gap-3">
                  {["single", "three"].map((lt) => (
                    <button key={lt} onClick={() => setNewConnForm({...newConnForm, loadType: lt})} className={`p-4 rounded-xl border-2 text-center font-medium transition-all ${newConnForm.loadType === lt ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                      {lt === "single" ? t("single_phase", lang) : t("three_phase", lang)}
                    </button>
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

      case "outage":
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-red-600">
                <CircleAlert className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold">{t("report_outage", lang)}</h2>
              <p className="text-lg text-muted-foreground">{t("report_outage_desc", lang)}</p>
            </div>
            <div className="bg-white rounded-3xl p-6 border border-border shadow-sm space-y-5">
              <div className="space-y-2">
                <Label className="text-base">{t("affected_area", lang)}</Label>
                <Input value={outageForm.area} onChange={(e) => setOutageForm({...outageForm, area: e.target.value})} className="h-14 text-lg rounded-xl" placeholder="Colony / Area name" />
              </div>
              <div className="space-y-2">
                <Label className="text-base">{t("describe_issue", lang)}</Label>
                <Textarea value={outageForm.description} onChange={(e) => setOutageForm({...outageForm, description: e.target.value})} className="text-lg rounded-xl min-h-[120px]" placeholder="When did the outage start? Any visible damage?" />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <p className="text-sm text-amber-700">{t("outage_safety_tip", lang)}</p>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-2xl gap-2" onClick={resetToMenu}>
                <ArrowLeft className="w-5 h-5" />{t("back", lang)}
              </Button>
              <Button size="lg" className="h-14 px-10 text-lg rounded-2xl gap-2 shadow-lg bg-red-600 hover:bg-red-700" onClick={handleFormSubmit} disabled={!outageForm.area || loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {t("report_now", lang)}<ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        );

      case "meter_fault":
      case "billing_correction":
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h2 className="text-3xl font-bold">{action === "meter_fault" ? t("meter_fault", lang) : t("billing_correction", lang)}</h2>
              <p className="text-lg text-muted-foreground">{t("provide_details", lang)}</p>
            </div>
            <div className="bg-white rounded-3xl p-6 border border-border shadow-sm space-y-5">
              <div className="space-y-2">
                <Label className="text-base">{t("consumer_id", lang)}</Label>
                <Input value={meterForm.consumerId} onChange={(e) => setMeterForm({...meterForm, consumerId: e.target.value})} className="h-14 text-lg rounded-xl" placeholder="Your consumer ID" />
              </div>
              <div className="space-y-2">
                <Label className="text-base">{t("issue_type", lang)}</Label>
                <div className="grid grid-cols-2 gap-3">
                  {(action === "meter_fault"
                    ? ["Meter Not Working", "Wrong Reading", "Damaged Meter", "Meter Bypass"]
                    : ["Excess Billing", "Wrong Tariff", "Duplicate Bill", "Arrears Dispute"]
                  ).map((issue) => (
                    <button key={issue} onClick={() => setMeterForm({...meterForm, issue})} className={`p-4 rounded-xl border-2 text-left font-medium transition-all ${meterForm.issue === issue ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                      {issue}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-base">{t("additional_details", lang)}</Label>
                <Textarea value={meterForm.description} onChange={(e) => setMeterForm({...meterForm, description: e.target.value})} className="text-lg rounded-xl min-h-[100px]" placeholder="Provide any additional information" />
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-2xl gap-2" onClick={resetToMenu}>
                <ArrowLeft className="w-5 h-5" />{t("back", lang)}
              </Button>
              <Button size="lg" className="h-14 px-10 text-lg rounded-2xl gap-2 shadow-lg" onClick={handleFormSubmit} disabled={!meterForm.consumerId || !meterForm.issue || loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {t("submit_complaint", lang)}<ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <KioskLayout>
      <div className="h-full flex flex-col max-w-4xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div key={`${action}-${billStep}-${formSubmitted}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1">
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </KioskLayout>
  );
}
