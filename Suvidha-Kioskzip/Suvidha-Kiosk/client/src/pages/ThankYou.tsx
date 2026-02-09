import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { clearPreferences, loadPreferences } from "@/lib/userPreferences";
import { t } from "@/lib/translations";

export default function ThankYou() {
  const [, setLocation] = useLocation();
  const [lang] = useState(() => loadPreferences().language);

  useEffect(() => {
    clearPreferences();
    window.dispatchEvent(new CustomEvent("prefs-changed", { detail: { language: "English", fontSize: "normal", highContrast: false } }));

    const timer = setTimeout(() => {
      setLocation("/");
    }, 4000);
    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-8 max-w-lg"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
            <CheckCircle2 className="w-16 h-16" />
          </div>
        </motion.div>

        <div>
          <h1 className="text-5xl font-bold font-heading text-foreground mb-4">
            {t("thank_you_title", lang)}
          </h1>
          <p className="text-2xl text-muted-foreground">
            {t("thank_you_message", lang)}
          </p>
        </div>

        <div className="w-full bg-secondary rounded-full h-2 overflow-hidden max-w-xs mx-auto">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 4 }}
            className="h-full bg-primary rounded-full"
          />
        </div>

        <p className="text-lg text-muted-foreground">
          {t("redirecting_home", lang)}
        </p>
      </motion.div>
    </div>
  );
}
