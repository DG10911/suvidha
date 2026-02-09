import KioskLayout from "@/components/layout/KioskLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { CheckCircle2, ArrowRight, ArrowLeft, Camera, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { t } from "@/lib/translations";
import { loadPreferences } from "@/lib/userPreferences";

const subcategories = {
  electricity: ["Power Outage", "New Connection", "Billing Issue", "Meter Fault", "Billing Correction", "Load Change"],
  water: ["No Water", "Leakage", "Dirty Water", "Low Pressure", "Water Quality", "New Connection"],
  gas: ["Cylinder Booking", "Leakage Emergency", "New Connection", "Delivery Issue", "Subsidy Complaint"],
  waste: ["Missed Pickup", "Overflowing Bins", "Bulk Waste", "Street Sweeping"],
  infrastructure: ["Pothole", "Streetlight", "Drainage", "Public Toilets", "Park Maintenance"],
  municipal: ["Water Services", "Waste Management", "Roads & Infrastructure"],
  complaints: ["Check Status", "Re-open Ticket"]
};

export default function ServiceRequest() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/service/:type");
  const type = (params?.type as keyof typeof subcategories) || "electricity";
  
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    category: "",
    description: "",
    urgency: "normal"
  });
  const [lang, setLang] = useState(() => loadPreferences().language);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.language) setLang(detail.language);
    };
    window.addEventListener("prefs-changed", handler);
    return () => window.removeEventListener("prefs-changed", handler);
  }, []);

  const steps = [t("category", lang), t("details", lang), t("review", lang), t("success", lang)];

  const nextStep = () => setCurrentStep(p => Math.min(steps.length - 1, p + 1));
  const prevStep = () => setCurrentStep(p => Math.max(0, p - 1));

  const handlePrintReceipt = () => {
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
          <p style="font-size: 18px; font-weight: bold; margin: 2px 0 0 0;">#SUV-2024-8892</p>
        </div>
        <div style="margin-bottom: 12px;">
          <p style="font-size: 12px; color: #666; margin: 0;">${t("service_type", lang)}</p>
          <p style="font-size: 16px; font-weight: bold; margin: 2px 0 0 0; text-transform: capitalize;">${type}</p>
        </div>
        <div style="margin-bottom: 12px;">
          <p style="font-size: 12px; color: #666; margin: 0;">${t("category", lang)}</p>
          <p style="font-size: 16px; font-weight: bold; margin: 2px 0 0 0;">${formData.category}</p>
        </div>
        <div style="margin-bottom: 12px;">
          <p style="font-size: 12px; color: #666; margin: 0;">${t("description", lang)}</p>
          <p style="font-size: 14px; margin: 2px 0 0 0;">${formData.description || "N/A"}</p>
        </div>
        <div style="margin-bottom: 12px;">
          <p style="font-size: 12px; color: #666; margin: 0;">${t("urgency", lang)}</p>
          <p style="font-size: 16px; font-weight: bold; margin: 2px 0 0 0; text-transform: uppercase;">${formData.urgency}</p>
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="grid grid-cols-2 gap-4" role="group" aria-label={t("category", lang)}>
            {subcategories[type]?.map((sub) => (
              <button
                key={sub}
                onClick={() => {
                  setFormData({ ...formData, category: sub });
                  nextStep();
                }}
                aria-label={`Select category: ${sub}`}
                aria-pressed={formData.category === sub}
                className={`p-6 rounded-2xl border-2 text-left text-xl font-medium transition-all ${
                  formData.category === sub 
                  ? "border-primary bg-primary/5 text-primary" 
                  : "border-border bg-white hover:border-primary/50"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        );
      case 1:
        return (
          <div className="space-y-8 bg-white p-8 rounded-3xl border border-border">
            <div className="space-y-4">
              <Label className="text-xl">{t("describe_issue", lang)}</Label>
              <Textarea 
                placeholder={t("describe_placeholder", lang)}
                className="min-h-[150px] text-lg p-4 rounded-xl border-2 focus-visible:ring-primary"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
            
            <div className="space-y-4">
               <Label className="text-xl">{t("urgency_level", lang)}</Label>
               <RadioGroup 
                 value={formData.urgency} 
                 onValueChange={(val) => setFormData({...formData, urgency: val})}
                 className="flex gap-4"
               >
                 <div className="flex items-center space-x-2 bg-secondary/50 p-4 rounded-xl flex-1 border-2 border-transparent data-[state=checked]:border-primary cursor-pointer">
                   <RadioGroupItem value="normal" id="r1" />
                   <Label htmlFor="r1" className="text-lg cursor-pointer">{t("normal", lang)}</Label>
                 </div>
                 <div className="flex items-center space-x-2 bg-secondary/50 p-4 rounded-xl flex-1 border-2 border-transparent data-[state=checked]:border-orange-500 cursor-pointer">
                   <RadioGroupItem value="high" id="r2" />
                   <Label htmlFor="r2" className="text-lg cursor-pointer">{t("high", lang)}</Label>
                 </div>
                 <div className="flex items-center space-x-2 bg-secondary/50 p-4 rounded-xl flex-1 border-2 border-transparent data-[state=checked]:border-destructive cursor-pointer">
                   <RadioGroupItem value="emergency" id="r3" />
                   <Label htmlFor="r3" className="text-lg cursor-pointer text-destructive font-bold">{t("emergency", lang)}</Label>
                 </div>
               </RadioGroup>
            </div>

            <div className="space-y-4">
              <Label className="text-xl">{t("evidence", lang)}</Label>
              <div className="flex gap-4">
                <Button variant="outline" className="h-24 flex-1 rounded-xl gap-2 text-lg border-2 border-dashed">
                  <Camera className="w-8 h-8" />
                  {t("take_photo", lang)}
                </Button>
                <Button variant="outline" className="h-24 flex-1 rounded-xl gap-2 text-lg border-2 border-dashed">
                  <Upload className="w-8 h-8" />
                  {t("upload_file", lang)}
                </Button>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 bg-white p-8 rounded-3xl border border-border">
            <h3 className="text-2xl font-bold">{t("summary", lang)}</h3>
            <div className="grid grid-cols-2 gap-6 text-lg">
              <div>
                <p className="text-muted-foreground">{t("service_type", lang)}</p>
                <p className="font-medium capitalize">{type}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("category", lang)}</p>
                <p className="font-medium">{formData.category}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">{t("description", lang)}</p>
                <p className="font-medium">{formData.description || "No description provided"}</p>
              </div>
               <div>
                <p className="text-muted-foreground">{t("urgency", lang)}</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold uppercase ${
                  formData.urgency === 'emergency' ? 'bg-destructive/10 text-destructive' : 
                  formData.urgency === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                }`}>
                  {formData.urgency}
                </span>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-8 text-center bg-white rounded-3xl border border-border">
            <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center text-green-600">
              <CheckCircle2 className="w-16 h-16" />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-2">{t("complaint_registered", lang)}</h2>
              <p className="text-xl text-muted-foreground">{t("complaint_id", lang)} <span className="font-mono font-bold text-foreground">#SUV-2024-8892</span></p>
            </div>
            <div className="p-4 bg-secondary/50 rounded-xl max-w-md">
              <p className="text-lg">{t("sms_updates", lang)}</p>
            </div>
            <div className="flex gap-4 w-full max-w-md px-8">
              <Button className="flex-1 h-14 text-lg rounded-xl" onClick={() => setLocation("/dashboard")}>
                {t("go_dashboard", lang)}
              </Button>
              <Button variant="outline" className="flex-1 h-14 text-lg rounded-xl" onClick={handlePrintReceipt}>
                {t("print_receipt", lang)}
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
        <div className="mb-8" role="navigation" aria-label="Form progress">
          <div className="flex justify-between mb-2">
            {steps.map((stepName, idx) => (
              <span
                key={idx}
                className={`text-sm font-bold uppercase tracking-wider ${idx <= currentStep ? "text-primary" : "text-muted-foreground"}`}
                aria-current={idx === currentStep ? "step" : undefined}
              >
                {stepName}
              </span>
            ))}
          </div>
          <div
            className="h-3 bg-secondary rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={currentStep + 1}
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-label={`Step ${currentStep + 1} of ${steps.length}`}
          >
            <motion.div 
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex-1">
          <div className="mb-6">
            <h2 className="text-3xl font-bold font-heading capitalize">
              {currentStep === 3 ? t("submission_complete", lang) : `${t("new_request", lang).replace("{type}", type)}`}
            </h2>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {currentStep < 3 && (
          <div className="flex justify-between pt-8 mt-auto">
             <Button 
                variant="outline" 
                size="lg" 
                className="h-16 px-8 text-xl rounded-2xl gap-2"
                onClick={prevStep}
                disabled={currentStep === 0}
              >
                <ArrowLeft className="w-6 h-6" />
                {t("back", lang)}
              </Button>

             <Button 
                size="lg" 
                className="h-16 px-12 text-xl rounded-2xl gap-2 shadow-lg shadow-primary/20"
                onClick={currentStep === 2 ? nextStep : nextStep}
                disabled={currentStep === 0 && !formData.category}
              >
                {currentStep === 2 ? t("submit_complaint", lang) : t("next_step", lang)}
                <ArrowRight className="w-6 h-6" />
              </Button>
          </div>
        )}
      </div>
    </KioskLayout>
  );
}
