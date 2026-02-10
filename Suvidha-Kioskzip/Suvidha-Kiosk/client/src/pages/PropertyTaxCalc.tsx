import KioskLayout from "@/components/layout/KioskLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Calculator, IndianRupee, Building2, MapPin, Loader2,
  BarChart3, CheckCircle2, Info, Home, Factory, Store
} from "lucide-react";

interface TaxBreakdown {
  name: string;
  amount: number;
}

interface Calculation {
  annualValue: number;
  breakdown: TaxBreakdown[];
  totalTax: number;
  earlyPaymentDiscount: number;
  afterDiscount: number;
  ageDiscountApplied: string;
  selfOccupiedReduction: string;
}

const propertyTypes = [
  { id: "residential", label: "Residential", icon: Home, color: "bg-blue-100 text-blue-600" },
  { id: "commercial", label: "Commercial", icon: Store, color: "bg-purple-100 text-purple-600" },
  { id: "industrial", label: "Industrial", icon: Factory, color: "bg-slate-100 text-slate-600" },
  { id: "mixeduse", label: "Mixed Use", icon: Building2, color: "bg-teal-100 text-teal-600" },
];

const zones = [
  { id: "A", label: "Zone A (Prime)", desc: "Telibandha, Shankar Nagar, Civil Lines" },
  { id: "B", label: "Zone B (Urban)", desc: "Pandri, Devendra Nagar, Tatibandh" },
  { id: "C", label: "Zone C (Semi-Urban)", desc: "Fafadih, Moudhapara, Gudhiyari" },
  { id: "D", label: "Zone D (Peripheral)", desc: "Amanaka, Daldal Seoni, Mowa" },
];

const floors = [
  { id: "ground", label: "Ground Floor" },
  { id: "first", label: "First Floor" },
  { id: "second", label: "Second Floor" },
  { id: "third", label: "Third Floor+" },
];

export default function PropertyTaxCalc() {
  const [, navigate] = useLocation();
  const [propertyType, setPropertyType] = useState("");
  const [zone, setZone] = useState("");
  const [floor, setFloor] = useState("ground");
  const [builtUpArea, setBuiltUpArea] = useState("");
  const [age, setAge] = useState("");
  const [selfOccupied, setSelfOccupied] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Calculation | null>(null);

  const handleCalculate = async () => {
    if (!propertyType || !zone || !builtUpArea) return;
    setLoading(true);
    try {
      const res = await fetch("/api/tax/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyType, zone, builtUpArea, floor, age: age || "0", selfOccupied }),
      });
      const data = await res.json();
      if (data.success) setResult(data.calculation);
    } catch {}
    setLoading(false);
  };

  const resetCalc = () => {
    setPropertyType(""); setZone(""); setFloor("ground"); setBuiltUpArea(""); setAge(""); setSelfOccupied(true); setResult(null);
  };

  return (
    <KioskLayout>
      <div className="h-full flex flex-col max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="lg" className="rounded-full h-12 w-12 p-0" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex-1">
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <Calculator className="w-8 h-8 text-emerald-600" />
              Property Tax Calculator
            </h2>
            <p className="text-muted-foreground">Estimate your annual property tax for Raipur Municipal Corporation</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {result ? (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 space-y-4">
              <div className="bg-white rounded-3xl p-8 border shadow-lg">
                <div className="text-center mb-6">
                  <BarChart3 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                  <h3 className="text-2xl font-bold">Tax Calculation Summary</h3>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <p className="text-sm text-muted-foreground">Annual Value</p>
                    <p className="text-2xl font-bold text-blue-700">₹{result.annualValue.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-4 text-center">
                    <p className="text-sm text-muted-foreground">Total Tax</p>
                    <p className="text-2xl font-bold text-red-700">₹{result.totalTax.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <p className="text-sm text-muted-foreground">After Early Payment</p>
                    <p className="text-2xl font-bold text-green-700">₹{result.afterDiscount.toLocaleString("en-IN")}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-lg flex items-center gap-2"><IndianRupee className="w-5 h-5" />Tax Breakdown</h4>
                  {result.breakdown.map((item, i) => (
                    <div key={i} className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-semibold">₹{item.amount.toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 border-b font-bold">
                    <span>Total Annual Tax</span>
                    <span className="text-lg text-red-700">₹{result.totalTax.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b text-green-700">
                    <span>Early Payment Discount (10%)</span>
                    <span className="font-semibold">-₹{result.earlyPaymentDiscount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between py-2 font-bold text-lg">
                    <span>Pay Before Mar 15</span>
                    <span className="text-green-700">₹{result.afterDiscount.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <div className="mt-4 bg-secondary rounded-xl p-3 flex items-start gap-2 text-sm">
                  <Info className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p>Age Discount: {result.ageDiscountApplied} | {result.selfOccupiedReduction}</p>
                    <p className="text-muted-foreground mt-1">This is an estimate. Actual tax may vary based on municipal assessment.</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="h-14 flex-1 rounded-xl text-lg" onClick={resetCalc}>Recalculate</Button>
                <Button className="h-14 flex-1 rounded-xl text-lg" onClick={() => navigate("/dashboard")}>Dashboard</Button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 space-y-5">
              <div>
                <h3 className="text-lg font-bold mb-3">Property Type</h3>
                <div className="grid grid-cols-4 gap-3">
                  {propertyTypes.map(pt => (
                    <button key={pt.id} onClick={() => setPropertyType(pt.id)}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${
                        propertyType === pt.id ? "border-primary bg-primary/5 shadow-md" : "border-transparent bg-white hover:border-gray-200"
                      }`}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2 ${pt.color}`}><pt.icon className="w-5 h-5" /></div>
                      <span className="text-sm font-medium">{pt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-3">Zone / Location</h3>
                <div className="grid grid-cols-2 gap-3">
                  {zones.map(z => (
                    <button key={z.id} onClick={() => setZone(z.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        zone === z.id ? "border-primary bg-primary/5 shadow-md" : "border-transparent bg-white hover:border-gray-200"
                      }`}>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="font-bold">{z.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{z.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-medium mb-2 text-sm">Built-up Area (sq.ft) *</label>
                  <Input type="number" value={builtUpArea} onChange={(e) => setBuiltUpArea(e.target.value)} placeholder="e.g. 1200" className="h-12 rounded-xl border-2" />
                </div>
                <div>
                  <label className="block font-medium mb-2 text-sm">Property Age (years)</label>
                  <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 10" className="h-12 rounded-xl border-2" />
                </div>
                <div>
                  <label className="block font-medium mb-2 text-sm">Floor</label>
                  <select value={floor} onChange={(e) => setFloor(e.target.value)} className="w-full h-12 px-3 rounded-xl border-2 bg-background">
                    {floors.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer bg-white p-4 rounded-xl border">
                <input type="checkbox" checked={selfOccupied} onChange={(e) => setSelfOccupied(e.target.checked)} className="w-5 h-5" />
                <div>
                  <span className="font-medium">Self-Occupied Property</span>
                  <p className="text-xs text-muted-foreground">40% reduction if you live in this property</p>
                </div>
              </label>

              <Button className="w-full h-14 rounded-xl text-lg gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-lg"
                onClick={handleCalculate} disabled={!propertyType || !zone || !builtUpArea || loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calculator className="w-5 h-5" />}
                Calculate Property Tax
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </KioskLayout>
  );
}
