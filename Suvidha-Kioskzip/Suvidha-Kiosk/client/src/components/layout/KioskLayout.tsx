import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Globe, Accessibility, ArrowLeft, HelpCircle, Home, Check, LogOut, Volume2 } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { loadPreferences, savePreferences, clearPreferences, type UserPreferences } from "@/lib/userPreferences";
import { t } from "@/lib/translations";
import { speakText, stopSpeech, preloadText, handleLanguageChange as handleLangVoiceChange, speakWithDelay } from "@/lib/speechHelper";
import VoiceAgent from "@/components/VoiceAgent";

const languages = ["English", "हिंदी", "छत्तीसगढ़ी", "मराठी", "తెలుగు", "தமிழ்"];

interface KioskLayoutProps {
  children: React.ReactNode;
  showBackButton?: boolean;
}

export default function KioskLayout({ children, showBackButton = true }: KioskLayoutProps) {
  const [location, setLocation] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [prefs, setPrefs] = useState<UserPreferences>(loadPreferences);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showAccessMenu, setShowAccessMenu] = useState(false);
  const [screenReaderMode, setScreenReaderMode] = useState(() => {
    try { return localStorage.getItem("suvidha_screen_reader") === "true"; } catch { return false; }
  });
  const langMenuRef = useRef<HTMLDivElement>(null);
  const accessMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as UserPreferences;
      setPrefs(detail);
    };
    window.addEventListener("prefs-changed", handler);
    return () => window.removeEventListener("prefs-changed", handler);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setShowLangMenu(false);
      }
      if (accessMenuRef.current && !accessMenuRef.current.contains(e.target as Node)) {
        setShowAccessMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const langToSpeechCode: Record<string, string> = {
    "English": "en", "हिंदी": "hi", "छत्तीसगढ़ी": "hi",
    "मराठी": "mr", "తెలుగు": "te", "தமிழ்": "ta",
  };

  const screenReaderRef = useRef(screenReaderMode);
  screenReaderRef.current = screenReaderMode;

  const [announcement, setAnnouncement] = useState<string | null>(null);
  const announcementTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showAnnouncement = useCallback((text: string) => {
    setAnnouncement(text);
    if (announcementTimer.current) clearTimeout(announcementTimer.current);
    announcementTimer.current = setTimeout(() => setAnnouncement(null), 3000);
  }, []);

  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  const pageGuidanceEN: Record<string, string> = {
    "/": "Welcome to Suvidha Citizen Services Kiosk. You have 4 options: Sign Up with Aadhaar, Face Login, Mobile Login, or Scan QR code. Tap any option to proceed. You can change language and accessibility settings from the top right.",
    "/signup": "Aadhaar Registration page. Enter your Aadhaar number and details to create a new account. Follow the steps on screen.",
    "/login/face": "Face Login page. Position your face in front of the camera for instant login.",
    "/login/mobile": "Mobile Login page. Enter your registered mobile number. You will receive an OTP to verify.",
    "/login/qr": "QR Code Login page. Scan your Suvidha Pass QR code to log in instantly.",
    "/dashboard": "Your Personalized Dashboard. You can access Electricity services, Gas services, Municipal services including Water, Waste, and Infrastructure. At the bottom you'll find Complaint Center, My Requests, Documents, Notifications, and Profile. Tap the assistant button for voice help.",
    "/dashboard/requests": "My Requests page. Track all your submitted service requests. See status updates and SLA countdown timers.",
    "/dashboard/documents": "Documents and Receipts page. View, print, or download your certificates, receipts, and official documents.",
    "/dashboard/notifications": "Notifications page. View payment confirmations, status updates, and emergency alerts.",
    "/dashboard/profile": "Profile and Preferences page. Manage your linked services, login methods, and personal settings.",
    "/thank-you": "Thank you for using Suvidha. Your session has ended. The kiosk will reset shortly.",
  };

  const pageGuidanceHI: Record<string, string> = {
    "/": "सुविधा नागरिक सेवा कियोस्क में आपका स्वागत है। आपके पास 4 विकल्प हैं: आधार से साइन अप, फेस लॉगिन, मोबाइल लॉगिन, या QR कोड स्कैन करें। आगे बढ़ने के लिए कोई भी विकल्प दबाएं।",
    "/signup": "आधार पंजीकरण पेज। नया खाता बनाने के लिए अपना आधार नंबर दर्ज करें।",
    "/login/face": "फेस लॉगिन पेज। तुरंत लॉगिन के लिए कैमरे के सामने अपना चेहरा रखें।",
    "/login/mobile": "मोबाइल लॉगिन पेज। अपना पंजीकृत मोबाइल नंबर दर्ज करें। आपको OTP मिलेगा।",
    "/login/qr": "QR कोड लॉगिन पेज। तुरंत लॉगिन के लिए अपना सुविधा पास QR कोड स्कैन करें।",
    "/dashboard": "आपका डैशबोर्ड। बिजली, गैस, नगरपालिका सेवाएं उपलब्ध हैं। नीचे शिकायत केंद्र, मेरे अनुरोध, दस्तावेज़, सूचनाएं और प्रोफाइल मिलेंगे। वॉइस सहायक के लिए असिस्टेंट बटन दबाएं।",
    "/dashboard/requests": "मेरे अनुरोध पेज। अपने सभी सेवा अनुरोधों की स्थिति देखें।",
    "/dashboard/documents": "दस्तावेज़ और रसीदें पेज। अपने प्रमाणपत्र और रसीदें देखें, प्रिंट करें या डाउनलोड करें।",
    "/dashboard/notifications": "सूचनाएं पेज। भुगतान की पुष्टि, स्थिति अपडेट और आपातकालीन अलर्ट देखें।",
    "/dashboard/profile": "प्रोफाइल और प्राथमिकताएं पेज। अपनी जुड़ी सेवाएं और लॉगिन तरीके प्रबंधित करें।",
    "/thank-you": "सुविधा का उपयोग करने के लिए धन्यवाद। आपका सत्र समाप्त हो गया है।",
  };

  const getPageGuidance = useCallback((path: string): string => {
    const isHindiLang = ["हिंदी", "छत्तीसगढ़ी", "मराठी"].includes(prefs.language);
    const guidanceMap = isHindiLang ? pageGuidanceHI : pageGuidanceEN;
    return guidanceMap[path] || (path.startsWith("/service/")
      ? (isHindiLang ? "सेवा अनुरोध पेज। अपनी चुनी हुई सेवा का विवरण भरें और जमा करें।" : "Service Request page. Fill in the details for your selected service and submit your request.")
      : "");
  }, [prefs.language]);

  const prevLocationRef = useRef(location);
  const prevLangRef = useRef(prefs.language);

  useEffect(() => {
    if (!screenReaderMode) return;

    const locationChanged = prevLocationRef.current !== location;
    const langChanged = prevLangRef.current !== prefs.language;
    prevLocationRef.current = location;
    prevLangRef.current = prefs.language;

    if (langChanged && !locationChanged) {
      return;
    }

    const speechLang = langToSpeechCode[prefs.language] || "en";
    const guidance = getPageGuidance(location);
    if (guidance) {
      stopSpeech();
      showAnnouncement(guidance);
      const delay = locationChanged ? 500 : 200;
      setTimeout(() => {
        speakText(guidance, speechLang).catch(() => {});
      }, delay);
    }

    const nextPages = location === "/" 
      ? ["/signup", "/login/face", "/login/mobile", "/login/qr"]
      : location === "/dashboard"
      ? ["/dashboard/requests", "/dashboard/documents", "/dashboard/notifications", "/dashboard/profile"]
      : [];
    for (const page of nextPages) {
      const g = getPageGuidance(page);
      if (g) preloadText(g, speechLang);
    }
  }, [location, screenReaderMode, prefs.language, getPageGuidance, showAnnouncement]);

  const handleLanguageChange = (lang: string) => {
    stopSpeech();
    savePreferences({ language: lang });
    setShowLangMenu(false);

    if (screenReaderMode) {
      const speechCode = langToSpeechCode[lang] || "en";
      handleLangVoiceChange(speechCode, () => {
        return getPageGuidance(location);
      });
    }
  };

  const handleFontSizeChange = (size: "normal" | "large" | "extra-large") => {
    savePreferences({ fontSize: size });
  };

  const handleContrastToggle = () => {
    const newVal = !prefs.highContrast;
    savePreferences({ highContrast: newVal });
  };

  const handleLogout = () => {
    stopSpeech();
    clearPreferences();
    try { localStorage.removeItem("suvidha_screen_reader"); } catch {}
    setLocation("/thank-you");
  };

  const toggleScreenReader = () => {
    const newMode = !screenReaderMode;
    setScreenReaderMode(newMode);
    screenReaderRef.current = newMode;
    try { localStorage.setItem("suvidha_screen_reader", String(newMode)); } catch {}
    if (newMode) {
      const msg = "Screen reader mode enabled. Page guidance will be announced.";
      showAnnouncement(msg);
      speakText(msg, "en").catch(() => {});
    } else {
      stopSpeech();
      setAnnouncement(null);
    }
  };

  const fontSizeClass = prefs.fontSize === "extra-large" ? "text-xl" : prefs.fontSize === "large" ? "text-lg" : "";

  const isHome = location === "/";
  const isLoggedInPage = location.startsWith("/dashboard") || location.startsWith("/service");

  return (
    <div
      className={cn(
        "min-h-screen bg-background text-foreground flex flex-col font-sans overflow-hidden selection:bg-primary/20",
        prefs.highContrast && "contrast-more",
        fontSizeClass
      )}
      aria-label="Suvidha Citizen Services Kiosk"
    >
      {prefs.highContrast && (
        <style>{`
          .contrast-more { --background: 0 0% 100%; --foreground: 0 0% 0%; }
          .contrast-more .bg-white { background-color: white !important; border-color: black !important; border-width: 2px !important; }
          .contrast-more .text-muted-foreground { color: hsl(0 0% 20%) !important; }
          .contrast-more button { border-width: 2px !important; }
          .contrast-more a:focus, .contrast-more button:focus { outline: 3px solid black !important; outline-offset: 2px !important; }
        `}</style>
      )}

      <style>{`
        *:focus-visible {
          outline: 3px solid hsl(221 83% 53%);
          outline-offset: 2px;
          border-radius: 4px;
        }
        .skip-link {
          position: absolute;
          top: -100%;
          left: 16px;
          z-index: 9999;
          padding: 12px 24px;
          background: hsl(221 83% 53%);
          color: white;
          font-size: 18px;
          font-weight: bold;
          border-radius: 0 0 8px 8px;
          text-decoration: none;
        }
        .skip-link:focus {
          top: 0;
        }
      `}</style>

      <a href="#main-content" className="skip-link" tabIndex={0}>
        Skip to main content
      </a>

      <header
        className="h-20 bg-white border-b border-border flex items-center justify-between px-8 shadow-sm z-50 relative"
        role="banner"
        aria-label="Kiosk header"
      >
        <div className="flex items-center gap-4">
          {isLoggedInPage ? (
            <div
              className="flex items-center gap-3"
              aria-label="Suvidha Citizen Services"
            >
              <div className="bg-primary/10 p-2 rounded-lg">
                <img src="/logo.png" alt="Suvidha Logo" className="h-10 w-10 object-contain" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold font-heading text-primary leading-none tracking-tight">SUVIDHA</h1>
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t("citizen_services", prefs.language)}</span>
              </div>
            </div>
          ) : (
            <Link href="/">
              <div
                className="flex items-center gap-3 cursor-pointer group"
                role="link"
                aria-label="Go to Suvidha home page"
                tabIndex={0}
              >
                <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <img src="/logo.png" alt="Suvidha Logo" className="h-10 w-10 object-contain" />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-2xl font-bold font-heading text-primary leading-none tracking-tight">SUVIDHA</h1>
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t("citizen_services", prefs.language)}</span>
                </div>
              </div>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4" role="toolbar" aria-label="Kiosk controls">
          {screenReaderMode && (
            <div className="flex items-center gap-1.5 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-sm font-semibold border border-blue-200">
              <Volume2 className="w-4 h-4" aria-hidden="true" />
              <span>Voice ON</span>
            </div>
          )}
          {isLoggedInPage && prefs.userName && (
            <div
              className="bg-primary/10 text-primary px-5 py-2 rounded-full text-base font-semibold flex items-center gap-2"
              role="status"
              aria-label={`Logged in as ${prefs.userName}`}
            >
              <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold" aria-hidden="true">
                {prefs.userName.charAt(0).toUpperCase()}
              </span>
              {prefs.userName}
            </div>
          )}

          {isLoggedInPage && prefs.userId && (
            <Button
              variant="destructive"
              size="lg"
              className="h-12 px-6 rounded-full text-base gap-2 active:scale-95 transition-transform"
              onClick={handleLogout}
              aria-label={t("logout", prefs.language)}
              
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
              {t("logout", prefs.language)}
            </Button>
          )}

          <div
            className="bg-secondary/50 px-4 py-2 rounded-full text-lg font-medium text-foreground/80 font-mono"
            aria-label={`Current time: ${currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            role="status"
          >
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          
          <div className="relative" ref={langMenuRef}>
            <Button 
              variant="outline" 
              size="lg" 
              className="rounded-full gap-2 border-2 hover:bg-accent/10 hover:border-accent hover:text-accent-foreground transition-all"
              onClick={() => { setShowLangMenu(!showLangMenu); setShowAccessMenu(false); }}
              aria-label={`Change language. Current: ${prefs.language}`}
              aria-expanded={showLangMenu}
              aria-haspopup="listbox"
              
            >
              <Globe className="h-5 w-5" aria-hidden="true" />
              <span className="text-lg">{prefs.language}</span>
            </Button>

            {showLangMenu && (
              <div
                className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-xl border border-border p-2 z-[100] min-w-[200px]"
                role="listbox"
                aria-label="Select language"
              >
                {languages.map((lang) => (
                  <button
                    key={lang}
                    role="option"
                    aria-selected={prefs.language === lang}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-xl text-lg font-medium hover:bg-primary/5 transition-colors flex items-center justify-between",
                      prefs.language === lang && "bg-primary/10 text-primary"
                    )}
                    onClick={() => handleLanguageChange(lang)}
                    
                  >
                    {lang}
                    {prefs.language === lang && <Check className="w-5 h-5" aria-hidden="true" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative" ref={accessMenuRef}>
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                "rounded-full h-12 w-12 hover:bg-secondary",
                (prefs.highContrast || prefs.fontSize !== "normal") && "bg-blue-100 text-blue-600"
              )}
              onClick={() => { setShowAccessMenu(!showAccessMenu); setShowLangMenu(false); }}
              aria-label={t("accessibility", prefs.language)}
              aria-expanded={showAccessMenu}
              aria-haspopup="dialog"
              
            >
              <Accessibility className="h-6 w-6" aria-hidden="true" />
            </Button>

            {showAccessMenu && (
              <div
                className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-xl border border-border p-4 z-[100] min-w-[280px] space-y-4"
                role="dialog"
                aria-label="Accessibility settings"
              >
                <h4 className="font-bold text-lg">{t("accessibility", prefs.language)}</h4>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider" id="text-size-label">{t("text_size", prefs.language)}</p>
                  <div className="flex gap-2" role="radiogroup" aria-labelledby="text-size-label">
                    {([
                      { value: "normal", label: "A", size: "text-base", ariaLabel: "Normal text size" },
                      { value: "large", label: "A", size: "text-xl", ariaLabel: "Large text size" },
                      { value: "extra-large", label: "A", size: "text-2xl", ariaLabel: "Extra large text size" },
                    ] as const).map((opt) => (
                      <button
                        key={opt.value}
                        role="radio"
                        aria-checked={prefs.fontSize === opt.value}
                        aria-label={opt.ariaLabel}
                        className={cn(
                          "flex-1 py-3 rounded-xl border-2 font-bold transition-colors",
                          opt.size,
                          prefs.fontSize === opt.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/30"
                        )}
                        onClick={() => handleFontSizeChange(opt.value)}
                        
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t("high_contrast", prefs.language)}</p>
                  <button
                    role="switch"
                    aria-checked={prefs.highContrast}
                    aria-label={`High contrast mode: ${prefs.highContrast ? "on" : "off"}`}
                    className={cn(
                      "w-full py-3 rounded-xl border-2 font-bold text-lg transition-colors",
                      prefs.highContrast
                        ? "border-primary bg-primary text-white"
                        : "border-border hover:border-primary/30"
                    )}
                    onClick={handleContrastToggle}
                    
                  >
                    {prefs.highContrast ? t("on", prefs.language) : t("off", prefs.language)}
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Screen Reader</p>
                  <button
                    role="switch"
                    aria-checked={screenReaderMode}
                    aria-label={`Screen reader voice: ${screenReaderMode ? "on" : "off"}`}
                    className={cn(
                      "w-full py-3 rounded-xl border-2 font-bold text-lg transition-colors flex items-center justify-center gap-3",
                      screenReaderMode
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-border hover:border-blue-300"
                    )}
                    onClick={toggleScreenReader}
                    
                  >
                    <Volume2 className="w-5 h-5" aria-hidden="true" />
                    {screenReaderMode ? t("on", prefs.language) : t("off", prefs.language)}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="flex-1 relative overflow-y-auto overflow-x-hidden bg-[url('/kiosk-bg.png')] bg-cover bg-center bg-fixed"
        role="main"
        aria-label="Main content"
        tabIndex={-1}
      >
        <div className="absolute inset-0 bg-white/90 backdrop-blur-[2px]"></div>
        <div className="relative z-10 w-full h-full p-8 max-w-7xl mx-auto flex flex-col">
          {children}
        </div>
      </main>

      <footer
        className="h-24 bg-white border-t border-border flex items-center justify-between px-8 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50"
        role="contentinfo"
        aria-label="Kiosk footer"
      >
        <div className="flex items-center gap-4">
          {!isHome && !isLoggedInPage && showBackButton && (
            <Button 
              onClick={() => window.history.back()}
              variant="secondary" 
              size="lg" 
              className="h-16 px-8 rounded-2xl text-xl gap-3 shadow-sm active:scale-95 transition-transform"
              aria-label={t("back", prefs.language)}
              
            >
              <ArrowLeft className="h-6 w-6" aria-hidden="true" />
              {t("back", prefs.language)}
            </Button>
          )}
          
          {!isHome && !isLoggedInPage && (
            <Link href="/">
              <Button 
                variant="outline" 
                size="lg" 
                className="h-16 px-8 rounded-2xl text-xl gap-3 shadow-sm border-2 hover:bg-primary/5 hover:border-primary active:scale-95 transition-transform"
                aria-label={t("home", prefs.language)}
              >
                <Home className="h-6 w-6" aria-hidden="true" />
                {t("home", prefs.language)}
              </Button>
            </Link>
          )}

          {isLoggedInPage && location !== "/dashboard" && (
            <Link href="/dashboard">
              <Button 
                variant="secondary" 
                size="lg" 
                className="h-16 px-8 rounded-2xl text-xl gap-3 shadow-sm border-2 hover:bg-primary/5 hover:border-primary active:scale-95 transition-transform"
                aria-label={t("home", prefs.language)}
              >
                <Home className="h-6 w-6" aria-hidden="true" />
                {t("home", prefs.language)}
              </Button>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="lg" 
            className="h-16 px-8 rounded-2xl text-xl gap-3 text-muted-foreground hover:text-foreground"
            aria-label={t("need_help", prefs.language)}
            
          >
            <HelpCircle className="h-6 w-6" aria-hidden="true" />
            {t("need_help", prefs.language)}
          </Button>
        </div>
      </footer>

      <div aria-live="polite" aria-atomic="true" className="sr-only" id="screen-reader-announcements">
        {announcement}
      </div>

      {announcement && screenReaderMode && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[9999] max-w-lg w-[90%] pointer-events-none">
          <div className="bg-blue-900/90 text-white px-6 py-3 rounded-2xl text-center text-lg font-medium shadow-xl backdrop-blur-sm border border-blue-400/30">
            <div className="flex items-center justify-center gap-2">
              <Volume2 className="w-5 h-5 flex-shrink-0 animate-pulse" />
              <span>{announcement}</span>
            </div>
          </div>
        </div>
      )}

      <VoiceAgent language={prefs.language} />
    </div>
  );
}
