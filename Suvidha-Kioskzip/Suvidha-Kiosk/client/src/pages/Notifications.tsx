import KioskLayout from "@/components/layout/KioskLayout";
import { Bell, CheckCircle2, AlertTriangle, CreditCard, Clock, BellOff, Trash2, Info, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { loadPreferences } from "@/lib/userPreferences";
import { t, type TranslationKey } from "@/lib/translations";
import {
  getNotifications,
  fetchNotificationsFromApi,
  apiMarkNotificationRead,
  apiMarkAllNotificationsRead,
  apiDeleteNotification,
  type KioskNotification,
} from "@/lib/kioskStore";

const typeConfig: Record<string, { icon: typeof Bell; color: string; label: string }> = {
  payment: { icon: CreditCard, color: "text-green-600 bg-green-100", label: "Payment" },
  status: { icon: Clock, color: "text-blue-600 bg-blue-100", label: "Status Update" },
  alert: { icon: AlertTriangle, color: "text-red-600 bg-red-100", label: "Alert" },
  info: { icon: Info, color: "text-purple-600 bg-purple-100", label: "Information" },
};

export default function Notifications() {
  const [lang, setLang] = useState(() => loadPreferences().language);
  const [notifications, setNotifications] = useState<KioskNotification[]>(() => getNotifications());
  const [filterType, setFilterType] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.language) setLang(detail.language);
    };
    window.addEventListener("prefs-changed", handler);
    return () => window.removeEventListener("prefs-changed", handler);
  }, []);

  useEffect(() => {
    const handler = () => setNotifications(getNotifications());
    window.addEventListener("kiosk-store-changed", handler);
    return () => window.removeEventListener("kiosk-store-changed", handler);
  }, []);

  useEffect(() => {
    fetchNotificationsFromApi().then((data) => setNotifications(data));
  }, []);

  const filteredNotifications = useMemo(() => {
    if (filterType === "all") return notifications;
    if (filterType === "unread") return notifications.filter((n) => !n.read);
    return notifications.filter((n) => n.type === filterType);
  }, [notifications, filterType]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const handleMarkRead = async (id: number) => {
    await apiMarkNotificationRead(id);
    setNotifications(getNotifications());
  };

  const handleMarkAllRead = async () => {
    await apiMarkAllNotificationsRead();
    setNotifications(getNotifications());
  };

  const handleDelete = (id: number) => {
    setDeletingId(id);
    setTimeout(async () => {
      await apiDeleteNotification(id);
      setNotifications(getNotifications());
      setDeletingId(null);
    }, 300);
  };

  return (
    <KioskLayout>
      <div className="space-y-5 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold font-heading">{t("notifications", lang)}</h2>
            <p className="text-lg text-muted-foreground mt-1">{t("notifications_desc", lang)}</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="lg" className="rounded-full gap-2" onClick={handleMarkAllRead}>
              <CheckCircle2 className="w-5 h-5" />
              {t("mark_read", lang)} ({unreadCount})
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "all", label: `All (${notifications.length})` },
            { key: "unread", label: `Unread (${unreadCount})` },
            { key: "payment", label: "Payments" },
            { key: "status", label: "Status Updates" },
            { key: "alert", label: "Alerts" },
            { key: "info", label: "Info" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterType(f.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filterType === f.key
                  ? "bg-primary text-white shadow-md"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filteredNotifications.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BellOff className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-xl">{t("no_notifications", lang)}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredNotifications.map((notif, index) => {
                const cfg = typeConfig[notif.type] || typeConfig.info;
                const NotifIcon = cfg.icon;
                const isDeleting = deletingId === notif.id;

                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: isDeleting ? 0 : 1, x: isDeleting ? 100 : 0 }}
                    exit={{ opacity: 0, x: 100, height: 0 }}
                    transition={{ delay: isDeleting ? 0 : index * 0.03 }}
                    className={`bg-white rounded-2xl p-5 border shadow-sm transition-all ${
                      notif.read ? "border-border opacity-80" : "border-primary/20 shadow-md"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                        <NotifIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-base">{notif.title}</h4>
                          {!notif.read && <span className="w-2.5 h-2.5 bg-primary rounded-full flex-shrink-0" />}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{notif.message}</p>
                        <span className="text-xs text-muted-foreground mt-1 block">{notif.time}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!notif.read ? (
                          <button
                            onClick={() => handleMarkRead(notif.id)}
                            className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                            title="Mark as read"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-green-500">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        )}
                        <button
                          onClick={() => handleDelete(notif.id)}
                          className="w-9 h-9 rounded-full hover:bg-red-50 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors"
                          title="Delete notification"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </KioskLayout>
  );
}
