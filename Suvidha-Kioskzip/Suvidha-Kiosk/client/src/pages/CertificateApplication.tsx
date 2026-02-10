import KioskLayout from "@/components/layout/KioskLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, ArrowRight, FileText, CheckCircle2, Loader2, Search,
  Clock, IndianRupee, AlertTriangle, ClipboardList, X, ScrollText
} from "lucide-react";
import { loadPreferences } from "@/lib/userPreferences";

interface CertType {
  id: string;
  name: string;
  fee: string;
  processingDays: number;
  docs: string;
}

interface Application {
  id: number;
  applicationId: string;
  certificateType: string;
  applicantName: string;
  status: string;
  fee: string;
  expectedDate: string;
  createdAt: string;
}

type Step = "select" | "form" | "review" | "success";

export default function CertificateApplication() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("select");
  const [types, setTypes] = useState<CertType[]>([]);
  const [selectedType, setSelectedType] = useState<CertType | null>(null);
  const [myApps, setMyApps] = useState<Application[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [trackId, setTrackId] = useState("");
  const [trackResult, setTrackResult] = useState<Application | null>(null);
  const [showTrack, setShowTrack] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submittedApp, setSubmittedApp] = useState<Application | null>(null);

  const [formData, setFormData] = useState({
    applicantName: "",
    fatherName: "",
    motherName: "",
    dateOfBirth: "",
    address: "",
    purpose: "",
    additionalDetails: "",
  });

  const userId = loadPreferences().userId || "guest";
  const prefs = loadPreferences();

  useEffect(() => {
    fetch("/api/certificates/types").then(r => r.json()).then(d => { if (d.success) setTypes(d.types); });
    fetch(`/api/certificates/my?userId=${userId}`).then(r => r.json()).then(d => { if (d.success) setMyApps(d.applications); });

    if (prefs.userName) setFormData(prev => ({ ...prev, applicantName: prefs.userName || "" }));
  }, []);

  const handleSubmit = async () => {
    if (!selectedType || !formData.applicantName || !formData.address) {
      setError("Please fill all required fields");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/certificates/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, certificateType: selectedType.id, ...formData }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmittedApp(data.application);
        setStep("success");
        fetch(`/api/certificates/my?userId=${userId}`).then(r => r.json()).then(d => { if (d.success) setMyApps(d.applications); });
      } else {
        setError(data.message || "Submission failed");
      }
    } catch { setError("Network error"); }
    setLoading(false);
  };

  const handleTrack = async () => {
    if (!trackId.trim()) return;
    try {
      const res = await fetch(`/api/certificates/track/${trackId.trim()}`);
      const data = await res.json();
      if (data.success) setTrackResult(data.application);
      else setTrackResult(null);
    } catch { setTrackResult(null); }
  };

  const resetForm = () => {
    setStep("select");
    setSelectedType(null);
    setFormData({ applicantName: prefs.userName || "", fatherName: "", motherName: "", dateOfBirth: "", address: "", purpose: "", additionalDetails: "" });
    setError("");
    setSubmittedApp(null);
  };

  const statusColor = (s: string) => {
    if (s === "submitted") return "bg-blue-100 text-blue-700";
    if (s === "processing") return "bg-yellow-100 text-yellow-700";
    if (s === "ready") return "bg-green-100 text-green-700";
    if (s === "rejected") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <KioskLayout>
      <div className="h-full flex flex-col max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="lg" className="rounded-full h-12 w-12 p-0" onClick={() => {
            if (showHistory || showTrack) { setShowHistory(false); setShowTrack(false); return; }
            if (step !== "select" && step !== "success") { setStep("select"); return; }
            navigate("/dashboard");
          }}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex-1">
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <ScrollText className="w-8 h-8 text-teal-600" />
              Certificate Applications
            </h2>
            <p className="text-muted-foreground">Apply for government certificates online</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl gap-2 text-sm" onClick={() => { setShowTrack(!showTrack); setShowHistory(false); }}>
              <Search className="w-4 h-4" />Track
            </Button>
            {myApps.length > 0 && (
              <Button variant="outline" className="rounded-xl gap-2 text-sm" onClick={() => { setShowHistory(!showHistory); setShowTrack(false); }}>
                <ClipboardList className="w-4 h-4" />My Applications ({myApps.length})
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /><span>{error}</span>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setError("")}><X className="w-4 h-4" /></Button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {showTrack ? (
            <motion.div key="track" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <h3 className="text-xl font-bold">Track Your Application</h3>
              <div className="flex gap-3">
                <Input value={trackId} onChange={(e) => setTrackId(e.target.value)} placeholder="Enter Application ID (e.g. CERT-...)" className="h-14 rounded-xl border-2 text-lg flex-1" />
                <Button className="h-14 px-6 rounded-xl" onClick={handleTrack}>Track</Button>
              </div>
              {trackResult && (
                <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-3">
                  <div className="flex justify-between"><span className="text-muted-foreground">Application ID</span><span className="font-mono font-bold">{trackResult.applicationId}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Certificate</span><span className="font-semibold">{types.find(t => t.id === trackResult.certificateType)?.name || trackResult.certificateType}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Applicant</span><span className="font-semibold">{trackResult.applicantName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className={`px-3 py-1 rounded-full text-sm font-bold ${statusColor(trackResult.status)}`}>{trackResult.status.toUpperCase()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Expected Date</span><span className="font-semibold">{trackResult.expectedDate}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Fee</span><span className="font-semibold">₹{trackResult.fee}</span></div>
                </div>
              )}
            </motion.div>
          ) : showHistory ? (
            <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <h3 className="text-xl font-bold">My Applications</h3>
              {myApps.map(app => (
                <div key={app.id} className="bg-white rounded-xl p-4 border shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 bg-teal-100 text-teal-600 rounded-lg flex items-center justify-center"><FileText className="w-5 h-5" /></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-primary">{app.applicationId}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColor(app.status)}`}>{app.status.toUpperCase()}</span>
                    </div>
                    <p className="font-semibold">{types.find(t => t.id === app.certificateType)?.name || app.certificateType}</p>
                    <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" />₹{app.fee}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Expected: {app.expectedDate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : step === "success" && submittedApp ? (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex items-center justify-center">
              <div className="bg-white rounded-3xl p-10 shadow-xl border text-center max-w-lg">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 className="w-14 h-14 text-green-600" /></div>
                <h3 className="text-3xl font-bold text-green-700 mb-2">Application Submitted!</h3>
                <div className="bg-teal-50 rounded-2xl p-5 border border-teal-200 mt-4 space-y-2 text-left">
                  <div className="flex justify-between"><span className="text-muted-foreground">Application ID</span><span className="font-mono font-bold text-lg text-teal-700">{submittedApp.applicationId}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Certificate</span><span className="font-semibold">{selectedType?.name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Fee</span><span className="font-semibold">₹{submittedApp.fee}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Expected By</span><span className="font-semibold">{submittedApp.expectedDate}</span></div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">A receipt has been added to your documents. Save your Application ID for tracking.</p>
                <div className="flex gap-3 mt-6">
                  <Button className="flex-1 h-14 rounded-xl text-lg" onClick={() => navigate("/dashboard")}>Dashboard</Button>
                  <Button variant="outline" className="flex-1 h-14 rounded-xl text-lg" onClick={resetForm}>Apply Another</Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 space-y-4">
              {step !== "select" && (
                <div className="flex gap-1 mb-2">
                  {["form", "review"].map((s, i) => (
                    <div key={s} className={`flex-1 h-2 rounded-full ${["form", "review"].indexOf(step) >= i ? "bg-teal-600" : "bg-gray-200"}`} />
                  ))}
                </div>
              )}

              {step === "select" && (
                <div className="space-y-3">
                  <h3 className="text-xl font-bold">Select Certificate Type</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {types.map(cert => (
                      <button key={cert.id} onClick={() => { setSelectedType(cert); setStep("form"); }}
                        className="bg-white rounded-2xl p-5 border-2 border-transparent hover:border-teal-300 shadow-sm hover:shadow-md transition-all text-left group">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-base">{cert.name}</p>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" />₹{cert.fee}</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{cert.processingDays} days</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Docs: {cert.docs}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === "form" && selectedType && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold">Apply for {selectedType.name}</h3>
                  <div className="bg-teal-50 rounded-xl p-3 border border-teal-200 text-sm flex items-center gap-3">
                    <FileText className="w-5 h-5 text-teal-600" />
                    <span>Fee: <b>₹{selectedType.fee}</b> | Processing: <b>{selectedType.processingDays} days</b> | Bring: {selectedType.docs}</span>
                  </div>
                  <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-medium mb-1 text-sm">Full Name *</label>
                        <Input value={formData.applicantName} onChange={(e) => setFormData({ ...formData, applicantName: e.target.value })} className="h-12 rounded-xl" />
                      </div>
                      <div>
                        <label className="block font-medium mb-1 text-sm">Date of Birth</label>
                        <Input type="date" value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} className="h-12 rounded-xl" />
                      </div>
                      <div>
                        <label className="block font-medium mb-1 text-sm">Father's Name</label>
                        <Input value={formData.fatherName} onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })} className="h-12 rounded-xl" />
                      </div>
                      <div>
                        <label className="block font-medium mb-1 text-sm">Mother's Name</label>
                        <Input value={formData.motherName} onChange={(e) => setFormData({ ...formData, motherName: e.target.value })} className="h-12 rounded-xl" />
                      </div>
                    </div>
                    <div>
                      <label className="block font-medium mb-1 text-sm">Address *</label>
                      <Textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="rounded-xl min-h-[60px]" />
                    </div>
                    <div>
                      <label className="block font-medium mb-1 text-sm">Purpose</label>
                      <Input value={formData.purpose} onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} placeholder="e.g. School admission, Govt job, Passport" className="h-12 rounded-xl" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="h-12 px-6 rounded-xl" onClick={() => setStep("select")}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
                    <Button className="h-12 px-6 rounded-xl" disabled={!formData.applicantName || !formData.address} onClick={() => setStep("review")}>Review<ArrowRight className="w-4 h-4 ml-2" /></Button>
                  </div>
                </div>
              )}

              {step === "review" && selectedType && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold">Review Your Application</h3>
                  <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-3">
                    <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Certificate</span><span className="font-semibold">{selectedType.name}</span></div>
                    <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Applicant</span><span className="font-semibold">{formData.applicantName}</span></div>
                    {formData.fatherName && <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Father</span><span className="font-semibold">{formData.fatherName}</span></div>}
                    {formData.motherName && <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Mother</span><span className="font-semibold">{formData.motherName}</span></div>}
                    {formData.dateOfBirth && <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">DOB</span><span className="font-semibold">{formData.dateOfBirth}</span></div>}
                    <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Address</span><span className="font-semibold text-sm max-w-[60%] text-right">{formData.address}</span></div>
                    <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Fee</span><span className="font-bold text-lg text-teal-700">₹{selectedType.fee}</span></div>
                    <div className="flex justify-between py-2"><span className="text-muted-foreground">Processing Time</span><span className="font-semibold">{selectedType.processingDays} working days</span></div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="h-14 flex-1 rounded-xl text-lg" onClick={() => setStep("form")}><ArrowLeft className="w-4 h-4 mr-2" />Edit</Button>
                    <Button className="h-14 flex-1 rounded-xl text-lg bg-teal-600 hover:bg-teal-700 gap-2 shadow-lg" onClick={handleSubmit} disabled={loading}>
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}Submit Application
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </KioskLayout>
  );
}
