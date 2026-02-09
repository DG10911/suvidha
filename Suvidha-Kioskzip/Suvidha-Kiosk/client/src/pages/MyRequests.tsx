import KioskLayout from "@/components/layout/KioskLayout";
import { Clock, CheckCircle2, Timer, AlertTriangle, RotateCcw, QrCode, ChevronRight, ChevronDown, Filter, XCircle, Search, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { loadPreferences } from "@/lib/userPreferences";
import { t, type TranslationKey } from "@/lib/translations";
import { getRequests, updateRequestStatus, fetchRequestsFromApi, type ServiceRequest } from "@/lib/kioskStore";

const statusConfig = {
  submitted: { color: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock, labelKey: "status_submitted" as TranslationKey },
  in_progress: { color: "bg-amber-100 text-amber-700 border-amber-200", icon: Timer, labelKey: "status_in_progress" as TranslationKey },
  resolved: { color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2, labelKey: "status_resolved" as TranslationKey },
  closed: { color: "bg-gray-100 text-gray-600 border-gray-200", icon: CheckCircle2, labelKey: "status_resolved" as TranslationKey },
  rejected: { color: "bg-red-100 text-red-700 border-red-200", icon: XCircle, labelKey: "status_submitted" as TranslationKey },
};

const urgencyColors = {
  low: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

function getSlaInfo(deadline: string) {
  const now = new Date();
  const sla = new Date(deadline);
  const diff = sla.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (diff <= 0) return { text: "SLA Breached", color: "text-red-600 bg-red-50", overdue: true };
  if (hours <= 24) return { text: `${hours}h remaining`, color: "text-amber-600 bg-amber-50", overdue: false };
  return { text: `${days}d ${remainingHours}h remaining`, color: "text-green-600 bg-green-50", overdue: false };
}

export default function MyRequests() {
  const [lang, setLang] = useState(() => loadPreferences().language);
  const [requests, setRequests] = useState<ServiceRequest[]>(() => getRequests());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "urgency" | "sla">("date");
  const [reopenConfirm, setReopenConfirm] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.language) setLang(detail.language);
    };
    window.addEventListener("prefs-changed", handler);
    return () => window.removeEventListener("prefs-changed", handler);
  }, []);

  useEffect(() => {
    const handler = () => setRequests(getRequests());
    window.addEventListener("kiosk-store-changed", handler);
    return () => window.removeEventListener("kiosk-store-changed", handler);
  }, []);

  useEffect(() => {
    fetchRequestsFromApi().then((data) => setRequests(data));
  }, []);

  const filteredRequests = useMemo(() => {
    let result = [...requests];
    if (filterStatus !== "all") {
      result = result.filter((r) => r.status === filterStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((r) =>
        r.id.toLowerCase().includes(q) ||
        r.service.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    }
    switch (sortBy) {
      case "date":
        result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case "urgency": {
        const order = { high: 0, medium: 1, low: 2 };
        result.sort((a, b) => order[a.urgency] - order[b.urgency]);
        break;
      }
      case "sla":
        result.sort((a, b) => new Date(a.slaDeadline).getTime() - new Date(b.slaDeadline).getTime());
        break;
    }
    return result;
  }, [requests, filterStatus, sortBy, searchQuery]);

  const handleReopen = (id: string) => {
    if (!reopenReason.trim()) return;
    updateRequestStatus(id, "in_progress", `Reopened: ${reopenReason}`);
    setRequests(getRequests());
    setReopenConfirm(null);
    setReopenReason("");
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: requests.length };
    requests.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return counts;
  }, [requests]);

  return (
    <KioskLayout>
      <div className="space-y-5 max-w-4xl mx-auto w-full">
        <div>
          <h2 className="text-3xl font-bold font-heading">{t("my_requests", lang)}</h2>
          <p className="text-lg text-muted-foreground mt-1">{t("my_requests_desc", lang)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "all", label: "All" },
            { key: "submitted", label: "Submitted" },
            { key: "in_progress", label: "In Progress" },
            { key: "resolved", label: "Resolved" },
            { key: "closed", label: "Closed" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filterStatus === f.key
                  ? "bg-primary text-white shadow-md"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              {f.label} {statusCounts[f.key] ? `(${statusCounts[f.key]})` : ""}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by ID, service, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            />
          </div>
          <div className="flex items-center gap-1 bg-white border border-border rounded-xl px-3 py-1.5">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm bg-transparent border-none outline-none cursor-pointer"
            >
              <option value="date">Newest First</option>
              <option value="urgency">By Urgency</option>
              <option value="sla">By SLA Deadline</option>
            </select>
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Clock className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-xl">{t("no_requests", lang)}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((req, index) => {
              const config = statusConfig[req.status] || statusConfig.submitted;
              const StatusIcon = config.icon;
              const slaInfo = (req.status === "submitted" || req.status === "in_progress") ? getSlaInfo(req.slaDeadline) : null;
              const isExpanded = expandedId === req.id;

              return (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="bg-white rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  <div
                    className="p-5 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : req.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-lg text-primary">#{req.id}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${urgencyColors[req.urgency]}`}>
                            {req.urgency.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-base text-muted-foreground">{req.service} - {req.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold border flex items-center gap-1.5 ${config.color}`}>
                          <StatusIcon className="w-4 h-4" />
                          {t(config.labelKey, lang)}
                        </span>
                        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Filed: {new Date(req.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                      {slaInfo && (
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${slaInfo.color}`}>
                          {slaInfo.overdue ? <AlertTriangle className="w-3.5 h-3.5" /> : <Timer className="w-3.5 h-3.5" />}
                          {slaInfo.text}
                        </span>
                      )}
                    </div>

                    {req.officerRemarks && (
                      <div className="bg-secondary/50 rounded-xl px-4 py-2 text-sm mt-3">
                        <span className="font-medium">Officer: </span>{req.officerRemarks}
                      </div>
                    )}
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 border-t border-border pt-4 space-y-4">
                          <div>
                            <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-1">Description</h4>
                            <p className="text-sm">{req.description}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-secondary/30 rounded-xl px-4 py-3">
                              <p className="text-xs text-muted-foreground uppercase tracking-wider">Assigned To</p>
                              <p className="font-medium">{req.assignedTo}</p>
                            </div>
                            <div className="bg-secondary/30 rounded-xl px-4 py-3">
                              <p className="text-xs text-muted-foreground uppercase tracking-wider">SLA Deadline</p>
                              <p className="font-medium">{new Date(req.slaDeadline).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                            </div>
                          </div>

                          {req.resolution && (
                            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                              <p className="text-xs text-green-600 uppercase tracking-wider font-bold mb-1">Resolution</p>
                              <p className="text-sm text-green-800">{req.resolution}</p>
                            </div>
                          )}

                          <div>
                            <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-3">Timeline</h4>
                            <div className="space-y-0 relative">
                              {req.timeline.map((entry, i) => (
                                <div key={i} className="flex gap-3 pb-4 last:pb-0">
                                  <div className="flex flex-col items-center">
                                    <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                                      i === req.timeline.length - 1 ? "bg-primary border-primary" : "bg-white border-primary/40"
                                    }`} />
                                    {i < req.timeline.length - 1 && (
                                      <div className="w-0.5 flex-1 bg-primary/20 mt-1" />
                                    )}
                                  </div>
                                  <div className="flex-1 -mt-0.5">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="text-xs font-bold text-primary">{entry.status}</span>
                                      <span className="text-xs text-muted-foreground">{entry.date}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{entry.note}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 pt-2">
                            {(req.status === "resolved" || req.status === "closed") && (
                              reopenConfirm === req.id ? (
                                <div className="flex-1 space-y-2">
                                  <textarea
                                    value={reopenReason}
                                    onChange={(e) => setReopenReason(e.target.value)}
                                    placeholder="Why are you reopening this request?"
                                    className="w-full p-3 rounded-xl border border-amber-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-amber-50"
                                    rows={2}
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      className="rounded-full gap-1.5"
                                      onClick={() => handleReopen(req.id)}
                                      disabled={!reopenReason.trim()}
                                    >
                                      <RotateCcw className="w-4 h-4" />
                                      Confirm Reopen
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="rounded-full"
                                      onClick={() => { setReopenConfirm(null); setReopenReason(""); }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50"
                                  onClick={(e) => { e.stopPropagation(); setReopenConfirm(req.id); }}
                                >
                                  <RotateCcw className="w-4 h-4" />
                                  {t("reopen_request", lang)}
                                </Button>
                              )
                            )}
                          </div>
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
