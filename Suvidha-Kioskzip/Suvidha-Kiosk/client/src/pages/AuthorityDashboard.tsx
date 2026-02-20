import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Shield, AlertTriangle, TrendingUp, Users } from "lucide-react";

interface Stats {
  total: number;
  overdue: number;
  byStatus: Record<string, number>;
}

interface Complaint {
  id: number;
  complaintId: string;
  service: string;
  urgency: string;
  status: string;
  createdAt: string;
}

export default function AuthorityDashboard() {
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState<Stats>({ total: 0, overdue: 0, byStatus: {} });
  const [escalated, setEscalated] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = localStorage.getItem("userId") || "authority";

  useEffect(() => {
    fetch(`/api/authority/dashboard/${userId}`)
      .then(r => r.json())
      .then(data => {
        setStats(data.stats || { total: 0, overdue: 0, byStatus: {} });
        setEscalated(data.escalated || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  const escalateComplaint = async (complaintId: string) => {
    await fetch(`/api/authority/escalate/${complaintId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Escalated by authority for priority handling" }),
    });
    alert(`Complaint ${complaintId} escalated successfully`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-800">Authority Dashboard</h1>
          <Badge className="bg-purple-600 text-white">Authority Portal</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-sm text-gray-500">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-500">In Progress</p>
                  <p className="text-2xl font-bold">{stats.byStatus.in_progress || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-500">Resolved</p>
                  <p className="text-2xl font-bold">{stats.byStatus.resolved || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>High Priority / Escalated Complaints</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-gray-500 py-8">Loading...</p>
            ) : escalated.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No high-priority complaints</p>
            ) : (
              <div className="space-y-3">
                {escalated.map(c => (
                  <div key={c.id} className="border rounded-lg p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{c.complaintId}</span>
                        <Badge className="bg-red-100 text-red-800 text-xs">{c.urgency}</Badge>
                        <Badge className="bg-gray-100 text-gray-700 text-xs">{c.status}</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{c.service}</p>
                    </div>
                    <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => escalateComplaint(c.complaintId)}>
                      Escalate
                    </Button>
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
