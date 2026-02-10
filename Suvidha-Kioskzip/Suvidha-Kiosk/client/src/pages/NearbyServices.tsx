import KioskLayout from "@/components/layout/KioskLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Search, MapPin, Phone, Clock, Building2, Loader2,
  Heart, Shield, Landmark, Mail, GraduationCap, Flame, ShoppingBag, X,
  LocateFixed, Navigation, AlertCircle
} from "lucide-react";

interface NearbyService {
  category: string;
  name: string;
  address: string;
  phone: string;
  type: string;
  hours: string;
  lat: number;
  lng: number;
  distance?: number;
}

const categoryConfig: Record<string, { icon: typeof Building2; color: string; bg: string; label: string }> = {
  hospital: { icon: Heart, color: "text-red-600", bg: "bg-red-100", label: "Hospitals" },
  police: { icon: Shield, color: "text-blue-700", bg: "bg-blue-100", label: "Police Stations" },
  bank: { icon: Landmark, color: "text-green-600", bg: "bg-green-100", label: "Banks" },
  postoffice: { icon: Mail, color: "text-amber-600", bg: "bg-amber-100", label: "Post Offices" },
  school: { icon: GraduationCap, color: "text-purple-600", bg: "bg-purple-100", label: "Schools" },
  gas: { icon: Flame, color: "text-orange-600", bg: "bg-orange-100", label: "Gas Agencies" },
  ration: { icon: ShoppingBag, color: "text-teal-600", bg: "bg-teal-100", label: "Ration Shops" },
};

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export default function NearbyServices() {
  const [, navigate] = useLocation();
  const [services, setServices] = useState<NearbyService[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [sortByDistance, setSortByDistance] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/nearby-services")
      .then(r => r.json())
      .then(data => { if (data.success) setServices(data.services); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Location is not supported by your browser");
      return;
    }
    setLocationLoading(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLat(position.coords.latitude);
        setUserLng(position.coords.longitude);
        setSortByDistance(true);
        setLocationLoading(false);
      },
      (err) => {
        if (err.code === 1) setLocationError("Location access denied. Please allow location in your browser settings.");
        else if (err.code === 2) setLocationError("Location unavailable. Please try again.");
        else setLocationError("Location request timed out. Please try again.");
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  const categories = useMemo(() => {
    const cats = new Set(services.map(s => s.category));
    return Array.from(cats);
  }, [services]);

  const servicesWithDistance = useMemo(() => {
    if (userLat === null || userLng === null) return services.map(s => ({ ...s, distance: undefined }));
    return services.map(s => ({
      ...s,
      distance: haversineDistance(userLat, userLng, s.lat, s.lng),
    }));
  }, [services, userLat, userLng]);

  const filtered = useMemo((): NearbyService[] => {
    let result: NearbyService[] = servicesWithDistance;
    if (filterCategory !== "all") result = result.filter(s => s.category === filterCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q) || s.type.toLowerCase().includes(q));
    }
    if (sortByDistance && userLat !== null) {
      result = [...result].sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
    }
    return result;
  }, [servicesWithDistance, filterCategory, searchQuery, sortByDistance, userLat]);

  const grouped = useMemo(() => {
    if (sortByDistance && userLat !== null) return null;
    const groups: Record<string, NearbyService[]> = {};
    filtered.forEach(s => {
      if (!groups[s.category]) groups[s.category] = [];
      groups[s.category].push(s);
    });
    return groups;
  }, [filtered, sortByDistance, userLat]);

  const renderServiceCard = (svc: NearbyService, i: number) => {
    const cfg = categoryConfig[svc.category] || { label: svc.category, bg: "bg-gray-100", color: "text-gray-600", icon: Building2 };
    const CatIcon = cfg.icon;
    return (
      <motion.div key={`${svc.name}-${i}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
        className="bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-bold text-base mb-1">{svc.name}</h4>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground inline-flex items-center gap-1">
                <CatIcon className="w-3 h-3" />{svc.type}
              </span>
              {svc.distance !== undefined && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold inline-flex items-center gap-1">
                  <Navigation className="w-3 h-3" />{formatDistance(svc.distance)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-sm text-muted-foreground flex items-start gap-2"><MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />{svc.address}</p>
          <p className="text-sm flex items-center gap-2"><Phone className="w-4 h-4 text-green-600" /><a href={`tel:${svc.phone}`} className="text-primary font-medium hover:underline">{svc.phone}</a></p>
          <p className="text-sm text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4" />{svc.hours}</p>
        </div>
        {svc.distance !== undefined && (
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${svc.lat},${svc.lng}`} target="_blank" rel="noopener noreferrer"
            className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl py-2 text-sm font-medium transition-colors">
            <Navigation className="w-4 h-4" />Get Directions
          </a>
        )}
      </motion.div>
    );
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
              <MapPin className="w-8 h-8 text-rose-600" />
              Nearby Services
            </h2>
            <p className="text-muted-foreground">Find hospitals, banks, police stations & more in Raipur</p>
          </div>
          <span className="bg-rose-100 text-rose-700 px-3 py-1.5 rounded-full text-sm font-medium">{services.length} Locations</span>
        </div>

        {userLat !== null && userLng !== null ? (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <LocateFixed className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">Location detected</p>
              <p className="text-xs text-green-600">Services sorted by distance from your location</p>
            </div>
            <div className="flex gap-2">
              <Button variant={sortByDistance ? "default" : "outline"} size="sm" className="rounded-lg text-xs h-8"
                onClick={() => setSortByDistance(!sortByDistance)}>
                {sortByDistance ? "Sorted by Distance" : "Sort by Distance"}
              </Button>
              <Button variant="ghost" size="sm" className="rounded-lg text-xs h-8" onClick={fetchLocation}>
                <LocateFixed className="w-3.5 h-3.5 mr-1" />Refresh
              </Button>
            </div>
          </div>
        ) : locationLoading ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">Detecting your location...</p>
              <p className="text-xs text-blue-600">Please allow location access when prompted</p>
            </div>
          </div>
        ) : locationError ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">{locationError}</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-lg text-xs h-8 flex-shrink-0" onClick={fetchLocation}>
              <LocateFixed className="w-3.5 h-3.5 mr-1" />Try Again
            </Button>
          </div>
        ) : (
          <div className="bg-secondary rounded-xl px-4 py-3 flex items-center gap-3">
            <LocateFixed className="w-5 h-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground flex-1">Enable location to see distances and get directions</p>
            <Button variant="outline" size="sm" className="rounded-lg text-xs h-8" onClick={fetchLocation}>
              <LocateFixed className="w-3.5 h-3.5 mr-1" />Enable Location
            </Button>
          </div>
        )}

        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name, address, or type..." className="h-12 pl-12 rounded-xl border-2 text-base" />
          {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterCategory("all")} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filterCategory === "all" ? "bg-primary text-white shadow-md" : "bg-secondary text-muted-foreground"}`}>
            All ({services.length})
          </button>
          {categories.map(cat => {
            const cfg = categoryConfig[cat] || { label: cat, bg: "bg-gray-100", color: "text-gray-600", icon: Building2 };
            return (
              <button key={cat} onClick={() => setFilterCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${filterCategory === cat ? "bg-primary text-white shadow-md" : "bg-secondary text-muted-foreground"}`}>
                {cfg.label} ({services.filter(s => s.category === cat).length})
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-rose-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <MapPin className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-xl">No services found</p>
          </div>
        ) : sortByDistance && userLat !== null ? (
          <div className="space-y-3">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Navigation className="w-5 h-5 text-blue-600" />
              Nearest First
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((svc, i) => renderServiceCard(svc, i))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped && Object.entries(grouped).map(([cat, items]) => {
              const cfg = categoryConfig[cat] || { label: cat, bg: "bg-gray-100", color: "text-gray-600", icon: Building2 };
              const CatIcon = cfg.icon;
              return (
                <div key={cat}>
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.bg} ${cfg.color}`}><CatIcon className="w-4 h-4" /></div>
                    {cfg.label}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {items.map((svc, i) => renderServiceCard(svc, i))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </KioskLayout>
  );
}
