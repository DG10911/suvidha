import KioskLayout from "@/components/layout/KioskLayout";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Droplet, MapPin, Phone, Clock, Loader2,
  LocateFixed, Navigation, AlertCircle, Search, X
} from "lucide-react";

interface BloodBank {
  name: string;
  address: string;
  phone: string;
  type: string;
  hours: string;
  lat: number;
  lng: number;
  bloodGroups: Record<string, number>;
  distance?: number;
}

const allBloodGroups = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(km: number): string { return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`; }

function stockLevel(units: number): { label: string; color: string } {
  if (units >= 40) return { label: "High", color: "bg-green-500" };
  if (units >= 15) return { label: "Medium", color: "bg-yellow-500" };
  if (units >= 5) return { label: "Low", color: "bg-orange-500" };
  return { label: "Critical", color: "bg-red-600" };
}

export default function BloodBankFinder() {
  const [, navigate] = useLocation();
  const [banks, setBanks] = useState<BloodBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    fetch("/api/blood-banks")
      .then(r => r.json())
      .then(data => { if (data.success) setBanks(data.bloodBanks); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocationError("Location not supported"); return; }
    setLocationLoading(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); setLocationLoading(false); },
      (err) => { setLocationError(err.code === 1 ? "Location denied. Allow in browser settings." : "Location unavailable."); setLocationLoading(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => { fetchLocation(); }, [fetchLocation]);

  const processed = useMemo(() => {
    let result = banks.map(b => ({
      ...b,
      distance: userLat !== null && userLng !== null ? haversineDistance(userLat, userLng, b.lat, b.lng) : undefined,
    }));
    if (selectedGroup !== "all") {
      result = result.filter(b => b.bloodGroups[selectedGroup] > 0);
    }
    if (userLat !== null) {
      result.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
    }
    return result;
  }, [banks, selectedGroup, userLat, userLng]);

  return (
    <KioskLayout>
      <div className="space-y-5 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="lg" className="rounded-full h-12 w-12 p-0" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex-1">
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <Droplet className="w-8 h-8 text-red-600" />
              Blood Bank Finder
            </h2>
            <p className="text-muted-foreground">Find nearest blood banks with live availability</p>
          </div>
          <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-full text-sm font-medium">{banks.length} Blood Banks</span>
        </div>

        {userLat !== null ? (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <LocateFixed className="w-5 h-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">Location detected - showing nearest blood banks</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={fetchLocation}><LocateFixed className="w-3.5 h-3.5 mr-1" />Refresh</Button>
          </div>
        ) : locationLoading ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" /><p className="text-sm text-blue-800">Detecting location...</p>
          </div>
        ) : locationError ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600" /><p className="text-sm text-amber-800 flex-1">{locationError}</p>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={fetchLocation}>Try Again</Button>
          </div>
        ) : null}

        <div>
          <p className="text-sm font-medium mb-2 text-muted-foreground">Filter by Blood Group:</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelectedGroup("all")} className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${selectedGroup === "all" ? "bg-red-600 text-white shadow-md" : "bg-secondary text-muted-foreground"}`}>
              All Groups
            </button>
            {allBloodGroups.map(g => (
              <button key={g} onClick={() => setSelectedGroup(g)} className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${selectedGroup === g ? "bg-red-600 text-white shadow-md" : "bg-secondary text-muted-foreground"}`}>
                {g}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-red-600" /></div>
        ) : processed.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Droplet className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-xl">No blood banks found with {selectedGroup}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {processed.map((bank, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-lg">{bank.name}</h4>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium">{bank.type}</span>
                    {bank.distance !== undefined && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold ml-2 inline-flex items-center gap-1">
                        <Navigation className="w-3 h-3" />{formatDist(bank.distance)}
                      </span>
                    )}
                  </div>
                  <div className="text-right text-sm">
                    <p className="flex items-center gap-1 text-muted-foreground"><Clock className="w-3.5 h-3.5" />{bank.hours}</p>
                  </div>
                </div>

                <div className="grid grid-cols-8 gap-2 mb-3">
                  {allBloodGroups.map(g => {
                    const units = bank.bloodGroups[g] || 0;
                    const { label, color } = stockLevel(units);
                    return (
                      <div key={g} className={`text-center rounded-xl p-2 border ${selectedGroup === g ? "ring-2 ring-red-400 border-red-300" : "border-gray-100"}`}>
                        <p className="font-bold text-sm">{g}</p>
                        <p className="text-lg font-bold">{units}</p>
                        <div className={`text-[10px] text-white rounded-full px-1.5 py-0.5 ${color}`}>{label}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{bank.address}</span>
                    <a href={`tel:${bank.phone}`} className="flex items-center gap-1 text-primary hover:underline"><Phone className="w-4 h-4" />{bank.phone}</a>
                  </div>
                  {bank.distance !== undefined && (
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${bank.lat},${bank.lng}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl px-4 py-2 text-sm font-medium transition-colors">
                      <Navigation className="w-4 h-4" />Directions
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </KioskLayout>
  );
}
