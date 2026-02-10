import KioskLayout from "@/components/layout/KioskLayout";
import { 
  Zap, Droplets, Flame, Trash2, Construction, FileText, AlertTriangle, 
  ChevronRight, Bell, FolderOpen, User, MessageSquare, Shield, Clock,
  CreditCard, Wrench, CircleAlert, Landmark, Type, Wallet,
  Receipt, BellRing, CheckCircle2, Timer, Calendar, Megaphone, ShieldAlert, Star,
  TrendingUp, Ticket, IndianRupee, BadgeCheck
} from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { loadPreferences } from "@/lib/userPreferences";
import { t, type TranslationKey } from "@/lib/translations";
import { getUnreadCount, getRequests, fetchNotificationsFromApi, fetchRequestsFromApi } from "@/lib/kioskStore";

const mainServices = [
  {
    id: "electricity",
    titleKey: "electricity" as TranslationKey,
    icon: Zap,
    color: "bg-yellow-500",
    descKey: "electricity_desc" as TranslationKey,
    quickActions: [
      { label: "pay_bill" as TranslationKey, icon: CreditCard },
      { label: "register_complaint" as TranslationKey, icon: FileText },
      { label: "new_connection" as TranslationKey, icon: Wrench },
      { label: "outage_info" as TranslationKey, icon: CircleAlert },
    ],
    alert: true,
  },
  {
    id: "gas",
    titleKey: "gas_services" as TranslationKey,
    icon: Flame,
    color: "bg-orange-500",
    descKey: "gas_desc" as TranslationKey,
    quickActions: [
      { label: "cylinder_booking" as TranslationKey, icon: Flame },
      { label: "delivery_issue" as TranslationKey, icon: Wrench },
      { label: "leakage_emergency" as TranslationKey, icon: CircleAlert, emergency: true },
      { label: "subsidy_complaint" as TranslationKey, icon: FileText },
    ],
  },
  {
    id: "municipal",
    titleKey: "municipal_services" as TranslationKey,
    icon: Landmark,
    color: "bg-teal-600",
    descKey: "municipal_desc" as TranslationKey,
    megaTile: true,
    subServices: [
      { id: "water", label: "water_services" as TranslationKey, icon: Droplets, color: "text-blue-500" },
      { id: "waste", label: "waste_management" as TranslationKey, icon: Trash2, color: "text-green-600" },
      { id: "infrastructure", label: "urban_infrastructure" as TranslationKey, icon: Construction, color: "text-slate-600" },
    ],
  },
];

const bottomTiles = [
  {
    id: "complaints",
    titleKey: "complaint_center" as TranslationKey,
    icon: MessageSquare,
    color: "bg-purple-600",
    descKey: "complaint_center_desc" as TranslationKey,
    href: "/service/complaints",
  },
  {
    id: "requests",
    titleKey: "my_requests" as TranslationKey,
    icon: Clock,
    color: "bg-indigo-600",
    descKey: "my_requests_desc" as TranslationKey,
    href: "/dashboard/requests",
  },
  {
    id: "documents",
    titleKey: "documents_receipts" as TranslationKey,
    icon: FolderOpen,
    color: "bg-amber-600",
    descKey: "documents_desc" as TranslationKey,
    href: "/dashboard/documents",
  },
  {
    id: "notifications",
    titleKey: "notifications" as TranslationKey,
    icon: Bell,
    color: "bg-rose-600",
    descKey: "notifications_desc" as TranslationKey,
    href: "/dashboard/notifications",
  },
  {
    id: "wallet",
    titleKey: "wallet" as TranslationKey,
    icon: Wallet,
    color: "bg-emerald-600",
    descKey: "wallet_desc" as TranslationKey,
    href: "/dashboard/wallet",
  },
  {
    id: "profile",
    titleKey: "profile_settings" as TranslationKey,
    icon: User,
    color: "bg-cyan-600",
    descKey: "profile_desc" as TranslationKey,
    href: "/dashboard/profile",
  },
];

const newFeatureTiles = [
  {
    id: "appointments",
    title: "Appointments",
    desc: "Book office visits",
    icon: Calendar,
    color: "bg-indigo-500",
    href: "/dashboard/appointments",
  },
  {
    id: "announcements",
    title: "Announcements",
    desc: "Latest updates",
    icon: Megaphone,
    color: "bg-violet-500",
    href: "/dashboard/announcements",
  },
  {
    id: "emergency",
    title: "Emergency SOS",
    desc: "Quick help access",
    icon: ShieldAlert,
    color: "bg-red-600",
    href: "/dashboard/emergency",
    pulse: true,
  },
  {
    id: "feedback",
    title: "Feedback",
    desc: "Rate services",
    icon: Star,
    color: "bg-yellow-500",
    href: "/dashboard/feedback",
  },
  {
    id: "schemes",
    title: "Govt Schemes",
    desc: "Apply for new schemes",
    icon: BadgeCheck,
    color: "bg-green-600",
    href: "/dashboard/schemes",
  },
];

const mockAlerts = [
  { type: "warning", message: "high_alert" as TranslationKey },
];

export default function Dashboard() {
  const [prefs, setPrefs] = useState(() => loadPreferences());
  const [notifBadge, setNotifBadge] = useState(() => getUnreadCount());
  const [activeRequests, setActiveRequests] = useState(() => getRequests().filter(r => r.status === "submitted" || r.status === "in_progress").length);
  const lang = prefs.language;

  useEffect(() => {
    fetchNotificationsFromApi().then(notifs => setNotifBadge(notifs.filter(n => !n.read).length));
    fetchRequestsFromApi().then(reqs => setActiveRequests(reqs.filter(r => r.status === "submitted" || r.status === "in_progress").length));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) setPrefs(detail);
    };
    const storeHandler = () => {
      setNotifBadge(getUnreadCount());
      setActiveRequests(getRequests().filter(r => r.status === "submitted" || r.status === "in_progress").length);
    };
    window.addEventListener("prefs-changed", handler);
    window.addEventListener("kiosk-store-changed", storeHandler);
    return () => {
      window.removeEventListener("prefs-changed", handler);
      window.removeEventListener("kiosk-store-changed", storeHandler);
    };
  }, []);

  return (
    <KioskLayout>
      <div className="space-y-6 h-full flex flex-col pb-4">
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-3xl p-6 border border-primary/10"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold font-heading text-foreground">
                {t("welcome_citizen", lang)} 👋
              </h2>
              <p className="text-lg text-muted-foreground mt-1">{t("your_dashboard", lang)}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                {prefs.fontSize !== "normal" && (
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                    <Type className="w-3.5 h-3.5" />
                    {t("large_text", lang)}
                  </span>
                )}
                {prefs.highContrast && (
                  <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-medium">
                    {t("high_contrast", lang)}
                  </span>
                )}
                <span className="bg-secondary px-3 py-1 rounded-full font-medium text-muted-foreground">
                  {prefs.language}
                </span>
              </div>
              <div className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                <Shield className="w-3.5 h-3.5" />
                {t("session_secure", lang)}
              </div>
            </div>
          </div>
        </motion.div>

        {mockAlerts.length > 0 && (
          <div className="flex gap-3">
            {mockAlerts.map((alert, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-destructive/10 border border-destructive/20 text-destructive px-5 py-2.5 rounded-xl flex items-center gap-2 animate-pulse"
                role="alert"
              >
                <AlertTriangle className="h-5 w-5" />
                <span className="font-bold">{t(alert.message, lang)}</span>
              </motion.div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-5">
          {mainServices.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {service.megaTile ? (
                <div className="bg-white rounded-3xl p-5 border-2 border-transparent hover:border-teal-200 shadow-md hover:shadow-xl transition-all h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl ${service.color} text-white flex items-center justify-center shadow-md`}>
                      <service.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{t(service.titleKey, lang)}</h3>
                      <p className="text-sm text-muted-foreground">{t(service.descKey, lang)}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {service.subServices?.map((sub) => (
                      <Link key={sub.id} href={`/service/${sub.id}`}>
                        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/80 transition-colors cursor-pointer group">
                          <sub.icon className={`w-5 h-5 ${sub.color}`} />
                          <span className="font-medium text-base flex-1">{t(sub.label, lang)}</span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Link href={`/service/${service.id}`}>
                  <div className="bg-white rounded-3xl p-5 border-2 border-transparent hover:border-primary/20 shadow-md hover:shadow-xl transition-all cursor-pointer group h-full">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-12 h-12 rounded-xl ${service.color} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                        <service.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold group-hover:text-primary transition-colors">{t(service.titleKey, lang)}</h3>
                        <p className="text-sm text-muted-foreground">{t(service.descKey, lang)}</p>
                      </div>
                      {service.alert && (
                        <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {service.quickActions?.map((action) => (
                        <span
                          key={action.label}
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            (action as any).emergency 
                              ? "bg-red-100 text-red-700 border border-red-200" 
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {t(action.label, lang)}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              )}
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-4">
          {newFeatureTiles.map((tile, index) => (
            <Link key={tile.id} href={tile.href}>
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + index * 0.04 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`rounded-2xl p-5 shadow-md hover:shadow-xl transition-all cursor-pointer group text-white ${tile.color} relative overflow-hidden`}
              >
                {"pulse" in tile && tile.pulse && (
                  <span className="absolute top-3 right-3 w-3 h-3 bg-white rounded-full animate-pulse" />
                )}
                <tile.icon className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="text-lg font-bold leading-tight">{tile.title}</h4>
                <p className="text-sm text-white/80 mt-0.5">{tile.desc}</p>
              </motion.div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-6 gap-4">
          {bottomTiles.map((tile, index) => (
            <Link key={tile.id} href={tile.href}>
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.04 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="bg-white rounded-2xl p-4 border-2 border-transparent hover:border-primary/20 shadow-sm hover:shadow-lg transition-all cursor-pointer group text-center relative"
              >
                {tile.id === "notifications" && notifBadge > 0 && (
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {notifBadge}
                  </span>
                )}
                {tile.id === "requests" && activeRequests > 0 && (
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {activeRequests}
                  </span>
                )}
                <div className={`w-11 h-11 rounded-xl ${tile.color} text-white flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform shadow-sm`}>
                  <tile.icon className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold group-hover:text-primary transition-colors leading-tight">
                  {t(tile.titleKey, lang)}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{t(tile.descKey, lang)}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>

    </KioskLayout>
  );
}
