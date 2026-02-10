import KioskLayout from "@/components/layout/KioskLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Droplets, Search, CheckCircle2, Loader2, IndianRupee,
  Calculator, Calendar, Gauge, CreditCard, Receipt, AlertCircle,
  TrendingUp, ArrowRight
} from "lucide-react";
import { loadPreferences } from "@/lib/userPreferences";

interface WaterBill {
  id: number;
  connectionId: string;
  consumerName: string;
  billMonth: string;
  unitsConsumed: number;
  billAmount: string;
  dueDate: string;
  status: string;
}

type Step = "home" | "bills" | "calculator" | "pay_success";

export default function WaterBillPage() {
  const [, navigate] = useLocation();
  const prefs = loadPreferences();
  const userId = prefs.userId;

  const [step, setStep] = useState<Step>("home");
  const [loading, setLoading] = useState(false);

  const [connectionId, setConnectionId] = useState("");
  const [consumerName, setConsumerName] = useState(prefs.userName || "");
  const [bills, setBills] = useState<WaterBill[]>([]);

  const [calcUnits, setCalcUnits] = useState("");
  const [calcResult, setCalcResult] = useState<any>(null);

  const [paying, setPaying] = useState(false);
  const [paidBill, setPaidBill] = useState<WaterBill | null>(null);

  const fetchBills = async () => {
    if (!connectionId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/water/generate-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, connectionId, consumerName }),
      });
      const data = await res.json();
      if (data.success) {
        setBills(data.bills);
        setStep("bills");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (bill: WaterBill) => {
    setPaying(true);
    try {
      const res = await fetch("/api/water/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billId: bill.id, userId }),
      });
      const data = await res.json();
      if (data.success) {
        setPaidBill(bill);
        setStep("pay_success");
      } else {
        alert(data.message || "Payment failed");
      }
    } finally {
      setPaying(false);
    }
  };

  const handleCalc = async () => {
    if (!calcUnits) return;
    const res = await fetch("/api/water/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ units: calcUnits }),
    });
    const data = await res.json();
    if (data.success) setCalcResult(data.calculation);
  };

  const unpaidBills = bills.filter(b => b.status === "unpaid");
  const paidBills = bills.filter(b => b.status === "paid");
  const totalDue = unpaidBills.reduce((sum, b) => sum + parseFloat(b.billAmount), 0);

  return (
    <KioskLayout>
      <div className="space-y-5 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="lg" className="rounded-full h-12 w-12 p-0" onClick={() => step === "home" ? navigate("/dashboard") : setStep("home")}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex-1">
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <Droplets className="w-8 h-8 text-cyan-600" />
              Water Bill & Payment
            </h2>
            <p className="text-muted-foreground">View bills, pay online, calculate charges</p>
          </div>
        </div>

        {step === "home" ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-2xl p-6">
                <Receipt className="w-10 h-10 mb-3" />
                <h3 className="text-xl font-bold">View & Pay Bills</h3>
                <p className="text-white/80 text-sm mt-1">Enter your connection ID to see bills</p>
                <div className="mt-4 space-y-3">
                  <Input value={connectionId} onChange={e => setConnectionId(e.target.value)} placeholder="Water Connection ID (e.g. WTR-12345)"
                    className="h-11 bg-white/20 border-white/30 text-white placeholder:text-white/60" />
                  <Input value={consumerName} onChange={e => setConsumerName(e.target.value)} placeholder="Consumer Name"
                    className="h-11 bg-white/20 border-white/30 text-white placeholder:text-white/60" />
                  <Button className="w-full h-11 bg-white text-cyan-700 hover:bg-white/90 font-bold rounded-xl" disabled={!connectionId || loading} onClick={fetchBills}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                    Fetch Bills
                  </Button>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-2xl p-6 cursor-pointer hover:shadow-xl"
                onClick={() => setStep("calculator")}>
                <Calculator className="w-10 h-10 mb-3" />
                <h3 className="text-xl font-bold">Bill Calculator</h3>
                <p className="text-white/80 text-sm mt-1">Estimate water charges by units consumed</p>
                <div className="mt-4 bg-white/10 rounded-xl p-3 text-sm">
                  <p className="font-medium">Slab Rates:</p>
                  <p className="text-white/80">0-15 units: ₹5/unit</p>
                  <p className="text-white/80">15-20 units: ₹6.50/unit</p>
                  <p className="text-white/80">20-25 units: ₹8/unit</p>
                  <p className="text-white/80">25+ units: ₹10/unit</p>
                </div>
              </motion.div>
            </div>
          </div>
        ) : step === "bills" ? (
          <div className="space-y-4">
            <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-cyan-600">Connection: <span className="font-bold text-cyan-800">{connectionId}</span></p>
                <p className="text-sm text-cyan-600">Consumer: <span className="font-bold text-cyan-800">{consumerName}</span></p>
              </div>
              {totalDue > 0 && (
                <div className="text-right">
                  <p className="text-sm text-cyan-600">Total Due</p>
                  <p className="text-2xl font-bold text-red-600">₹{totalDue.toFixed(2)}</p>
                </div>
              )}
            </div>

            {unpaidBills.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-red-700 mb-3 flex items-center gap-2"><AlertCircle className="w-5 h-5" />Pending Bills</h3>
                <div className="space-y-3">
                  {unpaidBills.map((bill, i) => (
                    <motion.div key={bill.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                      className="bg-white rounded-xl p-4 border-2 border-red-100 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-bold text-lg">{bill.billMonth}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1"><Gauge className="w-3.5 h-3.5" />{bill.unitsConsumed} KL consumed</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-red-600">₹{bill.billAmount}</p>
                          <p className="text-xs text-muted-foreground">Due: {bill.dueDate}</p>
                        </div>
                      </div>
                      <Button className="w-full h-11 bg-cyan-600 hover:bg-cyan-700 rounded-xl" onClick={() => handlePay(bill)} disabled={paying}>
                        {paying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
                        Pay from Wallet
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {paidBills.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-green-700 mb-3 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" />Paid Bills</h3>
                <div className="space-y-2">
                  {paidBills.map((bill, i) => (
                    <motion.div key={bill.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="bg-white rounded-xl p-4 border shadow-sm flex items-center justify-between">
                      <div>
                        <p className="font-medium">{bill.billMonth}</p>
                        <p className="text-sm text-muted-foreground">{bill.unitsConsumed} KL consumed</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-700">₹{bill.billAmount}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Paid</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {bills.length > 1 && (
              <div className="bg-secondary rounded-xl p-4">
                <h4 className="font-bold text-sm mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Consumption Trend</h4>
                <div className="flex items-end gap-2 h-24">
                  {[...bills].reverse().map((b, i) => {
                    const maxUnits = Math.max(...bills.map(x => x.unitsConsumed));
                    const height = (b.unitsConsumed / maxUnits) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] font-bold">{b.unitsConsumed}</span>
                        <div className={`w-full rounded-t-md ${b.status === "paid" ? "bg-green-400" : "bg-red-400"}`} style={{ height: `${height}%` }} />
                        <span className="text-[9px] text-muted-foreground truncate w-full text-center">{b.billMonth.split(" ")[0].slice(0, 3)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : step === "calculator" ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <h3 className="font-bold text-emerald-800">Water Bill Calculator</h3>
              <p className="text-sm text-emerald-600">Enter water consumption in kiloliters (KL) to estimate your monthly bill.</p>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Units Consumed (KL)</label>
              <Input type="number" value={calcUnits} onChange={e => setCalcUnits(e.target.value)} placeholder="Enter units consumed" className="h-12 text-lg" />
            </div>

            <Button className="w-full h-12 text-lg rounded-xl bg-emerald-600 hover:bg-emerald-700" onClick={handleCalc} disabled={!calcUnits}>
              <Calculator className="w-5 h-5 mr-2" />Calculate Bill
            </Button>

            {calcResult && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl p-6 border shadow-sm space-y-4">
                <div className="text-center mb-4">
                  <p className="text-sm text-muted-foreground">Estimated Monthly Bill</p>
                  <p className="text-4xl font-bold text-emerald-700">₹{calcResult.total}</p>
                  <p className="text-sm text-muted-foreground">{calcResult.slab}</p>
                </div>
                <div className="space-y-2">
                  {calcResult.breakdown.map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between bg-secondary rounded-lg px-4 py-2.5 text-sm">
                      <span>{item.name}</span>
                      <span className="font-bold">₹{item.amount}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between bg-emerald-100 rounded-lg px-4 py-3 text-sm font-bold text-emerald-800">
                    <span>Total</span>
                    <span>₹{calcResult.total}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        ) : step === "pay_success" ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-green-700">Payment Successful!</h3>
            <div className="bg-white rounded-2xl p-6 border shadow-sm max-w-md mx-auto space-y-3 text-left">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Amount Paid</p>
                <p className="text-3xl font-bold text-green-700">₹{paidBill?.billAmount}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground">Bill Month</p><p className="font-medium">{paidBill?.billMonth}</p></div>
                <div><p className="text-muted-foreground">Units</p><p className="font-medium">{paidBill?.unitsConsumed} KL</p></div>
                <div><p className="text-muted-foreground">Connection</p><p className="font-medium">{paidBill?.connectionId}</p></div>
                <div><p className="text-muted-foreground">Method</p><p className="font-medium">Wallet</p></div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Payment receipt saved in Documents.</p>
            <Button className="h-12 px-8 rounded-xl" onClick={() => { setStep("home"); setBills([]); }}>Back to Water Bills</Button>
          </motion.div>
        ) : null}
      </div>
    </KioskLayout>
  );
}
