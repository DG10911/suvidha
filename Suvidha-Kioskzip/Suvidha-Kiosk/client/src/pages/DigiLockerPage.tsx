import KioskLayout from "@/components/layout/KioskLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, FolderLock, Plus, FileText, CheckCircle2, Loader2,
  Trash2, Shield, Calendar, Hash, Building2, Search, X, Download
} from "lucide-react";
import { loadPreferences } from "@/lib/userPreferences";

interface DocType {
  id: string;
  name: string;
  issuedBy: string;
}

interface LockerDoc {
  id: number;
  documentName: string;
  documentType: string;
  documentNumber: string;
  issuedBy: string;
  issuedDate: string;
  expiryDate: string;
  verified: boolean;
  createdAt: string;
}

export default function DigiLockerPage() {
  const [, navigate] = useLocation();
  const prefs = loadPreferences();
  const userId = prefs.userId;

  const [docTypes, setDocTypes] = useState<DocType[]>([]);
  const [myDocs, setMyDocs] = useState<LockerDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [docType, setDocType] = useState("");
  const [docName, setDocName] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [issuedDate, setIssuedDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const loadDocs = () => {
    if (!userId) { setLoading(false); return; }
    Promise.all([
      fetch("/api/digilocker/types").then(r => r.json()),
      fetch(`/api/digilocker/my?userId=${userId}`).then(r => r.json()),
    ]).then(([types, docs]) => {
      if (types.success) setDocTypes(types.types);
      if (docs.success) setMyDocs(docs.documents);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(loadDocs, [userId]);

  const handleAdd = async () => {
    if (!docType || !docName) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/digilocker/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, documentType: docType, documentName: docName, documentNumber: docNumber, issuedDate, expiryDate }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          setShowAdd(false);
          setSuccess(false);
          setDocType("");
          setDocName("");
          setDocNumber("");
          setIssuedDate("");
          setExpiryDate("");
          loadDocs();
        }, 1500);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/digilocker/${id}?userId=${userId}`, { method: "DELETE" });
    setMyDocs(myDocs.filter(d => d.id !== id));
  };

  const filtered = searchQuery
    ? myDocs.filter(d => d.documentName.toLowerCase().includes(searchQuery.toLowerCase()) || d.documentType.toLowerCase().includes(searchQuery.toLowerCase()))
    : myDocs;

  const typeGroups = filtered.reduce((acc, d) => {
    const t = d.documentType;
    if (!acc[t]) acc[t] = [];
    acc[t].push(d);
    return acc;
  }, {} as Record<string, LockerDoc[]>);

  return (
    <KioskLayout>
      <div className="space-y-5 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="lg" className="rounded-full h-12 w-12 p-0" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex-1">
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <FolderLock className="w-8 h-8 text-blue-600" />
              DigiLocker
            </h2>
            <p className="text-muted-foreground">Your secure digital document vault</p>
          </div>
          <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 h-10" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" />Add Document
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-blue-700">{myDocs.length}</p>
            <p className="text-sm text-blue-600">Total Documents</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-green-700">{myDocs.filter(d => d.verified).length}</p>
            <p className="text-sm text-green-600">Verified</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-amber-700">{myDocs.filter(d => !d.verified).length}</p>
            <p className="text-sm text-amber-600">Pending Verification</p>
          </div>
        </div>

        {showAdd && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 border-2 border-blue-200 shadow-md space-y-4">
            {success ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-2" />
                <p className="font-bold text-green-700">Document Added Successfully!</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Add New Document</h3>
                  <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Document Type *</label>
                  <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                    {docTypes.map(t => (
                      <button key={t.id} onClick={() => { setDocType(t.id); if (!docName) setDocName(t.name); }}
                        className={`text-left p-2.5 rounded-lg border text-xs transition-all ${docType === t.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                        <p className="font-medium truncate">{t.name}</p>
                        <p className="text-muted-foreground truncate">{t.issuedBy}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-sm font-medium mb-1 block">Document Name *</label><Input value={docName} onChange={e => setDocName(e.target.value)} className="h-10" /></div>
                  <div><label className="text-sm font-medium mb-1 block">Document Number</label><Input value={docNumber} onChange={e => setDocNumber(e.target.value)} placeholder="e.g. XXXX-XXXX-1234" className="h-10" /></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-sm font-medium mb-1 block">Issued Date</label><Input type="date" value={issuedDate} onChange={e => setIssuedDate(e.target.value)} className="h-10" /></div>
                  <div><label className="text-sm font-medium mb-1 block">Expiry Date</label><Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="h-10" /></div>
                </div>

                <Button className="w-full h-11 bg-blue-600 hover:bg-blue-700 rounded-xl" disabled={!docType || !docName || submitting} onClick={handleAdd}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Add to DigiLocker
                </Button>
              </>
            )}
          </motion.div>
        )}

        {!showAdd && (
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search documents..." className="h-12 pl-12 rounded-xl border-2" />
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FolderLock className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-xl font-medium">No documents yet</p>
            <p className="text-sm mt-1">Add your first document to your secure DigiLocker</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(typeGroups).map(([type, docs]) => {
              const typeInfo = docTypes.find(t => t.id === type);
              return (
                <div key={type}>
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-2">{typeInfo?.name || type}</h3>
                  <div className="space-y-2">
                    {docs.map((doc, i) => (
                      <motion.div key={doc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                        className="bg-white rounded-xl p-4 border shadow-sm flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${doc.verified ? "bg-green-100" : "bg-amber-100"}`}>
                          {doc.verified ? <Shield className="w-6 h-6 text-green-600" /> : <FileText className="w-6 h-6 text-amber-600" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold">{doc.documentName}</p>
                            {doc.verified && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Verified</span>}
                            {!doc.verified && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Pending</span>}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            {doc.documentNumber && <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{doc.documentNumber}</span>}
                            {doc.issuedBy && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{doc.issuedBy}</span>}
                            {doc.issuedDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{doc.issuedDate}</span>}
                          </div>
                        </div>
                        <button onClick={() => handleDelete(doc.id)} className="text-red-400 hover:text-red-600 transition-colors p-2">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
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
