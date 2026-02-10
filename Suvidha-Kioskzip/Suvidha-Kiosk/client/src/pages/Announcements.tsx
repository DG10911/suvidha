import KioskLayout from "@/components/layout/KioskLayout";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Megaphone, AlertTriangle, Droplets, Zap, Flame, Construction,
  ArrowLeft, Heart, FileText, DollarSign, Loader2, Tag
} from "lucide-react";
import { loadPreferences } from "@/lib/userPreferences";

interface Announcement {
  id: number;
  title: string;
  body: string;
  category: string;
  priority: string;
  createdAt: string;
}

const categoryConfig: Record<string, { icon: typeof Megaphone; color: string; bg: string; label: string }> = {
  water: { icon: Droplets, color: "text-blue-600", bg: "bg-blue-100", label: "Water" },
  electricity: { icon: Zap, color: "text-yellow-600", bg: "bg-yellow-100", label: "Electricity" },
  gas: { icon: Flame, color: "text-orange-600", bg: "bg-orange-100", label: "Gas" },
  infrastructure: { icon: Construction, color: "text-slate-600", bg: "bg-slate-100", label: "Infrastructure" },
  health: { icon: Heart, color: "text-red-600", bg: "bg-red-100", label: "Health" },
  scheme: { icon: FileText, color: "text-green-600", bg: "bg-green-100", label: "Scheme" },
  tax: { icon: DollarSign, color: "text-purple-600", bg: "bg-purple-100", label: "Tax" },
  general: { icon: Megaphone, color: "text-indigo-600", bg: "bg-indigo-100", label: "General" },
};

export default function Announcements() {
  const [, navigate] = useLocation();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");

  useEffect(() => {
    setLoading(true);
    fetch("/api/announcements")
      .then(r => r.json())
      .then(data => {
        if (data.success) setAnnouncements(data.announcements);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(announcements.map(a => a.category));
    return Array.from(cats);
  }, [announcements]);

  const filtered = useMemo(() => {
    if (filterCategory === "all") return announcements;
    return announcements.filter(a => a.category === filterCategory);
  }, [announcements, filterCategory]);

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return d; }
  };

  return (
    <KioskLayout>
      <div className="space-y-5 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="lg" className="rounded-full h-12 w-12 p-0" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <Megaphone className="w-8 h-8 text-indigo-600" />
              Government Announcements
            </h2>
            <p className="text-muted-foreground">Latest updates, schemes, and important notices</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterCategory("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filterCategory === "all" ? "bg-primary text-white shadow-md" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            All ({announcements.length})
          </button>
          {categories.map(cat => {
            const cfg = categoryConfig[cat] || categoryConfig.general;
            const count = announcements.filter(a => a.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  filterCategory === cat ? "bg-primary text-white shadow-md" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                }`}
              >
                {cfg.label} ({count})
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Megaphone className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-xl">No announcements</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((item, index) => {
              const cfg = categoryConfig[item.category] || categoryConfig.general;
              const ItemIcon = cfg.icon;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white rounded-2xl p-6 border shadow-sm hover:shadow-md transition-shadow ${
                    item.priority === "high" ? "border-l-4 border-l-red-500" : ""
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
                      <ItemIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold">{item.title}</h3>
                        {item.priority === "high" && (
                          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />IMPORTANT
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground leading-relaxed">{item.body}</p>
                      <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </KioskLayout>
  );
}
