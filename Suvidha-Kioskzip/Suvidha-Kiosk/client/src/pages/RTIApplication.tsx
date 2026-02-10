import KioskLayout from "@/components/layout/KioskLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, ArrowRight, FileSearch, CheckCircle2, Loader2,
  Clock, IndianRupee, AlertTriangle, Building2, X, Search, Scale
} from "lucide-react";
import { loadPreferences } from "@/lib/userPreferences";

interface Department {
  id: string;
  name: string;
}

interface RtiApp {
  id: number;
  rtiId: string;
  department: string;
  subject: string;
  description: string;
  applicantName: string;
  status: string;
  fee: string;
  bplStatus: boolean;
  responseDate: string;
  createdAt: string;
}

type Step = "info" | "form" | "review" | "success";

export default function RTIApplication() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("info");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [myApps, setMyApps] = useState<RtiApp[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submittedRti, setSubmittedRti] = useState<RtiApp | null>(null);
  const [trackId, setTrackId] = useState("");
  const [trackResult, setTrackResult] = useState<RtiApp | null>(null);
  const [showTrack, setShowTrack] = useState(false);

  const [formData, setFormData] = useState({
    department: "",
    subject: "",
    description: "",
    applicantName: "",
    applicantAddress: "",
    bplStatus: false,
  });

  const userId = loadPreferences().userId || "guest";
  const prefs = loadPreferences();

  useEffect(() => {
    fetch("/api/rti/departments").then(r => r.json()).then(d => { if (d.success) setDepartments(d.departments); });
    fetch(`/api/rti/my?userId=${userId}`).then(r => r.json()).then(d => { if (d.success) setMyApps(d.applications); });
    if (prefs.userName) setFormData(prev => ({ ...prev, applicantName: prefs.userName || "" }));
  }, []);

  const handleSubmit = async () => {
    if (!formData.department || !formData.subject || !formData.description || !formData.applicantName || !formData.applicantAddress) {
      setError("Please fill all required fields"); return;
    }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/rti/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...formData }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmittedRti(data.application);
        setStep("success");
        fetch(`/api/rti/my?userId=${userId}`).then(r => r.json()).then(d => { if (d.success) setMyApps(d.applications); });
      } else { setError(data.message || "Submission failed"); }
    } catch { setError("Network error"); }
    setLoading(false);
  };

  const handleTrack = async () => {
    if (!trackId.trim()) return;
    try {
      const res = await fetch(`/api/rti/track/${trackId.trim()}`);
      const data = await res.json();
      setTrackResult(data.success ? data.application : null);
    } catch { setTrackResult(null); }
  };

  const resetForm = () => {
    setStep("info");
    setFormData({ department: "", subject: "", description: "", applicantName: prefs.userName || "", applicantAddress: "", bplStatus: false });
    setError(""); setSubmittedRti(null);
  };

  const statusColor = (s: string) => {
    if (s === "submitted") return "bg-blue-100 text-blue-700";
    if (s === "under_review") return "bg-yellow-100 text-yellow-700";
    if (s === "responded") return "bg-green-100 text-green-700";
    if (s === "rejected") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  const deptName = (id: string) => departments.find(d => d.id === id)?.name || id;

  return (
    <KioskLayout>
      <div className="h-full flex flex-col max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="lg" className="rounded-full h-12 w-12 p-0" onClick={() => {
            if (showHistory || showTrack) { setShowHistory(false); setShowTrack(false); return; }
            if (step !== "info" && step !== "success") { setStep("info"); return; }
            navigate("/dashboard");
          }}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex-1">
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <Scale className="w-8 h-8 text-amber-600" />
              Right to Information (RTI)
            </h2>
            <p className="text-muted-foreground">File RTI applications to any government department</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl gap-2 text-sm" onClick={() => { setShowTrack(!showTrack); setShowHistory(false); }}>
              <Search className="w-4 h-4" />Track
            </Button>
            {myApps.length > 0 && (
              <Button variant="outline" className="rounded-xl gap-2 text-sm" onClick={() => { setShowHistory(!showHistory); setShowTrack(false); }}>
                <FileSearch className="w-4 h-4" />My RTIs ({myApps.length})
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
              <h3 className="text-xl font-bold">Track Your RTI</h3>
              <div className="flex gap-3">
                <Input value={trackId} onChange={(e) => setTrackId(e.target.value)} placeholder="Enter RTI ID (e.g. RTI-2026-...)" className="h-14 rounded-xl border-2 text-lg flex-1" />
                <Button className="h-14 px-6 rounded-xl" onClick={handleTrack}>Track</Button>
              </div>
              {trackResult && (
                <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-3">
                  <div className="flex justify-between"><span className="text-muted-foreground">RTI ID</span><span className="font-mono font-bold">{trackResult.rtiId}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Department</span><span className="font-semibold">{deptName(trackResult.department)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Subject</span><span className="font-semibold">{trackResult.subject}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className={`px-3 py-1 rounded-full text-sm font-bold ${statusColor(trackResult.status)}`}>{trackResult.status.toUpperCase()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Response By</span><span className="font-semibold">{trackResult.responseDate}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Fee</span><span className="font-semibold">₹{trackResult.fee}</span></div>
                </div>
              )}
            </motion.div>
          ) : showHistory ? (
            <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <h3 className="text-xl font-bold">My RTI Applications</h3>
              {myApps.map(app => (
                <div key={app.id} className="bg-white rounded-xl p-4 border shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-bold text-primary">{app.rtiId}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColor(app.status)}`}>{app.status.toUpperCase()}</span>
                  </div>
                  <p className="font-semibold">{app.subject}</p>
                  <p className="text-sm text-muted-foreground">{deptName(app.department)}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" />₹{app.fee}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Response by: {app.responseDate}</span>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : step === "success" && submittedRti ? (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex items-center justify-center">
              <div className="bg-white rounded-3xl p-10 shadow-xl border text-center max-w-lg">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 className="w-14 h-14 text-green-600" /></div>
                <h3 className="text-3xl font-bold text-green-700 mb-2">RTI Filed Successfully!</h3>
                <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200 mt-4 space-y-2 text-left">
                  <div className="flex justify-between"><span className="text-muted-foreground">RTI ID</span><span className="font-mono font-bold text-lg text-amber-700">{submittedRti.rtiId}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Department</span><span className="font-semibold">{deptName(submittedRti.department)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Fee</span><span className="font-semibold">₹{submittedRti.fee}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Response By</span><span className="font-semibold">{submittedRti.responseDate}</span></div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">As per RTI Act 2005, the department must respond within 30 days.</p>
                <div className="flex gap-3 mt-6">
                  <Button className="flex-1 h-14 rounded-xl text-lg" onClick={() => navigate("/dashboard")}>Dashboard</Button>
                  <Button variant="outline" className="flex-1 h-14 rounded-xl text-lg" onClick={resetForm}>File Another</Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 space-y-4">
              {step === "info" && (
                <div className="space-y-4">
                  <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200 space-y-3">
                    <h3 className="text-lg font-bold flex items-center gap-2"><Scale className="w-5 h-5 text-amber-600" />About RTI Act, 2005</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2"><span className="text-amber-600 mt-1">●</span>Every Indian citizen has the right to seek information from any public authority</li>
                      <li className="flex items-start gap-2"><span className="text-amber-600 mt-1">●</span>Public authority must respond within 30 days (48 hours for life/liberty matters)</li>
                      <li className="flex items-start gap-2"><span className="text-amber-600 mt-1">●</span>Application fee: ₹10 (BPL families exempted)</li>
                      <li className="flex items-start gap-2"><span className="text-amber-600 mt-1">●</span>If not satisfied with response, you can file first appeal within 30 days</li>
                      <li className="flex items-start gap-2"><span className="text-amber-600 mt-1">●</span>Second appeal can be made to State/Central Information Commission</li>
                    </ul>
                  </div>
                  <Button className="w-full h-14 rounded-xl text-lg gap-2" onClick={() => setStep("form")}>
                    <FileSearch className="w-5 h-5" />Start RTI Application
                  </Button>
                </div>
              )}

              {step === "form" && (
                <div className="space-y-4">
                  <div className="flex gap-1 mb-2">
                    {["form", "review"].map((s, i) => (
                      <div key={s} className={`flex-1 h-2 rounded-full ${["form", "review"].indexOf(step) >= i ? "bg-amber-600" : "bg-gray-200"}`} />
                    ))}
                  </div>
                  <h3 className="text-xl font-bold">Fill RTI Application</h3>
                  <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-4">
                    <div>
                      <label className="block font-medium mb-1 text-sm">Select Department *</label>
                      <select value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full h-12 px-3 rounded-xl border-2 bg-background text-base">
                        <option value="">-- Select Department --</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium mb-1 text-sm">Subject of Information Sought *</label>
                      <Input value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="e.g. Road repair expenditure for Ward 15 in 2025-26" className="h-12 rounded-xl" />
                    </div>
                    <div>
                      <label className="block font-medium mb-1 text-sm">Detailed Description *</label>
                      <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Clearly describe the information you are seeking. Include specific dates, locations, amounts, or file numbers if known."
                        className="rounded-xl min-h-[100px]" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-medium mb-1 text-sm">Your Full Name *</label>
                        <Input value={formData.applicantName} onChange={(e) => setFormData({ ...formData, applicantName: e.target.value })} className="h-12 rounded-xl" />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-3 cursor-pointer bg-secondary px-4 py-3 rounded-xl w-full">
                          <input type="checkbox" checked={formData.bplStatus} onChange={(e) => setFormData({ ...formData, bplStatus: e.target.checked })} className="w-5 h-5" />
                          <span className="text-sm font-medium">BPL Card Holder (Fee waived)</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block font-medium mb-1 text-sm">Your Address *</label>
                      <Textarea value={formData.applicantAddress} onChange={(e) => setFormData({ ...formData, applicantAddress: e.target.value })}
                        placeholder="Full postal address for reply" className="rounded-xl min-h-[60px]" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="h-12 px-6 rounded-xl" onClick={() => setStep("info")}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
                    <Button className="h-12 px-6 rounded-xl" disabled={!formData.department || !formData.subject || !formData.description || !formData.applicantName || !formData.applicantAddress}
                      onClick={() => setStep("review")}>Review<ArrowRight className="w-4 h-4 ml-2" /></Button>
                  </div>
                </div>
              )}

              {step === "review" && (
                <div className="space-y-4">
                  <div className="flex gap-1 mb-2">
                    <div className="flex-1 h-2 rounded-full bg-amber-600" />
                    <div className="flex-1 h-2 rounded-full bg-amber-600" />
                  </div>
                  <h3 className="text-xl font-bold">Review RTI Application</h3>
                  <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-3">
                    <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Department</span><span className="font-semibold">{deptName(formData.department)}</span></div>
                    <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Subject</span><span className="font-semibold text-sm max-w-[60%] text-right">{formData.subject}</span></div>
                    <div className="py-2 border-b"><span className="text-muted-foreground block mb-1">Description</span><p className="text-sm">{formData.description}</p></div>
                    <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Applicant</span><span className="font-semibold">{formData.applicantName}</span></div>
                    <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">BPL Status</span><span className="font-semibold">{formData.bplStatus ? "Yes (Fee Waived)" : "No"}</span></div>
                    <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Fee</span><span className="font-bold text-lg text-amber-700">₹{formData.bplStatus ? "0" : "10"}</span></div>
                    <div className="flex justify-between py-2"><span className="text-muted-foreground">Response Deadline</span><span className="font-semibold">30 days from filing</span></div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="h-14 flex-1 rounded-xl text-lg" onClick={() => setStep("form")}><ArrowLeft className="w-4 h-4 mr-2" />Edit</Button>
                    <Button className="h-14 flex-1 rounded-xl text-lg bg-amber-600 hover:bg-amber-700 gap-2 shadow-lg" onClick={handleSubmit} disabled={loading}>
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Scale className="w-5 h-5" />}File RTI Application
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
