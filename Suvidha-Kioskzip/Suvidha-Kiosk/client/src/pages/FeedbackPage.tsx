import KioskLayout from "@/components/layout/KioskLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Star, ArrowLeft, CheckCircle2, Loader2, MessageSquare, BarChart3,
  Zap, Droplets, Flame, Trash2, Construction, Landmark
} from "lucide-react";
import { loadPreferences } from "@/lib/userPreferences";

interface FeedbackSummary {
  service: string;
  avgRating: number;
  totalRatings: number;
}

interface FeedbackEntry {
  id: number;
  service: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

const serviceOptions = [
  { id: "electricity", name: "Electricity Services", icon: Zap, color: "bg-yellow-100 text-yellow-600" },
  { id: "water", name: "Water Services", icon: Droplets, color: "bg-blue-100 text-blue-600" },
  { id: "gas", name: "Gas Services", icon: Flame, color: "bg-orange-100 text-orange-600" },
  { id: "waste", name: "Waste Management", icon: Trash2, color: "bg-green-100 text-green-600" },
  { id: "infrastructure", name: "Infrastructure", icon: Construction, color: "bg-slate-100 text-slate-600" },
  { id: "municipal", name: "Municipal Services", icon: Landmark, color: "bg-teal-100 text-teal-600" },
  { id: "kiosk", name: "Kiosk Experience", icon: Star, color: "bg-purple-100 text-purple-600" },
];

export default function FeedbackPage() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"form" | "success">("form");
  const [selectedService, setSelectedService] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<FeedbackSummary[]>([]);
  const [myFeedback, setMyFeedback] = useState<FeedbackEntry[]>([]);
  const [showStats, setShowStats] = useState(false);

  const userId = loadPreferences().userId || "guest";

  useEffect(() => {
    fetch("/api/feedback/summary")
      .then(r => r.json())
      .then(data => { if (data.success) setSummary(data.summary); });
    fetch(`/api/feedback?userId=${userId}`)
      .then(r => r.json())
      .then(data => { if (data.success) setMyFeedback(data.feedback); });
  }, [step]);

  const handleSubmit = async () => {
    if (!selectedService || !rating) return;
    setLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          service: selectedService,
          rating,
          comment: comment || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) setStep("success");
    } catch {}
    setLoading(false);
  };

  const resetForm = () => {
    setSelectedService("");
    setRating(0);
    setComment("");
    setStep("form");
  };

  const renderStars = (count: number, size: string = "w-8 h-8", interactive: boolean = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <button
            key={i}
            disabled={!interactive}
            onClick={() => interactive && setRating(i)}
            onMouseEnter={() => interactive && setHoverRating(i)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            className={`${interactive ? "cursor-pointer hover:scale-110" : "cursor-default"} transition-transform`}
          >
            <Star className={`${size} ${
              i <= (interactive ? (hoverRating || count) : count)
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`} />
          </button>
        ))}
      </div>
    );
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
              <Star className="w-8 h-8 text-yellow-500" />
              Service Feedback
            </h2>
            <p className="text-muted-foreground">Rate your experience and help us improve</p>
          </div>
          <Button variant="outline" className="rounded-xl gap-2" onClick={() => setShowStats(!showStats)}>
            <BarChart3 className="w-4 h-4" />
            {showStats ? "Give Feedback" : "View Ratings"}
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {showStats ? (
            <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 flex-1">
              <h3 className="text-xl font-bold">Service Ratings Overview</h3>
              <div className="grid grid-cols-2 gap-4">
                {summary.map(s => {
                  const svc = serviceOptions.find(o => o.id === s.service);
                  const SvcIcon = svc?.icon || Star;
                  return (
                    <div key={s.service} className="bg-white rounded-2xl p-5 border shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${svc?.color || "bg-gray-100 text-gray-600"}`}>
                          <SvcIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold">{svc?.name || s.service}</p>
                          <p className="text-xs text-muted-foreground">{s.totalRatings} ratings</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {renderStars(Math.round(s.avgRating), "w-5 h-5")}
                        <span className="text-xl font-bold text-yellow-600">{s.avgRating}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {summary.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">No feedback data yet</p>
                </div>
              )}

              {myFeedback.length > 0 && (
                <>
                  <h3 className="text-xl font-bold mt-6">Your Feedback</h3>
                  <div className="space-y-3">
                    {myFeedback.map(fb => {
                      const svc = serviceOptions.find(o => o.id === fb.service);
                      return (
                        <div key={fb.id} className="bg-white rounded-xl p-4 border shadow-sm flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${svc?.color || "bg-gray-100"}`}>
                            {svc ? <svc.icon className="w-5 h-5" /> : <Star className="w-5 h-5" />}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">{svc?.name || fb.service}</p>
                            {fb.comment && <p className="text-sm text-muted-foreground">{fb.comment}</p>}
                          </div>
                          {renderStars(fb.rating, "w-4 h-4")}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.div>
          ) : step === "success" ? (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex items-center justify-center">
              <div className="bg-white rounded-3xl p-10 shadow-xl border text-center max-w-lg">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-14 h-14 text-green-600" />
                </div>
                <h3 className="text-3xl font-bold text-green-700 mb-2">Thank You!</h3>
                <p className="text-lg text-muted-foreground">Your feedback helps us serve you better.</p>
                <div className="flex justify-center my-4">{renderStars(rating, "w-8 h-8")}</div>
                <div className="flex gap-3 mt-6">
                  <Button className="flex-1 h-14 rounded-xl text-lg" onClick={() => navigate("/dashboard")}>Dashboard</Button>
                  <Button variant="outline" className="flex-1 h-14 rounded-xl text-lg" onClick={resetForm}>Rate Another</Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 space-y-5">
              <div>
                <h3 className="text-lg font-bold mb-3">Which service do you want to rate?</h3>
                <div className="grid grid-cols-4 gap-3">
                  {serviceOptions.map(svc => (
                    <button
                      key={svc.id}
                      onClick={() => setSelectedService(svc.id)}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${
                        selectedService === svc.id ? "border-primary bg-primary/5 shadow-md" : "border-transparent bg-white hover:border-gray-200"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2 ${svc.color}`}>
                        <svc.icon className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-medium">{svc.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedService && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 border shadow-sm space-y-5">
                  <div>
                    <label className="block font-bold text-lg mb-3">How would you rate this service?</label>
                    <div className="flex justify-center">
                      {renderStars(rating, "w-12 h-12", true)}
                    </div>
                    {rating > 0 && (
                      <p className="text-center mt-2 text-lg font-medium text-muted-foreground">
                        {rating === 1 ? "Poor" : rating === 2 ? "Below Average" : rating === 3 ? "Average" : rating === 4 ? "Good" : "Excellent"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-medium mb-2">Your comments (optional)</label>
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Tell us about your experience..."
                      className="rounded-xl min-h-[100px]"
                    />
                  </div>

                  <Button
                    className="w-full h-14 rounded-xl text-lg gap-2"
                    onClick={handleSubmit}
                    disabled={!rating || loading}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-5 h-5" />}
                    Submit Feedback
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </KioskLayout>
  );
}
