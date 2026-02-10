import { loadPreferences } from "@/lib/userPreferences";

const STORE_KEY = "suvidha_kiosk_store";

export interface ServiceRequest {
  id: string;
  service: string;
  category: string;
  status: "submitted" | "in_progress" | "resolved" | "closed" | "rejected";
  date: string;
  slaDeadline: string;
  urgency: "low" | "medium" | "high";
  description: string;
  officerRemarks: string;
  assignedTo: string;
  timeline: { date: string; status: string; note: string }[];
  resolution?: string;
}

export interface KioskDocument {
  id: string;
  title: string;
  type: "receipt" | "payment" | "certificate" | "complaint" | "connection";
  date: string;
  service: string;
  amount?: string;
  referenceId?: string;
  content: string;
}

export interface KioskNotification {
  id: number;
  type: "payment" | "status" | "alert" | "info";
  title: string;
  message: string;
  time: string;
  date: string;
  read: boolean;
  actionLink?: string;
}

export interface LinkedService {
  id: string;
  name: string;
  consumerId: string;
  connected: boolean;
}

interface KioskStoreData {
  requests: ServiceRequest[];
  documents: KioskDocument[];
  notifications: KioskNotification[];
  linkedServices: LinkedService[];
}

const defaultRequests: ServiceRequest[] = [
  {
    id: "SUV-2026-1001",
    service: "Electricity",
    category: "Power Outage",
    status: "in_progress",
    date: "2026-02-01",
    slaDeadline: "2026-02-03",
    urgency: "high",
    description: "No electricity in Shankar Nagar area since 2 days. Transformer seems damaged.",
    officerRemarks: "Field team dispatched to inspect transformer. Replacement ordered.",
    assignedTo: "CSPDCL - Raipur Division",
    timeline: [
      { date: "01 Feb 2026, 10:30 AM", status: "Submitted", note: "Complaint registered successfully" },
      { date: "01 Feb 2026, 02:15 PM", status: "Assigned", note: "Assigned to CSPDCL Raipur Division" },
      { date: "02 Feb 2026, 09:00 AM", status: "In Progress", note: "Field team dispatched to inspect transformer" },
      { date: "03 Feb 2026, 11:30 AM", status: "Update", note: "Transformer replacement ordered, expected fix within 24 hours" },
    ],
  },
  {
    id: "SUV-2026-1002",
    service: "Water Supply",
    category: "Pipeline Leak",
    status: "submitted",
    date: "2026-02-04",
    slaDeadline: "2026-02-07",
    urgency: "medium",
    description: "Water leaking from main pipeline near Civil Lines junction. Road getting waterlogged.",
    officerRemarks: "",
    assignedTo: "Municipal Water Dept",
    timeline: [
      { date: "04 Feb 2026, 11:00 AM", status: "Submitted", note: "Complaint registered successfully" },
    ],
  },
  {
    id: "SUV-2026-1003",
    service: "Waste Mgmt",
    category: "Missed Pickup",
    status: "resolved",
    date: "2026-01-28",
    slaDeadline: "2026-01-31",
    urgency: "low",
    description: "Garbage not picked up from Ward 15 for 3 consecutive days.",
    officerRemarks: "Pickup rescheduled and completed. Extra vehicle deployed for backlog.",
    assignedTo: "Swachh Bharat Unit",
    resolution: "Garbage collected on 30 Jan. Regular schedule restored with additional vehicle for Ward 15.",
    timeline: [
      { date: "28 Jan 2026, 08:45 AM", status: "Submitted", note: "Complaint registered successfully" },
      { date: "28 Jan 2026, 12:00 PM", status: "Assigned", note: "Assigned to Swachh Bharat Unit" },
      { date: "29 Jan 2026, 10:00 AM", status: "In Progress", note: "Extra vehicle dispatched" },
      { date: "30 Jan 2026, 04:30 PM", status: "Resolved", note: "Garbage collected, regular schedule restored" },
    ],
  },
  {
    id: "SUV-2026-1004",
    service: "Infrastructure",
    category: "Pothole",
    status: "in_progress",
    date: "2026-02-02",
    slaDeadline: "2026-02-09",
    urgency: "medium",
    description: "Large pothole on MG Road near Telibandha Lake causing accidents.",
    officerRemarks: "Road repair team scheduled for 8 Feb.",
    assignedTo: "PWD - Road Division",
    timeline: [
      { date: "02 Feb 2026, 03:00 PM", status: "Submitted", note: "Complaint registered successfully" },
      { date: "03 Feb 2026, 10:00 AM", status: "Assigned", note: "Assigned to PWD Road Division" },
      { date: "05 Feb 2026, 02:00 PM", status: "In Progress", note: "Road repair team scheduled for 8 Feb" },
    ],
  },
  {
    id: "SUV-2026-1005",
    service: "Gas",
    category: "Delivery Issue",
    status: "closed",
    date: "2026-01-20",
    slaDeadline: "2026-01-23",
    urgency: "low",
    description: "Gas cylinder not delivered despite booking 5 days ago.",
    officerRemarks: "Cylinder delivered on 22 Jan. Dealer warned for delay.",
    assignedTo: "HP Gas - Raipur",
    resolution: "Cylinder delivered. Distributor reprimanded for delayed delivery.",
    timeline: [
      { date: "20 Jan 2026, 09:00 AM", status: "Submitted", note: "Complaint registered successfully" },
      { date: "20 Jan 2026, 01:00 PM", status: "Assigned", note: "Assigned to HP Gas Raipur" },
      { date: "22 Jan 2026, 11:00 AM", status: "Resolved", note: "Cylinder delivered successfully" },
      { date: "25 Jan 2026, 12:00 PM", status: "Closed", note: "Complaint closed after 3-day satisfaction window" },
    ],
  },
];

const defaultDocuments: KioskDocument[] = [
  {
    id: "DOC-001",
    title: "Electricity Bill Payment - Feb 2026",
    type: "payment",
    date: "2026-02-05",
    service: "Electricity",
    amount: "₹1,250",
    referenceId: "TXN-2026-88291",
    content: "Payment of ₹1,250 towards Electricity Bill for Consumer ID: 1234567890. Due amount cleared for billing period Jan 2026. Payment mode: UPI. Transaction successful.",
  },
  {
    id: "DOC-002",
    title: "Complaint Receipt #SUV-2026-1001",
    type: "complaint",
    date: "2026-02-01",
    service: "Electricity",
    referenceId: "SUV-2026-1001",
    content: "Complaint ID: SUV-2026-1001\nService: Electricity\nCategory: Power Outage\nDescription: No electricity in Shankar Nagar area since 2 days.\nUrgency: High\nFiled: 01 Feb 2026, 10:30 AM\nStatus: In Progress",
  },
  {
    id: "DOC-003",
    title: "Suvidha Pass Card",
    type: "certificate",
    date: "2026-01-15",
    service: "General",
    referenceId: "CIT-RJ-2026-44521",
    content: "Suvidha Pass Digital ID Card\nCitizen ID: CIT-RJ-2026-44521\nIssued: 15 Jan 2026\nValid: 15 Jan 2027\nServices Linked: Electricity, Water Supply\nFace ID: Registered\nKiosk Access: Enabled",
  },
  {
    id: "DOC-004",
    title: "Water Connection Application",
    type: "connection",
    date: "2026-01-25",
    service: "Water Supply",
    referenceId: "WC-2026-0091",
    content: "Application for New Water Connection\nApplication ID: WC-2026-0091\nApplicant: Citizen\nAddress: Ward 12, Raipur\nConnection Type: Domestic\nPipe Size: 0.5 inch\nStatus: Under Review\nExpected Completion: 15 Feb 2026",
  },
  {
    id: "DOC-005",
    title: "Gas Cylinder Delivery Receipt",
    type: "receipt",
    date: "2026-01-22",
    service: "Gas",
    amount: "₹903",
    referenceId: "CYL-2026-5521",
    content: "Gas Cylinder Delivery Receipt\nBooking ID: CYL-2026-5521\nType: 14.2 Kg Domestic\nDelivered: 22 Jan 2026\nSubsidy Applied: ₹200\nAmount Paid: ₹903\nDealer: HP Gas Raipur\nNext Booking Eligible: 22 Feb 2026",
  },
];

const defaultNotifications: KioskNotification[] = [
  {
    id: 1,
    type: "payment",
    title: "Payment Confirmed",
    message: "Electricity bill payment of ₹1,250 received successfully. Transaction ID: TXN-2026-88291.",
    time: "2 hours ago",
    date: "2026-02-07",
    read: false,
  },
  {
    id: 2,
    type: "status",
    title: "Complaint Update: Power Outage",
    message: "Your complaint #SUV-2026-1001 is now In Progress. Transformer replacement ordered.",
    time: "5 hours ago",
    date: "2026-02-07",
    read: false,
  },
  {
    id: 3,
    type: "alert",
    title: "Emergency: Heavy Rain Warning",
    message: "Heavy rain warning for Raipur district. Avoid waterlogged roads. Emergency helpline: 112.",
    time: "1 day ago",
    date: "2026-02-06",
    read: false,
    actionLink: "tel:112",
  },
  {
    id: 4,
    type: "status",
    title: "Complaint Resolved: Missed Pickup",
    message: "Your waste pickup complaint #SUV-2026-1003 has been resolved. Garbage collected successfully.",
    time: "3 days ago",
    date: "2026-02-04",
    read: true,
  },
  {
    id: 5,
    type: "info",
    title: "New Service Available",
    message: "You can now book gas cylinders directly through Suvidha Kiosk. Visit Gas Services to try it out.",
    time: "5 days ago",
    date: "2026-02-02",
    read: true,
  },
  {
    id: 6,
    type: "payment",
    title: "Gas Cylinder Payment",
    message: "Payment of ₹903 for 14.2 Kg domestic cylinder processed. Subsidy of ₹200 applied.",
    time: "2 weeks ago",
    date: "2026-01-22",
    read: true,
  },
];

const defaultLinkedServices: LinkedService[] = [
  { id: "electricity", name: "Electricity (CSPDCL)", consumerId: "1234567890", connected: true },
  { id: "water", name: "Water Supply (Municipal)", consumerId: "WS-RJ-44521", connected: true },
  { id: "gas", name: "Gas (HP Gas)", consumerId: "", connected: false },
  { id: "waste", name: "Waste Management", consumerId: "W15-2026", connected: true },
];

function loadStore(): KioskStoreData {
  try {
    const stored = localStorage.getItem(STORE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  const defaults: KioskStoreData = {
    requests: defaultRequests,
    documents: defaultDocuments,
    notifications: defaultNotifications,
    linkedServices: defaultLinkedServices,
  };
  localStorage.setItem(STORE_KEY, JSON.stringify(defaults));
  return defaults;
}

function saveStore(data: KioskStoreData) {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent("kiosk-store-changed", { detail: data }));
}

export function getRequests(): ServiceRequest[] {
  return loadStore().requests;
}

export function getRequestById(id: string): ServiceRequest | null {
  return loadStore().requests.find((r) => r.id === id) || null;
}

export function updateRequestStatus(id: string, status: ServiceRequest["status"], note?: string) {
  const store = loadStore();
  const req = store.requests.find((r) => r.id === id);
  if (req) {
    req.status = status;
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      + ", " + now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    req.timeline.push({ date: dateStr, status: status === "in_progress" ? "Reopened" : status.charAt(0).toUpperCase() + status.slice(1), note: note || `Status changed to ${status}` });
    saveStore(store);
  }
}

export function addRequest(req: ServiceRequest) {
  const store = loadStore();
  store.requests.unshift(req);
  saveStore(store);
}

export function getDocuments(): KioskDocument[] {
  return loadStore().documents;
}

export function addDocument(doc: KioskDocument) {
  const store = loadStore();
  store.documents.unshift(doc);
  saveStore(store);
}

export function getNotifications(): KioskNotification[] {
  return loadStore().notifications;
}

export function getUnreadCount(): number {
  return loadStore().notifications.filter((n) => !n.read).length;
}

export function markNotificationRead(id: number) {
  const store = loadStore();
  const notif = store.notifications.find((n) => n.id === id);
  if (notif) {
    notif.read = true;
    saveStore(store);
  }
}

export function markAllNotificationsRead() {
  const store = loadStore();
  store.notifications.forEach((n) => (n.read = true));
  saveStore(store);
}

export function deleteNotification(id: number) {
  const store = loadStore();
  store.notifications = store.notifications.filter((n) => n.id !== id);
  saveStore(store);
}

export function addNotification(notif: Omit<KioskNotification, "id">) {
  const store = loadStore();
  const maxId = store.notifications.reduce((max, n) => Math.max(max, n.id), 0);
  store.notifications.unshift({ ...notif, id: maxId + 1 });
  saveStore(store);
}

export function getLinkedServices(): LinkedService[] {
  return loadStore().linkedServices;
}

export function toggleLinkedService(serviceId: string, connected: boolean, consumerId?: string) {
  const store = loadStore();
  const svc = store.linkedServices.find((s) => s.id === serviceId);
  if (svc) {
    svc.connected = connected;
    if (consumerId !== undefined) svc.consumerId = consumerId;
    saveStore(store);
  }
}

// --- API-backed async functions ---
const getUserId = () => loadPreferences().userId || "1";

export async function fetchNotificationsFromApi(): Promise<KioskNotification[]> {
  try {
    const res = await fetch(`/api/notifications/${getUserId()}`);
    if (!res.ok) throw new Error("Failed");
    const data = await res.json();
    const mapped: KioskNotification[] = data.map((n: any) => ({
      id: n.id,
      type: n.type || "info",
      title: n.title,
      message: n.message,
      time: formatTimeAgo(n.createdAt),
      date: new Date(n.createdAt).toISOString().split("T")[0],
      read: n.read,
      actionLink: n.actionLink,
    }));
    // Cache to localStorage
    const store = loadStore();
    store.notifications = mapped;
    saveStore(store);
    return mapped;
  } catch {
    return getNotifications(); // fallback to localStorage
  }
}

export async function fetchDocumentsFromApi(): Promise<KioskDocument[]> {
  try {
    const res = await fetch(`/api/documents/${getUserId()}`);
    if (!res.ok) throw new Error("Failed");
    const data = await res.json();
    const mapped: KioskDocument[] = data.map((d: any) => ({
      id: d.id?.toString() || d.documentId,
      title: d.title,
      type: d.type || "receipt",
      date: new Date(d.createdAt).toISOString().split("T")[0],
      service: d.service || "General",
      amount: d.amount,
      referenceId: d.referenceId,
      content: d.content || "",
    }));
    const store = loadStore();
    store.documents = mapped;
    saveStore(store);
    return mapped;
  } catch {
    return getDocuments();
  }
}

export async function fetchLinkedServicesFromApi(): Promise<LinkedService[]> {
  try {
    const res = await fetch(`/api/linked-services/${getUserId()}`);
    if (!res.ok) throw new Error("Failed");
    const data = await res.json();
    const mapped: LinkedService[] = data.map((s: any) => ({
      id: s.serviceType || s.id,
      name: s.serviceName || s.name,
      consumerId: s.consumerId || "",
      connected: s.isActive ?? s.connected ?? true,
    }));
    const store = loadStore();
    store.linkedServices = mapped;
    saveStore(store);
    return mapped;
  } catch {
    return getLinkedServices();
  }
}

export async function fetchRequestsFromApi(): Promise<ServiceRequest[]> {
  try {
    const res = await fetch(`/api/complaints?userId=${getUserId()}`);
    if (!res.ok) throw new Error("Failed");
    const data = await res.json();
    const mapped: ServiceRequest[] = data.map((c: any) => ({
      id: c.complaintId || c.id,
      service: c.serviceType || c.service,
      category: c.category,
      status: c.status || "submitted",
      date: new Date(c.createdAt).toISOString().split("T")[0],
      slaDeadline: c.slaDeadline ? new Date(c.slaDeadline).toISOString().split("T")[0] : "",
      urgency: c.urgency || "medium",
      description: c.description || "",
      officerRemarks: c.officerRemarks || "",
      assignedTo: c.assignedTo || "Pending",
      timeline: (c.timeline || []).map((t: any) => ({
        date: t.createdAt ? new Date(t.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) + ", " + new Date(t.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : t.date,
        status: t.status,
        note: t.note || t.description || "",
      })),
      resolution: c.resolution,
    }));
    const store = loadStore();
    store.requests = mapped;
    saveStore(store);
    return mapped;
  } catch {
    return getRequests();
  }
}

export async function apiMarkNotificationRead(id: number): Promise<void> {
  try {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
  } catch {}
  markNotificationRead(id);
}

export async function apiMarkAllNotificationsRead(): Promise<void> {
  try {
    await fetch(`/api/notifications/${getUserId()}/read-all`, { method: "POST" });
  } catch {}
  markAllNotificationsRead();
}

export async function apiDeleteNotification(id: number): Promise<void> {
  try {
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
  } catch {}
  deleteNotification(id);
}

export async function apiToggleLinkedService(serviceId: string, connected: boolean, consumerId?: string): Promise<void> {
  try {
    await fetch(`/api/linked-services/${serviceId}`, { 
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: connected, consumerId: consumerId || "" }),
    });
  } catch {}
  toggleLinkedService(serviceId, connected, consumerId);
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} days ago`;
}
