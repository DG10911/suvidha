import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ClipboardList, CheckCircle, Clock, AlertTriangle } from "lucide-react";

interface Complaint {
  id: number;
  complaintId: string;
  service: string;
  category: string;
  description: string;
  status: string;
  urgency: string;
  createdAt: string;
}

export default function StaffDashboard() {
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0 });
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = localStorage.getItem("userId") || "staff";

  useEffect(() => {
    fetch(`/api/staff/dashboard/${userId}`)
      .then(r => r.json())
      .then(data => {
        setStats(data.stats || { total: 0, pending: 0, resolved: 0 });
        setComplaints(data.recentComplaints || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/staff/complaints/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  };

  const statusColor: Record<string, string> = {
    submitted: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-blue-100 text-blue-800",
    resolved: "bg-green-100 text-green-800",
    closed: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-800">Staff Dashboard</h1>
          <Badge className="bg-blue-600 text-white">Staff Portal</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <ClipboardList className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Total Complaints</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-500">Resolved</p>
                  <p className="text-2xl font-bold">{stats.resolved}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Complaints</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-gray-500 py-8">Loading...</p>
            ) : complaints.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No complaints found</p>
            ) : (
              <div className="space-y-3">
                {complaints.map(c => (
                  <div key={c.id} className="border rounded-lg p-4 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{c.complaintId}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[c.status] || "bg-gray-100"}`}>{c.status}</span>
                        {c.urgency === "high" && <AlertTriangle className="w-4 h-4 text-red-500" />}
                      </div>
                      <p className="text-sm text-gray-600">{c.service} — {c.category}</p>
                      <p className="text-xs text-gray-500 mt-1">{c.description.substring(0, 100)}...</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {c.status === "submitted" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, "in_progress")}>
                          Start
                        </Button>
                      )}
                      {c.status === "in_progress" && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => updateStatus(c.id, "resolved")}>
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
