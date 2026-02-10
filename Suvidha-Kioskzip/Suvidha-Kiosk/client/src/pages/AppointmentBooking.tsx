import KioskLayout from "@/components/layout/KioskLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Calendar, Clock, MapPin, Building2, CheckCircle2, Loader2,
  ArrowLeft, ArrowRight, Ticket, AlertTriangle, X
} from "lucide-react";
import { loadPreferences } from "@/lib/userPreferences";

interface Office {
  id: string;
  name: string;
  address: string;
  slots: string[];
}

interface SlotInfo {
  time: string;
  available: boolean;
}

interface AppointmentData {
  id: number;
  office: string;
  purpose: string;
  date: string;
  timeSlot: string;
  tokenNumber: string;
  status: string;
  createdAt: string;
}

type Step = "office" | "date" | "slots" | "details" | "confirm" | "success";

export default function AppointmentBooking() {
  const [, navigate] = useLocation();
  const [lang] = useState(() => loadPreferences().language);
  const [step, setStep] = useState<Step>("office");
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookedAppointment, setBookedAppointment] = useState<AppointmentData | null>(null);
  const [myAppointments, setMyAppointments] = useState<AppointmentData[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState("");

  const userId = loadPreferences().userId || "guest";

  useEffect(() => {
    fetch("/api/offices")
      .then(r => r.json())
      .then(data => { if (data.success) setOffices(data.offices); });
    fetch(`/api/appointments?userId=${userId}`)
      .then(r => r.json())
      .then(data => { if (data.success) setMyAppointments(data.appointments); });
  }, []);

  const getMinDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  };

  const getMaxDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  };

  const fetchSlots = async (date: string) => {
    if (!selectedOffice) return;
    setSlotsLoading(true);
    try {
      const res = await fetch(`/api/appointments/slots?office=${selectedOffice.id}&date=${date}`);
      const data = await res.json();
      if (data.success) setSlots(data.slots);
    } catch { setSlots([]); }
    setSlotsLoading(false);
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot("");
    if (date) fetchSlots(date);
  };

  const handleBook = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          office: selectedOffice!.id,
          purpose,
          date: selectedDate,
          timeSlot: selectedSlot,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBookedAppointment(data.appointment);
        setStep("success");
        fetch(`/api/appointments?userId=${userId}`)
          .then(r => r.json())
          .then(d => { if (d.success) setMyAppointments(d.appointments); });
      } else {
        setError(data.message || "Booking failed");
      }
    } catch { setError("Network error. Please try again."); }
    setLoading(false);
  };

  const handleCancel = async (id: number) => {
    try {
      const cancelRes = await fetch(`/api/appointments/${id}/cancel`, { method: "PATCH" });
      const cancelData = await cancelRes.json();
      if (!cancelData.success) { setError(cancelData.message || "Could not cancel appointment"); return; }
      const res = await fetch(`/api/appointments?userId=${userId}`);
      const data = await res.json();
      if (data.success) setMyAppointments(data.appointments);
    } catch { setError("Network error while cancelling."); }
  };

  const resetForm = () => {
    setStep("office");
    setSelectedOffice(null);
    setSelectedDate("");
    setSelectedSlot("");
    setPurpose("");
    setNotes("");
    setError("");
    setBookedAppointment(null);
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return d; }
  };

  const activeAppointments = myAppointments.filter(a => a.status === "booked");

  return (
    <KioskLayout>
      <div className="h-full flex flex-col max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="lg" className="rounded-full h-12 w-12 p-0" onClick={() => showHistory ? setShowHistory(false) : navigate("/dashboard")}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex-1">
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <Calendar className="w-8 h-8 text-indigo-600" />
              Appointment Booking
            </h2>
            <p className="text-muted-foreground">Book your visit to government offices</p>
          </div>
          {activeAppointments.length > 0 && (
            <Button variant="outline" className="rounded-xl gap-2" onClick={() => setShowHistory(!showHistory)}>
              <Ticket className="w-4 h-4" />
              My Appointments ({activeAppointments.length})
            </Button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setError("")}><X className="w-4 h-4" /></Button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {showHistory ? (
            <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <h3 className="text-xl font-bold">Your Appointments</h3>
              {myAppointments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">No appointments yet</p>
                </div>
              ) : (
                myAppointments.map(apt => {
                  const office = offices.find(o => o.id === apt.office);
                  return (
                    <div key={apt.id} className={`bg-white rounded-2xl p-5 border shadow-sm ${apt.status === "cancelled" ? "opacity-60" : ""}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold text-primary">{apt.tokenNumber}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              apt.status === "booked" ? "bg-green-100 text-green-700" :
                              apt.status === "completed" ? "bg-blue-100 text-blue-700" :
                              "bg-red-100 text-red-700"
                            }`}>{apt.status.toUpperCase()}</span>
                          </div>
                          <p className="font-semibold text-lg">{office?.name || apt.office}</p>
                          <p className="text-muted-foreground">{apt.purpose}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{apt.date}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{apt.timeSlot}</span>
                          </div>
                        </div>
                        {apt.status === "booked" && (
                          <Button variant="outline" size="sm" className="text-red-600 border-red-200 rounded-full" onClick={() => handleCancel(apt.id)}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          ) : step === "success" && bookedAppointment ? (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex items-center justify-center">
              <div className="bg-white rounded-3xl p-10 shadow-xl border text-center max-w-lg w-full">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-14 h-14 text-green-600" />
                </div>
                <h3 className="text-3xl font-bold text-green-700 mb-2">Appointment Booked!</h3>
                <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-200 mt-4 space-y-2 text-left">
                  <div className="flex justify-between"><span className="text-muted-foreground">Token</span><span className="font-mono font-bold text-lg text-indigo-700">{bookedAppointment.tokenNumber}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Office</span><span className="font-semibold">{selectedOffice?.name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-semibold">{bookedAppointment.date}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span className="font-semibold">{bookedAppointment.timeSlot}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Purpose</span><span className="font-semibold">{purpose}</span></div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">A confirmation receipt has been added to your documents.</p>
                <div className="flex gap-3 mt-6">
                  <Button className="flex-1 h-14 rounded-xl text-lg" onClick={() => navigate("/dashboard")}>Dashboard</Button>
                  <Button variant="outline" className="flex-1 h-14 rounded-xl text-lg" onClick={resetForm}>Book Another</Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 space-y-4">
              <div className="flex gap-1 mb-4">
                {["office", "date", "slots", "details"].map((s, i) => (
                  <div key={s} className={`flex-1 h-2 rounded-full ${
                    ["office", "date", "slots", "details", "confirm"].indexOf(step) >= i ? "bg-indigo-600" : "bg-gray-200"
                  }`} />
                ))}
              </div>

              {step === "office" && (
                <div className="space-y-3">
                  <h3 className="text-xl font-bold">Select Government Office</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {offices.map(office => (
                      <button
                        key={office.id}
                        onClick={() => { setSelectedOffice(office); setStep("date"); }}
                        className="bg-white rounded-2xl p-5 border-2 border-transparent hover:border-indigo-300 shadow-sm hover:shadow-md transition-all text-left group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                            <Building2 className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold text-base">{office.name}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="w-3.5 h-3.5" />{office.address}
                            </p>
                            <p className="text-xs text-indigo-600 mt-1">{office.slots.length} slots/day</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === "date" && selectedOffice && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold">Select Date for {selectedOffice.name}</h3>
                  <div className="bg-white rounded-2xl p-6 border shadow-sm">
                    <label className="block text-lg font-medium mb-3">Choose your preferred date</label>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                      min={getMinDate()}
                      max={getMaxDate()}
                      className="h-16 text-xl rounded-xl border-2"
                    />
                    <p className="text-sm text-muted-foreground mt-2">Available for next 30 days. Sunday appointments not available.</p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="h-12 px-6 rounded-xl" onClick={() => setStep("office")}>
                      <ArrowLeft className="w-4 h-4 mr-2" />Back
                    </Button>
                    <Button className="h-12 px-6 rounded-xl" disabled={!selectedDate} onClick={() => setStep("slots")}>
                      Next<ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {step === "slots" && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold">Select Time Slot - {selectedDate}</h3>
                  {slotsLoading ? (
                    <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
                  ) : (
                    <div className="grid grid-cols-4 gap-3">
                      {slots.map(slot => (
                        <button
                          key={slot.time}
                          disabled={!slot.available}
                          onClick={() => setSelectedSlot(slot.time)}
                          className={`p-4 rounded-xl border-2 text-center font-medium transition-all ${
                            !slot.available ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" :
                            selectedSlot === slot.time ? "bg-indigo-600 text-white border-indigo-600 shadow-lg" :
                            "bg-white border-gray-200 hover:border-indigo-300"
                          }`}
                        >
                          <Clock className={`w-5 h-5 mx-auto mb-1 ${!slot.available ? "opacity-30" : ""}`} />
                          <span className="text-sm">{slot.time}</span>
                          {!slot.available && <span className="block text-xs mt-1">Booked</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Button variant="outline" className="h-12 px-6 rounded-xl" onClick={() => setStep("date")}>
                      <ArrowLeft className="w-4 h-4 mr-2" />Back
                    </Button>
                    <Button className="h-12 px-6 rounded-xl" disabled={!selectedSlot} onClick={() => setStep("details")}>
                      Next<ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {step === "details" && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold">Purpose of Visit</h3>
                  <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-4">
                    <div>
                      <label className="block font-medium mb-2">Purpose *</label>
                      <Input
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        placeholder="e.g. Property tax inquiry, New connection, Document verification"
                        className="h-14 rounded-xl border-2 text-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-2">Additional Notes (optional)</label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any special requirements or documents you'll bring..."
                        className="rounded-xl min-h-[80px]"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="h-12 px-6 rounded-xl" onClick={() => setStep("slots")}>
                      <ArrowLeft className="w-4 h-4 mr-2" />Back
                    </Button>
                    <Button className="h-12 px-6 rounded-xl" disabled={!purpose.trim()} onClick={() => setStep("confirm")}>
                      Review<ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {step === "confirm" && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold">Confirm Your Appointment</h3>
                  <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-3">
                    <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Office</span><span className="font-semibold">{selectedOffice?.name}</span></div>
                    <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Address</span><span className="font-semibold">{selectedOffice?.address}</span></div>
                    <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Date</span><span className="font-semibold">{selectedDate}</span></div>
                    <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Time Slot</span><span className="font-semibold">{selectedSlot}</span></div>
                    <div className="flex justify-between py-2"><span className="text-muted-foreground">Purpose</span><span className="font-semibold">{purpose}</span></div>
                    {notes && <div className="flex justify-between py-2 border-t"><span className="text-muted-foreground">Notes</span><span className="font-semibold text-sm">{notes}</span></div>}
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="h-14 px-6 rounded-xl flex-1" onClick={() => setStep("details")}>
                      <ArrowLeft className="w-4 h-4 mr-2" />Edit
                    </Button>
                    <Button className="h-14 px-8 rounded-xl flex-1 bg-green-600 hover:bg-green-700 text-lg gap-2 shadow-lg" onClick={handleBook} disabled={loading}>
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                      Confirm Booking
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </KioskLayout>
  );
}
