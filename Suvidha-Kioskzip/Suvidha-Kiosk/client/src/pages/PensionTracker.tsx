import KioskLayout from "@/components/layout/KioskLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Wallet, Search, CheckCircle2, Loader2, Clock, 
  IndianRupee, Calendar, CreditCard, User, FileText, AlertCircle
} from "lucide-react";
import { loadPreferences } from "@/lib/userPreferences";

interface PensionScheme {
  id: string;
  name: string;
  amount: string;
  eligibility: string;
}

interface PensionPayment {
  month: string;
  amount: string;
  status: string;
  transactionId: string;
}

interface PensionRecord {
  pensionId: string;
  pensionerName: string;
  scheme: string;
  monthlyAmount: string;
  bankAccount: string;
  status: string;
  lastPaymentDate: string;
  nextPaymentDate: string;
  recentPayments: PensionPayment[];
}

type Step = "home" | "check" | "register" | "result" | "register_done";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  pending_verification: "bg-yellow-100 text-yellow-700",
  suspended: "bg-red-100 text-red-700",
  completed: "bg-gray-100 text-gray-700",
};

export default function PensionTracker() {
  const [, navigate] = useLocation();
  const prefs = loadPreferences();
  const userId = prefs.userId;

  const [step, setStep] = useState<Step>("home");
  const [schemes, setSchemes] = useState<PensionScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<PensionRecord[]>([]);

  const [aadhaarInput, setAadhaarInput] = useState("");
  const [checking, setChecking] = useState(false);

  const [regName, setRegName] = useState(prefs.userName || "");
  const [regScheme, setRegScheme] = useState("");
  const [regBank, setRegBank] = useState("");
  const [registering, setRegistering] = useState(false);
  const [regResult, setRegResult] = useState<any>(null);

  useEffect(() => {
    fetch("/api/pension/schemes")
      .then(r => r.json())
      .then(data => { if (data.success) setSchemes(data.schemes); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleCheck = async () => {
    setChecking(true);
    try {
      const params = userId ? `userId=${userId}` : `aadhaar=${aadhaarInput}`;
      const res = await fetch(`/api/pension/check?${params}`);
      const data = await res.json();
      setRecords(data.success ? data.records : []);
      setStep("result");
    } finally {
      setChecking(false);
    }
  };

  const handleRegister = async () => {
    if (!regName || !regScheme) return;
    setRegistering(true);
    try {
      const res = await fetch("/api/pension/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, pensionerName: regName, scheme: regScheme, bankAccount: regBank }),
      });
      const data = await res.json();
      if (data.success) {
        setRegResult(data);
        setStep("register_done");
      }
    } finally {
      setRegistering(false);
    }
  };

  return (
    <KioskLayout>
      <div className="space-y-5 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="lg" className="rounded-full h-12 w-12 p-0" onClick={() => step === "home" ? navigate("/dashboard") : setStep("home")}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex-1">
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <Wallet className="w-8 h-8 text-purple-600" />
              Pension Tracker
            </h2>
            <p className="text-muted-foreground">Check pension status, payment history & apply for new pension</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>
        ) : step === "home" ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-2xl p-6 cursor-pointer hover:shadow-xl transition-shadow"
                onClick={() => setStep("check")}>
                <Search className="w-10 h-10 mb-3" />
                <h3 className="text-xl font-bold">Check Pension Status</h3>
                <p className="text-white/80 text-sm mt-1">View payments & next due date</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-6 cursor-pointer hover:shadow-xl transition-shadow"
                onClick={() => setStep("register")}>
                <FileText className="w-10 h-10 mb-3" />
                <h3 className="text-xl font-bold">Apply for Pension</h3>
                <p className="text-white/80 text-sm mt-1">Register under government schemes</p>
              </motion.div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-3">Available Pension Schemes</h3>
              <div className="space-y-3">
                {schemes.map((s, i) => (
                  <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="bg-white rounded-xl p-4 border shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold">{s.name}</h4>
                        <p className="text-sm text-muted-foreground">{s.eligibility}</p>
                      </div>
                      <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-bold">₹{s.amount}/mo</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        ) : step === "check" ? (
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <h3 className="font-bold text-purple-800">Check Your Pension Status</h3>
              <p className="text-sm text-purple-600">View disbursement details, payment history and next payment date.</p>
            </div>
            {!userId && (
              <div>
                <label className="text-sm font-medium mb-1 block">Aadhaar Number</label>
                <Input value={aadhaarInput} onChange={e => setAadhaarInput(e.target.value)} placeholder="Enter 12-digit Aadhaar" className="h-12" maxLength={12} />
              </div>
            )}
            <Button className="w-full h-12 text-lg rounded-xl bg-purple-600 hover:bg-purple-700" onClick={handleCheck} disabled={checking || (!userId && aadhaarInput.length < 12)}>
              {checking ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Search className="w-5 h-5 mr-2" />}
              Check Status
            </Button>
          </div>
        ) : step === "result" ? (
          <div className="space-y-4">
            {records.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                <h3 className="text-xl font-bold mb-2">No Pension Records Found</h3>
                <p className="text-muted-foreground mb-4">No pension linked to this account. You can apply for a new pension.</p>
                <Button className="bg-green-600 hover:bg-green-700 rounded-xl" onClick={() => setStep("register")}>Apply for Pension</Button>
              </div>
            ) : (
              records.map((r, i) => (
                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl p-6 border shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pension ID</p>
                      <p className="text-xl font-mono font-bold text-purple-700">{r.pensionId}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[r.status] || "bg-gray-100"}`}>{r.status.replace(/_/g, " ")}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" /><div><p className="text-muted-foreground">Name</p><p className="font-medium">{r.pensionerName}</p></div></div>
                    <div className="flex items-center gap-2"><IndianRupee className="w-4 h-4 text-muted-foreground" /><div><p className="text-muted-foreground">Monthly</p><p className="font-bold text-green-700">₹{r.monthlyAmount}</p></div></div>
                    <div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-muted-foreground" /><div><p className="text-muted-foreground">Scheme</p><p className="font-medium">{schemes.find(s => s.id === r.scheme)?.name || r.scheme}</p></div></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-secondary rounded-xl p-4 text-sm">
                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-green-600" /><div><p className="text-muted-foreground">Next Payment</p><p className="font-bold text-green-700">{r.nextPaymentDate || "Pending"}</p></div></div>
                    <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-blue-600" /><div><p className="text-muted-foreground">Last Payment</p><p className="font-medium">{r.lastPaymentDate || "N/A"}</p></div></div>
                  </div>

                  {r.recentPayments && r.recentPayments.length > 0 && (
                    <div>
                      <h4 className="font-bold text-sm mb-2">Payment History</h4>
                      <div className="space-y-1.5">
                        {r.recentPayments.map((p, j) => (
                          <div key={j} className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2 text-sm">
                            <span className="font-medium">{p.month}</span>
                            <span className="font-bold text-green-700">₹{p.amount}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{p.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        ) : step === "register" ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h3 className="font-bold text-green-800">Apply for Pension Scheme</h3>
              <p className="text-sm text-green-600">Select a scheme and submit your application. Verification will be done within 15 days.</p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Select Pension Scheme *</label>
              <div className="space-y-2">
                {schemes.map(s => (
                  <button key={s.id} onClick={() => setRegScheme(s.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${regScheme === s.id ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <div className="flex items-center justify-between">
                      <div><p className="font-bold">{s.name}</p><p className="text-xs text-muted-foreground">{s.eligibility}</p></div>
                      <span className="font-bold text-green-700">₹{s.amount}/mo</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium mb-1 block">Full Name *</label><Input value={regName} onChange={e => setRegName(e.target.value)} className="h-11" /></div>
              <div><label className="text-sm font-medium mb-1 block">Bank Account No.</label><Input value={regBank} onChange={e => setRegBank(e.target.value)} placeholder="For direct transfer" className="h-11" /></div>
            </div>

            <Button className="w-full h-12 text-lg rounded-xl bg-green-600 hover:bg-green-700" disabled={!regName || !regScheme || registering} onClick={handleRegister}>
              {registering ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              Submit Application
            </Button>
          </div>
        ) : step === "register_done" ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-green-700">Pension Application Submitted!</h3>
            <div className="bg-white rounded-2xl p-6 border shadow-sm max-w-md mx-auto">
              <p className="text-sm text-muted-foreground">Pension ID</p>
              <p className="text-2xl font-mono font-bold text-purple-700 mb-3">{regResult?.pensionId}</p>
              <p className="text-sm text-muted-foreground">Scheme: {schemes.find(s => s.id === regScheme)?.name}</p>
              <p className="text-sm text-muted-foreground">Status: Pending Verification (15 working days)</p>
            </div>
            <Button className="h-12 px-8 rounded-xl" onClick={() => setStep("home")}>Back to Pension Tracker</Button>
          </motion.div>
        ) : null}
      </div>
    </KioskLayout>
  );
}
