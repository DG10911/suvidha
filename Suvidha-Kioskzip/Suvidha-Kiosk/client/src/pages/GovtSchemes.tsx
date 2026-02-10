import KioskLayout from "@/components/layout/KioskLayout";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Loader2, ExternalLink, BadgeCheck, ChevronDown, ChevronUp,
  FileText, ClipboardList, ShieldCheck, Sparkles, IndianRupee,
  Home, Heart, Leaf, Sun, Users, Briefcase, BookOpen, X, Search, Clock
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface Scheme {
  id: number;
  name: string;
  ministry: string;
  category: string;
  summary: string;
  eligibility: string;
  benefits: string;
  howToApply: string;
  documentsRequired: string;
  websiteUrl: string | null;
  lastDate: string | null;
  isNew: boolean;
  active: boolean;
  createdAt: string;
}

const categoryConfig: Record<string, { icon: typeof Home; color: string; bg: string; label: string }> = {
  housing: { icon: Home, color: "text-blue-600", bg: "bg-blue-100", label: "Housing" },
  health: { icon: Heart, color: "text-red-600", bg: "bg-red-100", label: "Health" },
  agriculture: { icon: Leaf, color: "text-green-600", bg: "bg-green-100", label: "Agriculture" },
  energy: { icon: Sun, color: "text-yellow-600", bg: "bg-yellow-100", label: "Energy" },
  women: { icon: Users, color: "text-pink-600", bg: "bg-pink-100", label: "Women & Children" },
  employment: { icon: Briefcase, color: "text-indigo-600", bg: "bg-indigo-100", label: "Employment" },
  pension: { icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-100", label: "Pension" },
  education: { icon: BookOpen, color: "text-purple-600", bg: "bg-purple-100", label: "Education" },
  general: { icon: FileText, color: "text-slate-600", bg: "bg-slate-100", label: "General" },
};

export default function GovtSchemes() {
  const [, navigate] = useLocation();
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Record<number, string>>({});

  useEffect(() => {
    setLoading(true);
    fetch("/api/schemes")
      .then(r => r.json())
      .then(data => {
        if (data.success) setSchemes(data.schemes);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(schemes.map(s => s.category));
    return Array.from(cats);
  }, [schemes]);

  const filtered = useMemo(() => {
    let result = schemes;
    if (filterCategory !== "all") {
      result = result.filter(s => s.category === filterCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.ministry.toLowerCase().includes(q)
      );
    }
    return result;
  }, [schemes, filterCategory, searchQuery]);

  const getTab = (id: number) => activeTab[id] || "apply";

  const setTab = (id: number, tab: string) => {
    setActiveTab(prev => ({ ...prev, [id]: tab }));
  };

  const renderMultiline = (text: string) => {
    return text.split("\n").map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      if (trimmed.startsWith("Step ")) {
        const stepMatch = trimmed.match(/^Step (\d+):\s*(.*)/);
        if (stepMatch) {
          return (
            <div key={i} className="flex gap-3 items-start py-2">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                {stepMatch[1]}
              </div>
              <p className="text-sm leading-relaxed pt-1">{stepMatch[2]}</p>
            </div>
          );
        }
      }
      if (trimmed.startsWith("•")) {
        return (
          <div key={i} className="flex gap-2 items-start py-1">
            <span className="text-primary mt-1.5 text-xs">●</span>
            <p className="text-sm leading-relaxed">{trimmed.slice(1).trim()}</p>
          </div>
        );
      }
      return <p key={i} className="text-sm leading-relaxed py-1">{trimmed}</p>;
    });
  };

  return (
    <KioskLayout>
      <div className="space-y-5 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="lg" className="rounded-full h-12 w-12 p-0" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex-1">
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <BadgeCheck className="w-8 h-8 text-green-600" />
              Government Schemes
            </h2>
            <p className="text-muted-foreground">Latest schemes, eligibility, benefits & how to apply</p>
          </div>
          <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            {schemes.filter(s => s.isNew).length} New
          </div>
        </div>

        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search schemes by name, ministry, or keyword..."
            className="h-12 pl-12 rounded-xl border-2 text-base"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterCategory("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filterCategory === "all" ? "bg-primary text-white shadow-md" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            All ({schemes.length})
          </button>
          {categories.map(cat => {
            const cfg = categoryConfig[cat] || categoryConfig.general;
            const cnt = schemes.filter(s => s.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                  filterCategory === cat ? "bg-primary text-white shadow-md" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                }`}
              >
                {cfg.label} ({cnt})
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BadgeCheck className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-xl">No schemes found</p>
            {searchQuery && <p className="text-sm mt-2">Try a different search term</p>}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((scheme, index) => {
              const cfg = categoryConfig[scheme.category] || categoryConfig.general;
              const SchemeIcon = cfg.icon;
              const isExpanded = expandedId === scheme.id;
              const tab = getTab(scheme.id);

              return (
                <motion.div
                  key={scheme.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : scheme.id)}
                    className="w-full p-5 text-left"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
                        <SchemeIcon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-lg font-bold">{scheme.name}</h3>
                          {scheme.isNew && (
                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />NEW
                            </span>
                          )}
                          {scheme.lastDate && (
                            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3" />Last: {scheme.lastDate}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{scheme.ministry}</p>
                        <p className="text-sm leading-relaxed text-foreground/80">{scheme.summary}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 mt-1">
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                      </div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 border-t">
                          <div className="flex gap-1 mt-4 mb-4 bg-secondary rounded-xl p-1">
                            {[
                              { key: "apply", label: "How to Apply", icon: ClipboardList },
                              { key: "eligibility", label: "Eligibility", icon: ShieldCheck },
                              { key: "benefits", label: "Benefits", icon: IndianRupee },
                              { key: "documents", label: "Documents", icon: FileText },
                            ].map(t => (
                              <button
                                key={t.key}
                                onClick={(e) => { e.stopPropagation(); setTab(scheme.id, t.key); }}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                  tab === t.key ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                <t.icon className="w-4 h-4" />
                                {t.label}
                              </button>
                            ))}
                          </div>

                          <div className="min-h-[120px]">
                            {tab === "apply" && (
                              <div className="space-y-1">
                                <h4 className="font-bold text-base mb-3 flex items-center gap-2">
                                  <ClipboardList className="w-5 h-5 text-primary" />
                                  Steps to Apply
                                </h4>
                                {renderMultiline(scheme.howToApply)}
                              </div>
                            )}
                            {tab === "eligibility" && (
                              <div className="space-y-1">
                                <h4 className="font-bold text-base mb-3 flex items-center gap-2">
                                  <ShieldCheck className="w-5 h-5 text-primary" />
                                  Who Can Apply
                                </h4>
                                {renderMultiline(scheme.eligibility)}
                              </div>
                            )}
                            {tab === "benefits" && (
                              <div className="space-y-1">
                                <h4 className="font-bold text-base mb-3 flex items-center gap-2">
                                  <IndianRupee className="w-5 h-5 text-primary" />
                                  Scheme Benefits
                                </h4>
                                {renderMultiline(scheme.benefits)}
                              </div>
                            )}
                            {tab === "documents" && (
                              <div className="space-y-1">
                                <h4 className="font-bold text-base mb-3 flex items-center gap-2">
                                  <FileText className="w-5 h-5 text-primary" />
                                  Documents Required
                                </h4>
                                {renderMultiline(scheme.documentsRequired)}
                              </div>
                            )}
                          </div>

                          {scheme.websiteUrl && (
                            <div className="mt-4 pt-3 border-t">
                              <a
                                href={scheme.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2.5 rounded-xl font-medium hover:bg-primary/20 transition-colors text-sm"
                              >
                                <ExternalLink className="w-4 h-4" />
                                Visit Official Website
                              </a>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </KioskLayout>
  );
}
