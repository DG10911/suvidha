import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Hammer, CheckCircle, Clock, PlayCircle } from "lucide-react";

interface WorkItem {
  id: number;
  complaintId: string;
  service: string;
  category: string;
  description: string;
  status: string;
  urgency: string;
  createdAt: string;
}

export default function ContractorDashboard() {
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0 });
  const [work, setWork] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = localStorage.getItem("userId") || "contractor";

  useEffect(() => {
    fetch(`/api/contractor/dashboard/${userId}`)
      .then(r => r.json())
      .then(data => {
        setStats(data.stats || { total: 0, active: 0, completed: 0 });
        setWork(data.assignedWork || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  const updateWork = async (id: number, status: string) => {
    await fetch(`/api/contractor/work/${id}/update`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setWork(prev => prev.map(w => w.id === id ? { ...w, status } : w));
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
          <h1 className="text-2xl font-bold text-gray-800">Contractor Dashboard</h1>
          <Badge className="bg-orange-600 text-white">Contractor Portal</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Hammer className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-500">Assigned Work</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <PlayCircle className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-500">Active</p>
                  <p className="text-2xl font-bold">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Assigned Work Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-gray-500 py-8">Loading...</p>
            ) : work.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No work assigned yet</p>
            ) : (
              <div className="space-y-3">
                {work.map(w => (
                  <div key={w.id} className="border rounded-lg p-4 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{w.complaintId}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[w.status] || "bg-gray-100"}`}>{w.status}</span>
                      </div>
                      <p className="text-sm text-gray-600">{w.service} — {w.category}</p>
                      <p className="text-xs text-gray-500 mt-1">{w.description.substring(0, 100)}...</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {w.status === "submitted" && (
                        <Button size="sm" variant="outline" onClick={() => updateWork(w.id, "in_progress")}>
                          <PlayCircle className="w-3 h-3 mr-1" /> Start
                        </Button>
                      )}
                      {w.status === "in_progress" && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => updateWork(w.id, "resolved")}>
                          <CheckCircle className="w-3 h-3 mr-1" /> Complete
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
