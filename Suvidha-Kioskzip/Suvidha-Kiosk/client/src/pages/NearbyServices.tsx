import KioskLayout from "@/components/layout/KioskLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Search, MapPin, Phone, Clock, Building2, Loader2,
  Heart, Shield, Landmark, Mail, GraduationCap, Flame, ShoppingBag, X
} from "lucide-react";

interface NearbyService {
  category: string;
  name: string;
  address: string;
  phone: string;
  type: string;
  hours: string;
}

const categoryConfig: Record<string, { icon: typeof Building2; color: string; bg: string; label: string }> = {
  hospital: { icon: Heart, color: "text-red-600", bg: "bg-red-100", label: "Hospitals" },
  police: { icon: Shield, color: "text-blue-700", bg: "bg-blue-100", label: "Police Stations" },
  bank: { icon: Landmark, color: "text-green-600", bg: "bg-green-100", label: "Banks" },
  postoffice: { icon: Mail, color: "text-amber-600", bg: "bg-amber-100", label: "Post Offices" },
  school: { icon: GraduationCap, color: "text-purple-600", bg: "bg-purple-100", label: "Schools" },
  gas: { icon: Flame, color: "text-orange-600", bg: "bg-orange-100", label: "Gas Agencies" },
  ration: { icon: ShoppingBag, color: "text-teal-600", bg: "bg-teal-100", label: "Ration Shops" },
};

export default function NearbyServices() {
  const [, navigate] = useLocation();
  const [services, setServices] = useState<NearbyService[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch("/api/nearby-services")
      .then(r => r.json())
      .then(data => { if (data.success) setServices(data.services); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(services.map(s => s.category));
    return Array.from(cats);
  }, [services]);

  const filtered = useMemo(() => {
    let result = services;
    if (filterCategory !== "all") result = result.filter(s => s.category === filterCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q) || s.type.toLowerCase().includes(q));
    }
    return result;
  }, [services, filterCategory, searchQuery]);

  const grouped = useMemo(() => {
    const groups: Record<string, NearbyService[]> = {};
    filtered.forEach(s => {
      if (!groups[s.category]) groups[s.category] = [];
      groups[s.category].push(s);
    });
    return groups;
  }, [filtered]);

  return (
    <KioskLayout>
      <div className="space-y-5 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="lg" className="rounded-full h-12 w-12 p-0" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex-1">
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <MapPin className="w-8 h-8 text-rose-600" />
              Nearby Services
            </h2>
            <p className="text-muted-foreground">Find hospitals, banks, police stations & more in Raipur</p>
          </div>
          <span className="bg-rose-100 text-rose-700 px-3 py-1.5 rounded-full text-sm font-medium">{services.length} Locations</span>
        </div>

        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name, address, or type..." className="h-12 pl-12 rounded-xl border-2 text-base" />
          {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterCategory("all")} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filterCategory === "all" ? "bg-primary text-white shadow-md" : "bg-secondary text-muted-foreground"}`}>
            All ({services.length})
          </button>
          {categories.map(cat => {
            const cfg = categoryConfig[cat] || { label: cat, bg: "bg-gray-100", color: "text-gray-600", icon: Building2 };
            return (
              <button key={cat} onClick={() => setFilterCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${filterCategory === cat ? "bg-primary text-white shadow-md" : "bg-secondary text-muted-foreground"}`}>
                {cfg.label} ({services.filter(s => s.category === cat).length})
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-rose-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <MapPin className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-xl">No services found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([cat, items]) => {
              const cfg = categoryConfig[cat] || { label: cat, bg: "bg-gray-100", color: "text-gray-600", icon: Building2 };
              const CatIcon = cfg.icon;
              return (
                <div key={cat}>
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.bg} ${cfg.color}`}><CatIcon className="w-4 h-4" /></div>
                    {cfg.label}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {items.map((svc, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                        className="bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md transition-shadow">
                        <h4 className="font-bold text-base mb-1">{svc.name}</h4>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground mb-2 inline-block">{svc.type}</span>
                        <div className="space-y-1.5 mt-2">
                          <p className="text-sm text-muted-foreground flex items-start gap-2"><MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />{svc.address}</p>
                          <p className="text-sm flex items-center gap-2"><Phone className="w-4 h-4 text-green-600" /><a href={`tel:${svc.phone}`} className="text-primary font-medium hover:underline">{svc.phone}</a></p>
                          <p className="text-sm text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4" />{svc.hours}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </KioskLayout>
  );
}
