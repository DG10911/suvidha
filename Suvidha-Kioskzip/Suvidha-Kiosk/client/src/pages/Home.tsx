import KioskLayout from "@/components/layout/KioskLayout";
import { QrCode, Smartphone, UserPlus, ScanFace } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { loadPreferences } from "@/lib/userPreferences";
import { t } from "@/lib/translations";
import { useState, useEffect } from "react";

export default function Home() {
  const [lang, setLang] = useState(() => loadPreferences().language);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.language) setLang(detail.language);
    };
    window.addEventListener("prefs-changed", handler);
    return () => window.removeEventListener("prefs-changed", handler);
  }, []);

  return (
    <KioskLayout showBackButton={false}>
      <div className="h-full flex flex-col justify-center items-center gap-12">
        <div className="text-center space-y-4 max-w-3xl">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-6xl font-bold font-heading text-foreground tracking-tight"
          >
            {t("welcome_to", lang)} <span className="text-primary">{t("suvidha", lang)}</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl text-muted-foreground font-light"
          >
            {t("tagline", lang)}
          </motion.p>
        </div>

        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl px-4"
          role="navigation"
          aria-label="Login options"
        >
          <Link href="/signup">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div
                className="h-72 rounded-3xl bg-white border-2 border-transparent hover:border-primary/20 shadow-lg hover:shadow-xl transition-all p-8 flex flex-col items-center justify-center gap-6 cursor-pointer group relative overflow-hidden focus-within:ring-2 focus-within:ring-primary"
                aria-label={`${t("sign_up", lang)} - ${t("register_aadhaar", lang)}`}
              >
                <div className="absolute top-0 right-0 bg-primary text-white px-4 py-1 rounded-bl-xl font-medium text-sm" aria-hidden="true">
                  {t("new_citizen", lang)}
                </div>
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors" aria-hidden="true">
                  <UserPlus className="w-10 h-10" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-foreground">{t("sign_up", lang)}</h3>
                  <p className="text-muted-foreground text-lg">{t("register_aadhaar", lang)}</p>
                </div>
              </div>
            </motion.div>
          </Link>

          <Link href="/login/face">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div
                className="h-72 rounded-3xl bg-white border-2 border-transparent hover:border-blue-300 shadow-lg hover:shadow-xl transition-all p-8 flex flex-col items-center justify-center gap-6 cursor-pointer group relative overflow-hidden focus-within:ring-2 focus-within:ring-blue-500"
                aria-label={`${t("face_login", lang)} - ${t("instant_access", lang)}`}
              >
                <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 rounded-bl-xl font-medium text-sm" aria-hidden="true">
                  {t("instant", lang)}
                </div>
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors" aria-hidden="true">
                  <ScanFace className="w-10 h-10" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-foreground">{t("face_login", lang)}</h3>
                  <p className="text-muted-foreground text-lg">{t("instant_access", lang)}</p>
                </div>
              </div>
            </motion.div>
          </Link>

          <Link href="/login/mobile">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div
                className="h-72 rounded-3xl bg-white border-2 border-transparent hover:border-primary/20 shadow-lg hover:shadow-xl transition-all p-8 flex flex-col items-center justify-center gap-6 cursor-pointer group focus-within:ring-2 focus-within:ring-primary"
                aria-label={`${t("mobile_login", lang)} - ${t("phone_otp", lang)}`}
              >
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors" aria-hidden="true">
                  <Smartphone className="w-10 h-10" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-foreground">{t("mobile_login", lang)}</h3>
                  <p className="text-muted-foreground text-lg">{t("phone_otp", lang)}</p>
                </div>
              </div>
            </motion.div>
          </Link>

          <Link href="/login/qr">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div
                className="h-72 rounded-3xl bg-white border-2 border-transparent hover:border-accent/50 shadow-lg hover:shadow-xl transition-all p-8 flex flex-col items-center justify-center gap-6 cursor-pointer group relative overflow-hidden focus-within:ring-2 focus-within:ring-accent"
                aria-label={`${t("scan_qr", lang)} - ${t("suvidha_pass", lang)}`}
              >
                <div className="absolute top-0 right-0 bg-accent text-accent-foreground px-4 py-1 rounded-bl-xl font-medium text-sm" aria-hidden="true">
                  {t("quick_access", lang)}
                </div>
                <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-colors" aria-hidden="true">
                  <QrCode className="w-10 h-10" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-foreground">{t("scan_qr", lang)}</h3>
                  <p className="text-muted-foreground text-lg">{t("suvidha_pass", lang)}</p>
                </div>
              </div>
            </motion.div>
          </Link>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <p className="text-muted-foreground text-lg flex items-center gap-2">
            {t("select_language", lang)} <span className="font-bold text-primary">{t("help", lang)}</span>
          </p>
        </motion.div>
      </div>
    </KioskLayout>
  );
}
