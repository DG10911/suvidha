// @ts-nocheck
import type { Express, Request, Response } from "express";
import { type Server } from "http";
import crypto from "crypto";
import CryptoJS from "crypto-js";
import { sendOtp, verifyOtp } from "./twilio";
import { db } from "../db";
import {
  users,
  faceProfiles,
  qrTokens,
  complaints,
  complaintTimeline,
  documents,
  notifications,
  linkedServices,
  walletAccounts,
  walletTransactions,
} from "../shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { registerAudioRoutes } from "./replit_integrations/audio/index.js";

const departmentMap: Record<string, string> = {
  electricity: "CSPDCL - Raipur Division",
  gas: "Gas Authority - Chhattisgarh",
  water: "PHE Department - Raipur",
  waste: "Municipal Corp - Sanitation Dept",
  infrastructure: "Municipal Corp - Engineering Dept",
  other: "General Administration",
};

function generateSuvidhaId(): string {
  return `SUV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
}

function getSlaHours(urgency: string): number {
  switch (urgency) {
    case "high": return 48;
    case "medium": return 72;
    case "low": return 120;
    default: return 72;
  }
}

export async function registerRoutes(
  server: Server,
  app: Express
): Promise<Server> {
  registerAudioRoutes(app);

  // ==================== AUTH ====================

  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    try {
      const { aadhaar, name, phone, faceImage, faceDescriptor } = req.body;

      if (!aadhaar || !name || !phone) {
        res.status(400).json({ success: false, message: "Missing required fields" });
        return;
      }

      const existing = await db.select().from(users).where(eq(users.aadhaar, aadhaar)).limit(1);
      if (existing.length > 0) {
        res.status(409).json({ success: false, message: "This Aadhaar is already registered. Please use login instead." });
        return;
      }

      const existingPhone = await db.select().from(users).where(eq(users.username, phone)).limit(1);
      if (existingPhone.length > 0) {
        res.status(409).json({ success: false, message: "This phone number is already registered with another account. Please use login instead." });
        return;
      }

      if (faceDescriptor && Array.isArray(faceDescriptor) && faceDescriptor.length > 0) {
        const DUPLICATE_THRESHOLD = 0.45;
        const allProfiles = await db
          .select()
          .from(faceProfiles)
          .where(sql`${faceProfiles.faceDescriptor} IS NOT NULL`);

        for (const profile of allProfiles) {
          try {
            const storedDescriptor = JSON.parse(profile.faceDescriptor!);
            if (!Array.isArray(storedDescriptor) || storedDescriptor.length !== faceDescriptor.length) continue;
            let sum = 0;
            for (let i = 0; i < faceDescriptor.length; i++) {
              const diff = faceDescriptor[i] - storedDescriptor[i];
              sum += diff * diff;
            }
            const distance = Math.sqrt(sum);
            if (distance < DUPLICATE_THRESHOLD) {
              res.status(409).json({
                success: false,
                message: "This face is already registered with another account. Duplicate face registrations are not allowed.",
                duplicate: true,
              });
              return;
            }
          } catch { continue; }
        }
      }

      const suvidhaId = generateSuvidhaId();
      const faceHash = faceImage ? CryptoJS.SHA256(faceImage).toString() : "no-face";
      const qrToken = crypto.randomUUID();

      const [user] = await db.insert(users).values({
        username: phone,
        password: faceHash,
        name,
        phone,
        aadhaar,
        suvidhaId,
      }).returning();

      if (faceDescriptor && Array.isArray(faceDescriptor) && faceDescriptor.length > 0) {
        await db.insert(faceProfiles).values({
          userId: user.id,
          faceImage: "stored",
          faceHash,
          faceDescriptor: JSON.stringify(faceDescriptor),
        });
      } else if (faceImage) {
        await db.insert(faceProfiles).values({
          userId: user.id,
          faceImage: "stored",
          faceHash,
          faceDescriptor: null,
        });
      }

      await db.insert(walletAccounts).values({
        userId: user.id,
        balance: "0.00",
      });

      await db.insert(qrTokens).values({
        userId: user.id,
        token: qrToken,
        payload: JSON.stringify({ suvidhaId, name }),
      });

      const defaultServices = ["Electricity", "Water", "Gas", "Waste"];
      await db.insert(linkedServices).values(
        defaultServices.map((serviceName) => ({
          userId: user.id,
          serviceName,
          connected: false,
        }))
      );

      await db.insert(notifications).values({
        userId: user.id,
        type: "welcome",
        title: "Welcome to Suvidha!",
        message: `Welcome ${name}! Your Suvidha ID is ${suvidhaId}. You can now access all government services through this kiosk.`,
        read: false,
      });

      res.json({
        success: true,
        user: { id: user.id, suvidhaId: user.suvidhaId, name: user.name },
        qrToken,
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(500).json({ success: false, message: error.message || "Signup failed" });
    }
  });

  app.post("/api/auth/face-login", async (req: Request, res: Response) => {
    try {
      const { faceDescriptor } = req.body;

      if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
        res.status(400).json({ success: false, message: "No face descriptor provided" });
        return;
      }

      const allProfiles = await db
        .select()
        .from(faceProfiles)
        .where(sql`${faceProfiles.faceDescriptor} IS NOT NULL`);

      if (allProfiles.length === 0) {
        res.json({ success: false, message: "No registered faces found. Please sign up first." });
        return;
      }

      let bestMatch: { userId: string; distance: number } | null = null;

      for (const profile of allProfiles) {
        try {
          const storedDescriptor: number[] = JSON.parse(profile.faceDescriptor!);
          if (!Array.isArray(storedDescriptor) || storedDescriptor.length !== faceDescriptor.length) continue;

          let sum = 0;
          for (let i = 0; i < faceDescriptor.length; i++) {
            const diff = faceDescriptor[i] - storedDescriptor[i];
            sum += diff * diff;
          }
          const distance = Math.sqrt(sum);

          if (!bestMatch || distance < bestMatch.distance) {
            bestMatch = { userId: profile.userId, distance };
          }
        } catch {
          continue;
        }
      }

      const MATCH_THRESHOLD = 0.6;

      if (!bestMatch || bestMatch.distance > MATCH_THRESHOLD) {
        res.json({ success: false, message: "Face not recognized. Please try again or use another login method." });
        return;
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, bestMatch.userId))
        .limit(1);

      if (!user) {
        res.json({ success: false, message: "User not found" });
        return;
      }

      res.json({
        success: true,
        user: { id: user.id, suvidhaId: user.suvidhaId, name: user.name, phone: user.phone },
        confidence: Math.round((1 - bestMatch.distance / MATCH_THRESHOLD) * 100),
      });
    } catch (error: any) {
      console.error("Face login error:", error);
      res.status(500).json({ success: false, message: error.message || "Face login failed" });
    }
  });

  app.post("/api/auth/mobile-login", async (req: Request, res: Response) => {
    try {
      const { phone } = req.body;

      if (!phone) {
        res.status(400).json({ success: false, message: "Phone number required" });
        return;
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.phone, phone))
        .limit(1);

      if (!user) {
        res.json({ success: false, message: "No account found with this phone number" });
        return;
      }

      const otpResult = await sendOtp(phone);
      if (!otpResult.success) {
        res.json({ success: false, message: otpResult.message });
        return;
      }

      res.json({
        success: true,
        otpSent: true,
        message: "OTP sent to your mobile number",
      });
    } catch (error: any) {
      console.error("Mobile login error:", error);
      res.status(500).json({ success: false, message: error.message || "Mobile login failed" });
    }
  });

  app.post("/api/auth/verify-otp", async (req: Request, res: Response) => {
    try {
      const { phone, otp } = req.body;

      if (!phone || !otp) {
        res.status(400).json({ success: false, message: "Phone and OTP required" });
        return;
      }

      if (!/^\d{6}$/.test(otp)) {
        res.json({ success: false, message: "Invalid OTP format" });
        return;
      }

      const isValid = verifyOtp(phone, otp);
      if (!isValid) {
        res.json({ success: false, message: "Invalid or expired OTP. Please try again." });
        return;
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.phone, phone))
        .limit(1);

      if (!user) {
        res.json({ success: false, message: "User not found" });
        return;
      }

      res.json({
        success: true,
        user: { id: user.id, suvidhaId: user.suvidhaId, name: user.name, phone: user.phone },
      });
    } catch (error: any) {
      console.error("OTP verification error:", error);
      res.status(500).json({ success: false, message: error.message || "OTP verification failed" });
    }
  });

  app.post("/api/auth/qr-validate", async (req: Request, res: Response) => {
    try {
      const { qrData } = req.body;

      if (!qrData || typeof qrData !== "string") {
        res.json({ success: false, message: "No QR data provided" });
        return;
      }

      const trimmed = qrData.trim();

      const [tokenRecord] = await db
        .select()
        .from(qrTokens)
        .where(and(eq(qrTokens.token, trimmed), eq(qrTokens.revoked, false)))
        .limit(1);

      if (tokenRecord) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, tokenRecord.userId))
          .limit(1);

        if (user) {
          res.json({
            success: true,
            userId: user.id,
            userName: user.name || "Citizen User",
            suvidhaId: user.suvidhaId,
          });
          return;
        }
      }

      const suvidhaIdMatch = trimmed.match(/SUV-\d{4}-\d{4}[A-Z]/i);
      if (suvidhaIdMatch) {
        const matchedId = suvidhaIdMatch[0].toUpperCase();
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.suvidhaId, matchedId))
          .limit(1);

        if (user) {
          res.json({
            success: true,
            userId: user.id,
            userName: user.name || "Citizen User",
            suvidhaId: user.suvidhaId,
          });
          return;
        }
      }

      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.suvidhaId) {
          const [user] = await db.select().from(users).where(eq(users.suvidhaId, parsed.suvidhaId)).limit(1);
          if (user) {
            res.json({
              success: true,
              userId: user.id,
              userName: user.name || "Citizen User",
              suvidhaId: user.suvidhaId,
            });
            return;
          }
        }
        if (parsed.token) {
          const [tokenRec] = await db.select().from(qrTokens).where(and(eq(qrTokens.token, parsed.token), eq(qrTokens.revoked, false))).limit(1);
          if (tokenRec) {
            const [user] = await db.select().from(users).where(eq(users.id, tokenRec.userId)).limit(1);
            if (user) {
              res.json({
                success: true,
                userId: user.id,
                userName: user.name || "Citizen User",
                suvidhaId: user.suvidhaId,
              });
              return;
            }
          }
        }
      } catch {}

      res.json({
        success: false,
        message: "Unrecognized QR code format. Please use a valid Suvidha QR code.",
      });
    } catch (error: any) {
      console.error("QR validate error:", error);
      res.status(500).json({ success: false, message: error.message || "QR validation failed" });
    }
  });

  // ==================== AADHAAR LOOKUP ====================

  const aadhaarFirstNames = ["Ramesh", "Sunita", "Amit", "Priya", "Rajesh", "Anita", "Vikram", "Meena", "Suresh", "Kavita", "Deepak", "Rekha", "Anil", "Savita", "Manoj", "Lata", "Sanjay", "Geeta", "Ravi", "Nisha", "Prakash", "Uma", "Dinesh", "Asha", "Mukesh"];
  const aadhaarLastNames = ["Sharma", "Verma", "Patel", "Singh", "Kumar", "Gupta", "Sahu", "Tiwari", "Mishra", "Yadav", "Jain", "Agarwal", "Dubey", "Pandey", "Thakur", "Dewangan", "Nishad", "Rajput", "Kashyap", "Sonkar"];
  const aadhaarAreas = ["Shankar Nagar", "Telibandha", "Devendra Nagar", "Amanaka", "Civil Lines", "Tatibandh", "Bhanpuri", "Mowa", "Lalpur", "Khamhardih", "Pandri", "Samta Colony", "Byron Bazaar", "Fafadih", "Gudiyari", "Mathpurena", "Dhamtari Road", "Siltara", "Urla", "Birgaon"];

  function lookupAadhaar(aadhaar: string) {
    const seed = parseInt(aadhaar.slice(-4), 10);
    const fn = aadhaarFirstNames[seed % aadhaarFirstNames.length];
    const ln = aadhaarLastNames[(seed + 3) % aadhaarLastNames.length];
    const phone = `98${aadhaar.slice(2, 10)}`;
    return {
      name: `${fn} ${ln}`,
      phone,
      dob: `${(seed % 28 + 1).toString().padStart(2, "0")}/${((seed % 12) + 1).toString().padStart(2, "0")}/${1970 + (seed % 40)}`,
      gender: seed % 3 === 0 ? "Female" : "Male",
      address: `H.No ${seed % 100 + 1}, Ward ${seed % 50 + 1}, ${aadhaarAreas[seed % aadhaarAreas.length]}, Raipur, Chhattisgarh - 492001`,
    };
  }

  app.get("/api/aadhaar/lookup/:aadhaar", async (req: Request, res: Response) => {
    const { aadhaar } = req.params;
    if (!aadhaar || aadhaar.length !== 12 || !/^\d{12}$/.test(aadhaar)) {
      res.status(400).json({ success: false, message: "Invalid Aadhaar number" });
      return;
    }
    const details = lookupAadhaar(aadhaar);
    res.json({ success: true, ...details });
  });

  app.get("/api/auth/check-user/:identifier", async (req: Request, res: Response) => {
    try {
      const { identifier } = req.params;
      let user = null;

      if (/^\d{10}$/.test(identifier)) {
        [user] = await db.select().from(users).where(eq(users.phone, identifier)).limit(1);
      } else if (/^\d{12}$/.test(identifier)) {
        [user] = await db.select().from(users).where(eq(users.aadhaar, identifier)).limit(1);
      }

      if (user) {
        const faceProfile = await db.select().from(faceProfiles).where(eq(faceProfiles.userId, user.id)).limit(1);
        res.json({
          success: true,
          exists: true,
          hasFace: faceProfile.length > 0 && !!faceProfile[0].faceDescriptor,
          userName: user.name,
        });
      } else {
        res.json({ success: true, exists: false });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ==================== COMPLAINTS ====================

  app.post("/api/complaints", async (req: Request, res: Response) => {
    try {
      const { userId, service, category, description, urgency, latitude, longitude, locationAddress } = req.body;

      if (!userId || !service || !category || !description) {
        res.status(400).json({ success: false, message: "Missing required fields" });
        return;
      }

      const complaintUrgency = urgency || "medium";
      const complaintId = `CMP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const assignedTo = departmentMap[service.toLowerCase()] || departmentMap["other"];
      const slaHours = getSlaHours(complaintUrgency);
      const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

      const [complaint] = await db.insert(complaints).values({
        complaintId,
        userId,
        service,
        category,
        description,
        status: "submitted",
        urgency: complaintUrgency,
        slaDeadline,
        assignedTo,
        latitude: latitude || null,
        longitude: longitude || null,
        locationAddress: locationAddress || null,
      }).returning();

      await db.insert(complaintTimeline).values({
        complaintId,
        status: "submitted",
        note: `Complaint submitted and assigned to ${assignedTo}. SLA deadline: ${slaDeadline.toLocaleString()}.`,
      });

      await db.insert(notifications).values({
        userId,
        type: "complaint",
        title: "Complaint Registered",
        message: `Your complaint ${complaintId} for ${service} - ${category} has been registered and assigned to ${assignedTo}.`,
        read: false,
        actionLink: `/complaints/${complaintId}`,
      });

      await db.insert(documents).values({
        userId,
        title: `Complaint Receipt - ${complaintId}`,
        type: "receipt",
        service,
        referenceId: complaintId,
        content: JSON.stringify({
          complaintId,
          service,
          category,
          description,
          urgency: complaintUrgency,
          assignedTo,
          slaDeadline: slaDeadline.toISOString(),
          submittedAt: new Date().toISOString(),
        }),
      });

      const timeline = await db
        .select()
        .from(complaintTimeline)
        .where(eq(complaintTimeline.complaintId, complaintId))
        .orderBy(desc(complaintTimeline.createdAt));

      res.json({ success: true, complaint: { ...complaint, timeline } });
    } catch (error: any) {
      console.error("Create complaint error:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to create complaint" });
    }
  });

  app.get("/api/complaints", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;

      if (!userId) {
        res.status(400).json({ success: false, message: "userId is required" });
        return;
      }

      const userComplaints = await db
        .select()
        .from(complaints)
        .where(eq(complaints.userId, userId))
        .orderBy(desc(complaints.createdAt));

      const result = await Promise.all(
        userComplaints.map(async (complaint) => {
          const timeline = await db
            .select()
            .from(complaintTimeline)
            .where(eq(complaintTimeline.complaintId, complaint.complaintId))
            .orderBy(desc(complaintTimeline.createdAt));
          return { ...complaint, timeline };
        })
      );

      res.json({ success: true, complaints: result });
    } catch (error: any) {
      console.error("Get complaints error:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to fetch complaints" });
    }
  });

  app.get("/api/complaints/:complaintId", async (req: Request, res: Response) => {
    try {
      const { complaintId } = req.params;

      const [complaint] = await db
        .select()
        .from(complaints)
        .where(eq(complaints.complaintId, complaintId))
        .limit(1);

      if (!complaint) {
        res.status(404).json({ success: false, message: "Complaint not found" });
        return;
      }

      const timeline = await db
        .select()
        .from(complaintTimeline)
        .where(eq(complaintTimeline.complaintId, complaintId))
        .orderBy(desc(complaintTimeline.createdAt));

      res.json({ success: true, complaint: { ...complaint, timeline } });
    } catch (error: any) {
      console.error("Get complaint error:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to fetch complaint" });
    }
  });

  app.patch("/api/complaints/:complaintId/reopen", async (req: Request, res: Response) => {
    try {
      const { complaintId } = req.params;
      const { reason } = req.body;

      const [complaint] = await db
        .select()
        .from(complaints)
        .where(eq(complaints.complaintId, complaintId))
        .limit(1);

      if (!complaint) {
        res.status(404).json({ success: false, message: "Complaint not found" });
        return;
      }

      await db
        .update(complaints)
        .set({ status: "submitted", updatedAt: new Date() })
        .where(eq(complaints.complaintId, complaintId));

      await db.insert(complaintTimeline).values({
        complaintId,
        status: "submitted",
        note: reason || "Complaint reopened by citizen.",
      });

      const [updated] = await db
        .select()
        .from(complaints)
        .where(eq(complaints.complaintId, complaintId))
        .limit(1);

      const timeline = await db
        .select()
        .from(complaintTimeline)
        .where(eq(complaintTimeline.complaintId, complaintId))
        .orderBy(desc(complaintTimeline.createdAt));

      res.json({ success: true, complaint: { ...updated, timeline } });
    } catch (error: any) {
      console.error("Reopen complaint error:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to reopen complaint" });
    }
  });

  // ==================== WALLET ====================

  app.get("/api/wallet/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const [wallet] = await db
        .select()
        .from(walletAccounts)
        .where(eq(walletAccounts.userId, userId))
        .limit(1);

      if (!wallet) {
        res.status(404).json({ success: false, message: "Wallet not found" });
        return;
      }

      res.json({ success: true, wallet });
    } catch (error: any) {
      console.error("Get wallet error:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to fetch wallet" });
    }
  });

  app.post("/api/wallet/:userId/add", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { amount, method } = req.body;

      if (!amount || amount <= 0) {
        res.status(400).json({ success: false, message: "Invalid amount" });
        return;
      }

      const [wallet] = await db
        .select()
        .from(walletAccounts)
        .where(eq(walletAccounts.userId, userId))
        .limit(1);

      if (!wallet) {
        res.status(404).json({ success: false, message: "Wallet not found" });
        return;
      }

      const newBalance = (parseFloat(wallet.balance) + parseFloat(amount)).toFixed(2);

      await db
        .update(walletAccounts)
        .set({ balance: newBalance })
        .where(eq(walletAccounts.userId, userId));

      await db.insert(walletTransactions).values({
        userId,
        type: "credit",
        amount: parseFloat(amount).toFixed(2),
        method: method || "cash",
        description: `Added funds via ${method || "cash"}`,
        referenceId: `TXN-${Date.now()}`,
        balanceAfter: newBalance,
      });

      res.json({ success: true, balance: newBalance });
    } catch (error: any) {
      console.error("Add funds error:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to add funds" });
    }
  });

  app.post("/api/wallet/:userId/pay", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { amount, description, referenceId } = req.body;

      if (!amount || amount <= 0) {
        res.status(400).json({ success: false, message: "Invalid amount" });
        return;
      }

      const [wallet] = await db
        .select()
        .from(walletAccounts)
        .where(eq(walletAccounts.userId, userId))
        .limit(1);

      if (!wallet) {
        res.status(404).json({ success: false, message: "Wallet not found" });
        return;
      }

      if (parseFloat(wallet.balance) < parseFloat(amount)) {
        res.status(400).json({ success: false, message: "Insufficient balance" });
        return;
      }

      const newBalance = (parseFloat(wallet.balance) - parseFloat(amount)).toFixed(2);

      await db
        .update(walletAccounts)
        .set({ balance: newBalance })
        .where(eq(walletAccounts.userId, userId));

      await db.insert(walletTransactions).values({
        userId,
        type: "debit",
        amount: parseFloat(amount).toFixed(2),
        method: "wallet",
        description: description || "Payment",
        referenceId: referenceId || `TXN-${Date.now()}`,
        balanceAfter: newBalance,
      });

      res.json({ success: true, balance: newBalance });
    } catch (error: any) {
      console.error("Pay error:", error);
      res.status(500).json({ success: false, message: error.message || "Payment failed" });
    }
  });

  app.get("/api/wallet/:userId/transactions", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const transactions = await db
        .select()
        .from(walletTransactions)
        .where(eq(walletTransactions.userId, userId))
        .orderBy(desc(walletTransactions.createdAt));

      res.json({ success: true, transactions });
    } catch (error: any) {
      console.error("Get transactions error:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to fetch transactions" });
    }
  });

  // ==================== NOTIFICATIONS ====================

  app.get("/api/notifications/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const userNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt));

      res.json({ success: true, notifications: userNotifications });
    } catch (error: any) {
      console.error("Get notifications error:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.id, parseInt(id)));

      res.json({ success: true });
    } catch (error: any) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/:userId/read-all", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.userId, userId));

      res.json({ success: true });
    } catch (error: any) {
      console.error("Mark all read error:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to mark all notifications as read" });
    }
  });

  app.delete("/api/notifications/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await db
        .delete(notifications)
        .where(eq(notifications.id, parseInt(id)));

      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete notification error:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to delete notification" });
    }
  });

  // ==================== DOCUMENTS ====================

  app.get("/api/documents/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const userDocuments = await db
        .select()
        .from(documents)
        .where(eq(documents.userId, userId))
        .orderBy(desc(documents.createdAt));

      res.json({ success: true, documents: userDocuments });
    } catch (error: any) {
      console.error("Get documents error:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to fetch documents" });
    }
  });

  // ==================== LINKED SERVICES ====================

  app.get("/api/linked-services/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const services = await db
        .select()
        .from(linkedServices)
        .where(eq(linkedServices.userId, userId));

      res.json({ success: true, services });
    } catch (error: any) {
      console.error("Get linked services error:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to fetch linked services" });
    }
  });

  app.patch("/api/linked-services/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { consumerId, connected } = req.body;

      const updateData: Record<string, any> = {};
      if (consumerId !== undefined) updateData.consumerId = consumerId;
      if (connected !== undefined) updateData.connected = connected;

      await db
        .update(linkedServices)
        .set(updateData)
        .where(eq(linkedServices.id, parseInt(id)));

      const [updated] = await db
        .select()
        .from(linkedServices)
        .where(eq(linkedServices.id, parseInt(id)))
        .limit(1);

      res.json({ success: true, service: updated });
    } catch (error: any) {
      console.error("Update linked service error:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to update linked service" });
    }
  });

  // ==================== USER ====================

  app.get("/api/user/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      const [complaintCountResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(complaints)
        .where(eq(complaints.userId, userId));

      const [activeComplaintResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(complaints)
        .where(and(eq(complaints.userId, userId), sql`${complaints.status} != 'resolved' AND ${complaints.status} != 'closed'`));

      const [documentCountResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(documents)
        .where(eq(documents.userId, userId));

      const [unreadNotifResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

      const [wallet] = await db
        .select()
        .from(walletAccounts)
        .where(eq(walletAccounts.userId, userId))
        .limit(1);

      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          aadhaar: user.aadhaar,
          suvidhaId: user.suvidhaId,
          createdAt: user.createdAt,
        },
        stats: {
          totalComplaints: complaintCountResult?.count || 0,
          activeComplaints: activeComplaintResult?.count || 0,
          totalDocuments: documentCountResult?.count || 0,
          unreadNotifications: unreadNotifResult?.count || 0,
          walletBalance: wallet?.balance || "0.00",
        },
      });
    } catch (error: any) {
      console.error("Get user error:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to fetch user" });
    }
  });

  // ==================== GET USER QR TOKEN ====================
  app.get("/api/user/:userId/qr-token", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const [token] = await db
        .select()
        .from(qrTokens)
        .where(and(eq(qrTokens.userId, userId), eq(qrTokens.revoked, false)))
        .limit(1);

      if (!token) {
        res.json({ success: false, message: "No QR token found" });
        return;
      }

      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      res.json({
        success: true,
        token: token.token,
        suvidhaId: user?.suvidhaId || "",
        userName: user?.name || "",
      });
    } catch (error: any) {
      console.error("Get QR token error:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to fetch QR token" });
    }
  });

  // ==================== REGISTER FACE (POST-SIGNUP) ====================
  app.post("/api/user/:userId/register-face", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { faceDescriptor } = req.body;

      if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length === 0) {
        res.status(400).json({ success: false, message: "Face descriptor required" });
        return;
      }

      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) {
        res.json({ success: false, message: "User not found" });
        return;
      }

      const DUPLICATE_THRESHOLD = 0.45;
      const allProfiles = await db
        .select()
        .from(faceProfiles)
        .where(sql`${faceProfiles.faceDescriptor} IS NOT NULL AND ${faceProfiles.userId} != ${userId}`);

      for (const profile of allProfiles) {
        try {
          const storedDescriptor = JSON.parse(profile.faceDescriptor!);
          if (!Array.isArray(storedDescriptor) || storedDescriptor.length !== faceDescriptor.length) continue;
          let sum = 0;
          for (let i = 0; i < faceDescriptor.length; i++) {
            const diff = faceDescriptor[i] - storedDescriptor[i];
            sum += diff * diff;
          }
          const distance = Math.sqrt(sum);
          if (distance < DUPLICATE_THRESHOLD) {
            res.status(409).json({
              success: false,
              message: "This face is already registered with another account. Duplicate face registrations are not allowed.",
              duplicate: true,
            });
            return;
          }
        } catch { continue; }
      }

      const [existingFace] = await db
        .select()
        .from(faceProfiles)
        .where(eq(faceProfiles.userId, userId))
        .limit(1);

      const faceHash = crypto.createHash("sha256").update(JSON.stringify(faceDescriptor)).digest("hex");

      if (existingFace) {
        await db
          .update(faceProfiles)
          .set({ faceDescriptor: JSON.stringify(faceDescriptor), faceHash })
          .where(eq(faceProfiles.userId, userId));
      } else {
        await db.insert(faceProfiles).values({
          userId,
          faceImage: "stored",
          faceHash,
          faceDescriptor: JSON.stringify(faceDescriptor),
        });
      }

      res.json({ success: true, message: "Face registered successfully" });
    } catch (error: any) {
      console.error("Register face error:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to register face" });
    }
  });

  // ==================== CHECK FACE STATUS ====================
  app.get("/api/user/:userId/face-status", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const [profile] = await db
        .select()
        .from(faceProfiles)
        .where(eq(faceProfiles.userId, userId))
        .limit(1);

      res.json({
        success: true,
        hasFace: !!profile?.faceDescriptor,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ==================== SEED 100 SAMPLE USERS ====================
  app.post("/api/admin/seed-users", async (_req: Request, res: Response) => {
    try {
      const existingCount = await db.select({ count: sql`count(*)` }).from(users);
      const count = Number(existingCount[0]?.count || 0);
      if (count >= 100) {
        res.json({ success: true, message: `Already have ${count} users, skipping seed.` });
        return;
      }

      let created = 0;
      for (let i = 0; i < 100; i++) {
        const aadhaar = `${String(100000000000 + i * 100000007).slice(0, 12)}`;
        const paddedAadhaar = aadhaar.padEnd(12, "0").slice(0, 12);
        const details = lookupAadhaar(paddedAadhaar);
        const suvidhaId = `SUV-2026-${String(1001 + i).slice(-4)}${String.fromCharCode(65 + (i % 26))}`;
        const qrToken = `sample-token-${String(i + 1).padStart(3, "0")}`;

        try {
          const existingUser = await db.select().from(users).where(eq(users.aadhaar, paddedAadhaar)).limit(1);
          if (existingUser.length > 0) continue;

          const [user] = await db.insert(users).values({
            username: details.phone,
            password: "sample-user",
            name: details.name,
            phone: details.phone,
            aadhaar: paddedAadhaar,
            suvidhaId,
          }).returning();

          await db.insert(qrTokens).values({
            userId: user.id,
            token: qrToken,
            payload: JSON.stringify({ suvidhaId, name: details.name }),
          });

          await db.insert(walletAccounts).values({
            userId: user.id,
            balance: String((Math.floor(Math.random() * 5000) + 100).toFixed(2)),
          });

          const defaultServices = ["Electricity", "Water", "Gas", "Waste"];
          await db.insert(linkedServices).values(
            defaultServices.map((serviceName) => ({
              userId: user.id,
              serviceName,
              connected: i % 3 === 0,
              consumerId: i % 3 === 0 ? `${serviceName.toUpperCase().slice(0, 3)}-${String(10000 + i).slice(-5)}` : null,
            }))
          );

          await db.insert(notifications).values({
            userId: user.id,
            type: "welcome",
            title: "Welcome to Suvidha!",
            message: `Welcome ${details.name}! Your Suvidha ID is ${suvidhaId}. Access all services through this kiosk.`,
            read: false,
          });

          created++;
        } catch (e: any) {
          console.log(`Skipping user ${i}: ${e.message}`);
        }
      }

      res.json({ success: true, message: `Seeded ${created} sample users.` });
    } catch (error: any) {
      console.error("Seed error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get("/api/admin/sample-users", async (_req: Request, res: Response) => {
    try {
      const allUsers = await db.select({
        id: users.id,
        name: users.name,
        phone: users.phone,
        aadhaar: users.aadhaar,
        suvidhaId: users.suvidhaId,
      }).from(users).limit(100);

      const userIds = allUsers.map(u => u.id);
      const faces = userIds.length > 0
        ? await db.select({ userId: faceProfiles.userId }).from(faceProfiles).where(sql`${faceProfiles.userId} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`)
        : [];
      const faceUserIds = new Set(faces.map(f => f.userId));

      const result = allUsers.map(u => ({
        ...u,
        aadhaarMasked: `XXXX XXXX ${u.aadhaar?.slice(-4) || "????"}`,
        faceRegistered: faceUserIds.has(u.id),
      }));

      res.json({ success: true, users: result, total: result.length });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Auto-seed on startup
  (async () => {
    try {
      const existingCount = await db.select({ count: sql`count(*)` }).from(users);
      const count = Number(existingCount[0]?.count || 0);
      if (count < 100) {
        console.log(`[Seed] Found ${count} users, seeding 100 sample users...`);
        for (let i = 0; i < 100; i++) {
          const aadhaar = `${String(100000000000 + i * 100000007).slice(0, 12)}`;
          const paddedAadhaar = aadhaar.padEnd(12, "0").slice(0, 12);
          const details = lookupAadhaar(paddedAadhaar);
          const suvidhaId = `SUV-2026-${String(1001 + i).slice(-4)}${String.fromCharCode(65 + (i % 26))}`;
          const qrToken = `sample-token-${String(i + 1).padStart(3, "0")}`;

          try {
            const existingUser = await db.select().from(users).where(eq(users.aadhaar, paddedAadhaar)).limit(1);
            if (existingUser.length > 0) continue;

            const [user] = await db.insert(users).values({
              username: details.phone,
              password: "sample-user",
              name: details.name,
              phone: details.phone,
              aadhaar: paddedAadhaar,
              suvidhaId,
            }).returning();

            await db.insert(qrTokens).values({
              userId: user.id,
              token: qrToken,
              payload: JSON.stringify({ suvidhaId, name: details.name }),
            });

            await db.insert(walletAccounts).values({
              userId: user.id,
              balance: String((Math.floor(Math.random() * 5000) + 100).toFixed(2)),
            });

            const defaultServices = ["Electricity", "Water", "Gas", "Waste"];
            await db.insert(linkedServices).values(
              defaultServices.map((serviceName) => ({
                userId: user.id,
                serviceName,
                connected: i % 3 === 0,
                consumerId: i % 3 === 0 ? `${serviceName.toUpperCase().slice(0, 3)}-${String(10000 + i).slice(-5)}` : null,
              }))
            );

            await db.insert(notifications).values({
              userId: user.id,
              type: "welcome",
              title: "Welcome to Suvidha!",
              message: `Welcome ${details.name}! Your Suvidha ID is ${suvidhaId}. Access all services through this kiosk.`,
              read: false,
            });
          } catch (e: any) {
            // skip duplicate
          }
        }
        console.log("[Seed] Sample users seeded successfully.");
      } else {
        console.log(`[Seed] Already have ${count} users, skipping seed.`);
      }
    } catch (e: any) {
      console.error("[Seed] Error:", e.message);
    }
  })();

  return server;
}
