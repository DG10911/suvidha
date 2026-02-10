import KioskLayout from "@/components/layout/KioskLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, AlertOctagon, Search, FileText, Clock, CheckCircle2,
  Loader2, ChevronRight, User, Phone, Building2, Flag
} from "lucide-react";
import { loadPreferences } from "@/lib/userPreferences";

interface Department {
  id: string;
  name: string;
  officer: string;
}

interface GrievanceRecord {
  grievanceId: string;
  department: string;
  subject: string;
  status: string;
  priority: string;
  assignedOfficer: string;
  expectedResolution: string;
  createdAt: string;
}

type Step = "list" | "form" | "confirm" | "track";

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

const statusColors: Record<string, string> = {
  registered: "bg-blue-100 text-blue-700",
  under_review: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-orange-100 text-orange-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-700",
};

export default function GrievancePortal() {
  const [, navigate] = useLocation();
  const prefs = loadPreferences();
  const userId = prefs.userId;

  const [step, setStep] = useState<Step>("list");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [myGrievances, setMyGrievances] = useState<GrievanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDept, setSelectedDept] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [applicantName, setApplicantName] = useState(prefs.userName || "");
  const [applicantPhone, setApplicantPhone] = useState("");
  const [priority, setPriority] = useState("medium");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [trackId, setTrackId] = useState("");
  const [trackResult, setTrackResult] = useState<any>(null);
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/grievances/departments").then(r => r.json()),
      userId ? fetch(`/api/grievances/my?userId=${userId}`).then(r => r.json()) : Promise.resolve({ grievances: [] }),
    ]).then(([deptData, myData]) => {
      if (deptData.success) setDepartments(deptData.departments);
      if (myData.success) setMyGrievances(myData.grievances);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [userId]);

  const handleSubmit = async () => {
    if (!selectedDept || !subject || !description || !applicantName) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/grievances/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, department: selectedDept, subject, description, applicantName, applicantPhone, priority }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
        setStep("confirm");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrack = async () => {
    if (!trackId.trim()) return;
    setTracking(true);
    try {
      const res = await fetch(`/api/grievances/track/${trackId.trim()}`);
      const data = await res.json();
      setTrackResult(data.success ? data.grievance : null);
    } finally {
      setTracking(false);
    }
  };

  return (
    <KioskLayout>
      <div className="space-y-5 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="lg" className="rounded-full h-12 w-12 p-0" onClick={() => step === "list" ? navigate("/dashboard") : setStep("list")}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex-1">
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <AlertOctagon className="w-8 h-8 text-orange-600" />
              Public Grievance Portal
            </h2>
            <p className="text-muted-foreground">File and track grievances against government departments</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-orange-600" /></div>
        ) : step === "list" ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-2xl p-6 cursor-pointer hover:shadow-xl transition-shadow"
                onClick={() => setStep("form")}>
                <FileText className="w-10 h-10 mb-3" />
                <h3 className="text-xl font-bold">File New Grievance</h3>
                <p className="text-white/80 text-sm mt-1">Submit complaint against any department</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-2xl p-6 cursor-pointer hover:shadow-xl transition-shadow"
                onClick={() => setStep("track")}>
                <Search className="w-10 h-10 mb-3" />
                <h3 className="text-xl font-bold">Track Grievance</h3>
                <p className="text-white/80 text-sm mt-1">Check status with Grievance ID</p>
              </motion.div>
            </div>

            {myGrievances.length > 0 && (
              <div>
                <h3 className="text-lg font-bold mb-3">My Grievances ({myGrievances.length})</h3>
                <div className="space-y-3">
                  {myGrievances.map((g, i) => {
                    const dept = departments.find(d => d.id === g.department);
                    return (
                      <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                        className="bg-white rounded-xl p-4 border shadow-sm flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-bold text-orange-700">{g.grievanceId}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[g.status] || "bg-gray-100"}`}>{g.status.replace(/_/g, " ")}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColors[g.priority] || ""}`}>{g.priority}</span>
                          </div>
                          <p className="font-medium text-sm">{g.subject}</p>
                          <p className="text-xs text-muted-foreground">{dept?.name || g.department} | Officer: {g.assignedOfficer}</p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>Expected: {g.expectedResolution}</p>
                          <p>Filed: {new Date(g.createdAt).toLocaleDateString("en-IN")}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : step === "form" ? (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <h3 className="font-bold text-orange-800 mb-1">File a Public Grievance</h3>
              <p className="text-sm text-orange-600">Your grievance will be forwarded to the concerned department officer for action within the specified timeline.</p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Select Department *</label>
              <div className="grid grid-cols-3 gap-2">
                {departments.map(d => (
                  <button key={d.id} onClick={() => setSelectedDept(d.id)}
                    className={`text-left p-3 rounded-xl border-2 transition-all text-sm ${selectedDept === d.id ? "border-orange-500 bg-orange-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <p className="font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.officer}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Your Name *</label>
                <Input value={applicantName} onChange={e => setApplicantName(e.target.value)} placeholder="Full name" className="h-11" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Phone Number</label>
                <Input value={applicantPhone} onChange={e => setApplicantPhone(e.target.value)} placeholder="Mobile number" className="h-11" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Subject *</label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief subject of grievance" className="h-11" />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Description *</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detailed description of your grievance..."
                className="w-full rounded-xl border-2 p-3 min-h-[100px] text-sm resize-none" />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Priority</label>
              <div className="flex gap-3">
                {(["low", "medium", "high"] as const).map(p => (
                  <button key={p} onClick={() => setPriority(p)}
                    className={`px-5 py-2 rounded-full text-sm font-medium capitalize transition-all ${priority === p ? (p === "high" ? "bg-red-600 text-white" : p === "medium" ? "bg-yellow-500 text-white" : "bg-green-600 text-white") : "bg-secondary text-muted-foreground"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <Button className="w-full h-12 text-lg rounded-xl bg-orange-600 hover:bg-orange-700" disabled={!selectedDept || !subject || !description || !applicantName || submitting} onClick={handleSubmit}>
              {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <FileText className="w-5 h-5 mr-2" />}
              Submit Grievance
            </Button>
          </div>
        ) : step === "confirm" ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-green-700">Grievance Registered!</h3>
            <div className="bg-white rounded-2xl p-6 border shadow-sm max-w-md mx-auto text-left space-y-3">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Grievance ID</p>
                <p className="text-2xl font-mono font-bold text-orange-700">{result?.grievanceId}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground">Department</p><p className="font-medium">{departments.find(d => d.id === selectedDept)?.name}</p></div>
                <div><p className="text-muted-foreground">Priority</p><p className="font-medium capitalize">{priority}</p></div>
                <div><p className="text-muted-foreground">Officer</p><p className="font-medium">{result?.grievance?.assignedOfficer}</p></div>
                <div><p className="text-muted-foreground">Expected By</p><p className="font-medium">{result?.grievance?.expectedResolution}</p></div>
              </div>
            </div>
            <Button className="h-12 px-8 rounded-xl" onClick={() => { setStep("list"); setSelectedDept(""); setSubject(""); setDescription(""); setResult(null); }}>
              Back to Portal
            </Button>
          </motion.div>
        ) : step === "track" ? (
          <div className="space-y-4">
            <div className="flex gap-3">
              <Input value={trackId} onChange={e => setTrackId(e.target.value)} placeholder="Enter Grievance ID (e.g. GRV-2026-...)" className="h-12 flex-1" />
              <Button className="h-12 px-6 bg-blue-600 hover:bg-blue-700 rounded-xl" onClick={handleTrack} disabled={tracking}>
                {tracking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              </Button>
            </div>

            {trackResult && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl p-6 border shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">{trackResult.grievanceId}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[trackResult.status] || "bg-gray-100"}`}>{trackResult.status.replace(/_/g, " ")}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-muted-foreground">Subject</p><p className="font-medium">{trackResult.subject}</p></div>
                  <div><p className="text-muted-foreground">Department</p><p className="font-medium">{departments.find(d => d.id === trackResult.department)?.name || trackResult.department}</p></div>
                  <div><p className="text-muted-foreground">Assigned Officer</p><p className="font-medium">{trackResult.assignedOfficer}</p></div>
                  <div><p className="text-muted-foreground">Priority</p><p className={`font-medium px-2 py-0.5 rounded-full inline-block text-xs ${priorityColors[trackResult.priority]}`}>{trackResult.priority}</p></div>
                  <div><p className="text-muted-foreground">Filed On</p><p className="font-medium">{new Date(trackResult.createdAt).toLocaleDateString("en-IN")}</p></div>
                  <div><p className="text-muted-foreground">Expected Resolution</p><p className="font-medium">{trackResult.expectedResolution}</p></div>
                </div>
                <div><p className="text-muted-foreground text-sm">Description</p><p className="text-sm bg-secondary rounded-xl p-3">{trackResult.description}</p></div>
              </motion.div>
            )}
            {trackResult === null && trackId && !tracking && (
              <p className="text-center text-muted-foreground py-8">No grievance found with this ID</p>
            )}
          </div>
        ) : null}
      </div>
    </KioskLayout>
  );
}
