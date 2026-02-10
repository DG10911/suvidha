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
  appointments,
  feedback,
  announcements,
  emergencyLogs,
  govtSchemes,
  certificateApplications,
  rtiApplications,
} from "../shared/schema";
import { eq, desc, and, sql, gte, lte, avg, count } from "drizzle-orm";
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

      const existing = await db.select().from(users).where(eq(users.aadhaar, aadhaar)).limit(1);

      if (existing.length > 0) {
        const existingUser = existing[0];
        const existingFace = await db.select().from(faceProfiles).where(eq(faceProfiles.userId, existingUser.id)).limit(1);

        if (existingFace.length > 0 && existingFace[0].faceDescriptor) {
          res.status(409).json({ success: false, message: "This Aadhaar is already registered with face data. Please use Face Login instead." });
          return;
        }

        const faceHash = faceImage ? CryptoJS.SHA256(faceImage).toString() : "no-face";

        if (faceDescriptor && Array.isArray(faceDescriptor) && faceDescriptor.length > 0) {
          if (existingFace.length > 0) {
            await db.update(faceProfiles)
              .set({ faceDescriptor: JSON.stringify(faceDescriptor), faceHash })
              .where(eq(faceProfiles.userId, existingUser.id));
          } else {
            await db.insert(faceProfiles).values({
              userId: existingUser.id,
              faceImage: "stored",
              faceHash,
              faceDescriptor: JSON.stringify(faceDescriptor),
            });
          }
        }

        if (phone && existingUser.phone !== phone) {
          await db.update(users).set({ phone, username: phone }).where(eq(users.id, existingUser.id));
        }

        const existingQr = await db.select().from(qrTokens).where(eq(qrTokens.userId, existingUser.id)).limit(1);
        const qrToken = existingQr.length > 0 ? existingQr[0].token : crypto.randomUUID();
        if (existingQr.length === 0) {
          await db.insert(qrTokens).values({
            userId: existingUser.id,
            token: qrToken,
            payload: JSON.stringify({ suvidhaId: existingUser.suvidhaId, name: existingUser.name }),
          });
        }

        console.log("[Signup] Updated existing user with face data:", existingUser.suvidhaId);
        res.json({
          success: true,
          user: { id: existingUser.id, suvidhaId: existingUser.suvidhaId, name: existingUser.name },
          qrToken,
        });
        return;
      }

      const existingPhone = await db.select().from(users).where(eq(users.username, phone)).limit(1);
      if (existingPhone.length > 0) {
        res.status(409).json({ success: false, message: "This phone number is already registered with another account. Please use login instead." });
        return;
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

  // ==================== APPOINTMENTS ====================

  const governmentOffices = [
    { id: "collector", name: "District Collector Office", address: "Civil Lines, Raipur", slots: ["09:00-09:30", "09:30-10:00", "10:00-10:30", "10:30-11:00", "11:00-11:30", "11:30-12:00", "14:00-14:30", "14:30-15:00", "15:00-15:30", "15:30-16:00"] },
    { id: "municipal", name: "Municipal Corporation", address: "Budha Talab, Raipur", slots: ["10:00-10:30", "10:30-11:00", "11:00-11:30", "11:30-12:00", "12:00-12:30", "14:00-14:30", "14:30-15:00", "15:00-15:30"] },
    { id: "electricity", name: "CSPDCL Office", address: "Danganiya, Raipur", slots: ["09:00-09:30", "09:30-10:00", "10:00-10:30", "10:30-11:00", "11:00-11:30", "14:00-14:30", "14:30-15:00"] },
    { id: "water", name: "PHE Department", address: "Moudhapara, Raipur", slots: ["10:00-10:30", "10:30-11:00", "11:00-11:30", "11:30-12:00", "14:00-14:30", "14:30-15:00", "15:00-15:30"] },
    { id: "revenue", name: "Revenue Office (Tehsil)", address: "Collectorate, Raipur", slots: ["10:00-10:30", "10:30-11:00", "11:00-11:30", "11:30-12:00", "14:00-14:30", "14:30-15:00"] },
    { id: "rto", name: "RTO Office", address: "Tatibandh, Raipur", slots: ["09:30-10:00", "10:00-10:30", "10:30-11:00", "11:00-11:30", "11:30-12:00", "14:00-14:30", "14:30-15:00", "15:00-15:30"] },
  ];

  app.get("/api/offices", (_req: Request, res: Response) => {
    res.json({ success: true, offices: governmentOffices });
  });

  app.get("/api/appointments/slots", async (req: Request, res: Response) => {
    try {
      const { office, date } = req.query;
      if (!office || !date) {
        res.status(400).json({ success: false, message: "office and date required" });
        return;
      }

      const officeData = governmentOffices.find(o => o.id === office);
      if (!officeData) {
        res.status(404).json({ success: false, message: "Office not found" });
        return;
      }

      const booked = await db
        .select({ timeSlot: appointments.timeSlot })
        .from(appointments)
        .where(and(
          eq(appointments.office, office as string),
          eq(appointments.date, date as string),
          eq(appointments.status, "booked")
        ));

      const bookedSlots = new Set(booked.map(b => b.timeSlot));
      const availableSlots = officeData.slots.map(slot => ({
        time: slot,
        available: !bookedSlots.has(slot),
      }));

      res.json({ success: true, slots: availableSlots, office: officeData });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post("/api/appointments", async (req: Request, res: Response) => {
    try {
      const { userId, office, purpose, date, timeSlot, notes } = req.body;
      if (!userId || !office || !purpose || !date || !timeSlot) {
        res.status(400).json({ success: false, message: "Missing required fields" });
        return;
      }

      const existing = await db.select().from(appointments)
        .where(and(
          eq(appointments.office, office),
          eq(appointments.date, date),
          eq(appointments.timeSlot, timeSlot),
          eq(appointments.status, "booked")
        )).limit(1);

      if (existing.length > 0) {
        res.status(409).json({ success: false, message: "This time slot is already booked" });
        return;
      }

      const tokenNumber = `TKN-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

      const [appointment] = await db.insert(appointments).values({
        userId,
        office,
        purpose,
        date,
        timeSlot,
        tokenNumber,
        status: "booked",
        notes: notes || null,
      }).returning();

      const officeData = governmentOffices.find(o => o.id === office);

      await db.insert(notifications).values({
        userId,
        type: "info",
        title: "Appointment Booked",
        message: `Your appointment at ${officeData?.name || office} on ${date} at ${timeSlot} is confirmed. Token: ${tokenNumber}`,
        read: false,
        actionLink: `/dashboard/appointments`,
      });

      await db.insert(documents).values({
        userId,
        title: `Appointment Confirmation - ${tokenNumber}`,
        type: "receipt",
        service: officeData?.name || office,
        referenceId: tokenNumber,
        content: JSON.stringify({
          tokenNumber,
          office: officeData?.name || office,
          address: officeData?.address || "",
          purpose,
          date,
          timeSlot,
          bookedAt: new Date().toISOString(),
        }),
      });

      res.json({ success: true, appointment });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get("/api/appointments", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        res.status(400).json({ success: false, message: "userId required" });
        return;
      }

      const userAppointments = await db
        .select()
        .from(appointments)
        .where(eq(appointments.userId, userId))
        .orderBy(desc(appointments.createdAt));

      res.json({ success: true, appointments: userAppointments });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.patch("/api/appointments/:id/cancel", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.update(appointments)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(appointments.id, parseInt(id)));

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ==================== FEEDBACK ====================

  app.post("/api/feedback", async (req: Request, res: Response) => {
    try {
      const { userId, complaintId, service, rating, comment } = req.body;
      if (!service || !rating || rating < 1 || rating > 5) {
        res.status(400).json({ success: false, message: "Service and rating (1-5) required" });
        return;
      }

      const [fb] = await db.insert(feedback).values({
        userId: userId || null,
        complaintId: complaintId || null,
        service,
        rating,
        comment: comment || null,
      }).returning();

      if (userId) {
        await db.insert(notifications).values({
          userId,
          type: "info",
          title: "Thank You for Your Feedback",
          message: `Your ${rating}-star rating for ${service} has been recorded. Your feedback helps us improve!`,
          read: false,
        });
      }

      res.json({ success: true, feedback: fb });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get("/api/feedback/summary", async (_req: Request, res: Response) => {
    try {
      const results = await db
        .select({
          service: feedback.service,
          avgRating: sql<number>`ROUND(AVG(${feedback.rating})::numeric, 1)`,
          totalRatings: sql<number>`COUNT(*)::int`,
        })
        .from(feedback)
        .groupBy(feedback.service);

      res.json({ success: true, summary: results });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get("/api/feedback", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;
      const result = userId
        ? await db.select().from(feedback).where(eq(feedback.userId, userId)).orderBy(desc(feedback.createdAt))
        : await db.select().from(feedback).orderBy(desc(feedback.createdAt)).limit(50);

      res.json({ success: true, feedback: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ==================== ANNOUNCEMENTS ====================

  app.get("/api/announcements", async (_req: Request, res: Response) => {
    try {
      const now = new Date();
      const activeAnnouncements = await db
        .select()
        .from(announcements)
        .where(eq(announcements.active, true))
        .orderBy(desc(announcements.createdAt));

      const filtered = activeAnnouncements.filter(a => {
        if (a.endDate && new Date(a.endDate) < now) return false;
        if (a.startDate && new Date(a.startDate) > now) return false;
        return true;
      });

      res.json({ success: true, announcements: filtered });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ==================== EMERGENCY ====================

  app.post("/api/emergency", async (req: Request, res: Response) => {
    try {
      const { userId, serviceType, notes } = req.body;
      if (!serviceType) {
        res.status(400).json({ success: false, message: "Service type required" });
        return;
      }

      const [log] = await db.insert(emergencyLogs).values({
        userId: userId || null,
        serviceType,
        notes: notes || null,
        status: "initiated",
      }).returning();

      if (userId) {
        await db.insert(notifications).values({
          userId,
          type: "alert",
          title: "Emergency Alert Sent",
          message: `Your ${serviceType} emergency alert has been registered. Help is on the way. Reference: EMG-${log.id}`,
          read: false,
        });
      }

      res.json({ success: true, emergency: log, referenceId: `EMG-${log.id}` });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get("/api/emergency/history", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        res.status(400).json({ success: false, message: "userId required" });
        return;
      }

      const history = await db
        .select()
        .from(emergencyLogs)
        .where(eq(emergencyLogs.userId, userId))
        .orderBy(desc(emergencyLogs.createdAt))
        .limit(20);

      res.json({ success: true, history });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ==================== DASHBOARD STATS ====================

  app.get("/api/dashboard/stats/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const [walletData] = await db.select().from(walletAccounts).where(eq(walletAccounts.userId, userId)).limit(1);

      const [activeComplaintCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(complaints)
        .where(and(eq(complaints.userId, userId), sql`${complaints.status} NOT IN ('resolved', 'closed')`));

      const [resolvedCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(complaints)
        .where(and(eq(complaints.userId, userId), sql`${complaints.status} IN ('resolved', 'closed')`));

      const upcomingAppointments = await db
        .select()
        .from(appointments)
        .where(and(eq(appointments.userId, userId), eq(appointments.status, "booked")))
        .orderBy(appointments.date)
        .limit(3);

      const [unreadNotifs] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

      const [totalDocuments] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(documents)
        .where(eq(documents.userId, userId));

      const recentActivity = await db
        .select({
          id: notifications.id,
          type: notifications.type,
          title: notifications.title,
          message: notifications.message,
          createdAt: notifications.createdAt,
        })
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(5);

      const feedbackSummary = await db
        .select({
          service: feedback.service,
          avgRating: sql<number>`ROUND(AVG(${feedback.rating})::numeric, 1)`,
          total: sql<number>`count(*)::int`,
        })
        .from(feedback)
        .groupBy(feedback.service);

      res.json({
        success: true,
        stats: {
          walletBalance: walletData?.balance || "0.00",
          activeComplaints: activeComplaintCount?.count || 0,
          resolvedComplaints: resolvedCount?.count || 0,
          upcomingAppointments,
          unreadNotifications: unreadNotifs?.count || 0,
          totalDocuments: totalDocuments?.count || 0,
          recentActivity,
          feedbackSummary,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ==================== CERTIFICATE APPLICATIONS ====================

  const certificateTypes = [
    { id: "birth", name: "Birth Certificate", fee: "50", processingDays: 7, docs: "Hospital record, Parent Aadhaar, Address proof" },
    { id: "death", name: "Death Certificate", fee: "50", processingDays: 7, docs: "Hospital record / Doctor certificate, Family Aadhaar" },
    { id: "income", name: "Income Certificate", fee: "30", processingDays: 10, docs: "Aadhaar, Ration Card, Salary slip / Self-declaration" },
    { id: "caste", name: "Caste Certificate (SC/ST/OBC)", fee: "30", processingDays: 15, docs: "Aadhaar, Father's caste certificate, Affidavit" },
    { id: "domicile", name: "Domicile Certificate", fee: "30", processingDays: 15, docs: "Aadhaar, Ration Card, 10th marksheet, Electricity bill" },
    { id: "marriage", name: "Marriage Certificate", fee: "100", processingDays: 15, docs: "Aadhaar (both spouses), Marriage photos, Witness Aadhaar (2)" },
    { id: "residence", name: "Residence Certificate", fee: "30", processingDays: 10, docs: "Aadhaar, Ration Card, Electricity/Water bill" },
    { id: "character", name: "Character Certificate", fee: "30", processingDays: 10, docs: "Aadhaar, Passport photo, Police verification form" },
  ];

  app.get("/api/certificates/types", (_req: Request, res: Response) => {
    res.json({ success: true, types: certificateTypes });
  });

  app.post("/api/certificates/apply", async (req: Request, res: Response) => {
    try {
      const { userId, certificateType, applicantName, fatherName, motherName, dateOfBirth, address, purpose, additionalDetails } = req.body;
      if (!certificateType || !applicantName || !address) {
        res.status(400).json({ success: false, message: "Certificate type, applicant name, and address are required" });
        return;
      }

      const certType = certificateTypes.find(c => c.id === certificateType);
      if (!certType) {
        res.status(400).json({ success: false, message: "Invalid certificate type" });
        return;
      }

      const applicationId = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

      const expDate = new Date();
      expDate.setDate(expDate.getDate() + certType.processingDays);

      const [application] = await db.insert(certificateApplications).values({
        userId: userId || null,
        applicationId,
        certificateType,
        applicantName,
        fatherName: fatherName || null,
        motherName: motherName || null,
        dateOfBirth: dateOfBirth || null,
        address,
        purpose: purpose || null,
        additionalDetails: additionalDetails || null,
        status: "submitted",
        fee: certType.fee,
        expectedDate: expDate.toISOString().split("T")[0],
      }).returning();

      if (userId) {
        await db.insert(notifications).values({
          userId,
          type: "info",
          title: `${certType.name} Application Submitted`,
          message: `Your application ${applicationId} for ${certType.name} has been submitted. Fee: ₹${certType.fee}. Expected by: ${expDate.toLocaleDateString("en-IN")}`,
          read: false,
        });

        await db.insert(documents).values({
          userId,
          title: `Certificate Application - ${applicationId}`,
          type: "application",
          service: certType.name,
          referenceId: applicationId,
          content: JSON.stringify({ applicationId, certificateType: certType.name, applicantName, status: "submitted", fee: certType.fee, expectedDate: expDate.toISOString().split("T")[0] }),
        });
      }

      res.json({ success: true, application, certificateInfo: certType });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get("/api/certificates/my", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) { res.status(400).json({ success: false, message: "userId required" }); return; }

      const apps = await db.select().from(certificateApplications)
        .where(eq(certificateApplications.userId, userId))
        .orderBy(desc(certificateApplications.createdAt));

      res.json({ success: true, applications: apps });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get("/api/certificates/track/:applicationId", async (req: Request, res: Response) => {
    try {
      const [app] = await db.select().from(certificateApplications)
        .where(eq(certificateApplications.applicationId, req.params.applicationId))
        .limit(1);

      if (!app) { res.status(404).json({ success: false, message: "Application not found" }); return; }
      res.json({ success: true, application: app });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ==================== RTI APPLICATIONS ====================

  const rtiDepartments = [
    { id: "collector", name: "District Collector Office" },
    { id: "municipal", name: "Municipal Corporation, Raipur" },
    { id: "police", name: "Police Department" },
    { id: "education", name: "Education Department" },
    { id: "health", name: "Health Department" },
    { id: "phe", name: "Public Health Engineering (PHE)" },
    { id: "pwd", name: "Public Works Department (PWD)" },
    { id: "revenue", name: "Revenue Department" },
    { id: "agriculture", name: "Agriculture Department" },
    { id: "forest", name: "Forest Department" },
    { id: "electricity", name: "CSPDCL / Electricity Board" },
    { id: "transport", name: "Transport Department / RTO" },
  ];

  app.get("/api/rti/departments", (_req: Request, res: Response) => {
    res.json({ success: true, departments: rtiDepartments });
  });

  app.post("/api/rti/apply", async (req: Request, res: Response) => {
    try {
      const { userId, department, subject, description, applicantName, applicantAddress, bplStatus } = req.body;
      if (!department || !subject || !description || !applicantName || !applicantAddress) {
        res.status(400).json({ success: false, message: "All fields are required" });
        return;
      }

      const rtiId = `RTI-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
      const fee = bplStatus ? "0" : "10";

      const responseDeadline = new Date();
      responseDeadline.setDate(responseDeadline.getDate() + 30);

      const [application] = await db.insert(rtiApplications).values({
        userId: userId || null,
        rtiId,
        department,
        subject,
        description,
        applicantName,
        applicantAddress,
        bplStatus: bplStatus || false,
        fee,
        status: "submitted",
        responseDate: responseDeadline.toISOString().split("T")[0],
      }).returning();

      if (userId) {
        const deptName = rtiDepartments.find(d => d.id === department)?.name || department;

        await db.insert(notifications).values({
          userId,
          type: "info",
          title: "RTI Application Filed",
          message: `Your RTI application ${rtiId} to ${deptName} has been filed. Fee: ₹${fee}. Response expected by: ${responseDeadline.toLocaleDateString("en-IN")}`,
          read: false,
        });

        await db.insert(documents).values({
          userId,
          title: `RTI Application - ${rtiId}`,
          type: "application",
          service: "RTI - " + deptName,
          referenceId: rtiId,
          content: JSON.stringify({ rtiId, department: deptName, subject, status: "submitted", fee, responseDeadline: responseDeadline.toISOString().split("T")[0] }),
        });
      }

      res.json({ success: true, application, rtiId });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get("/api/rti/my", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) { res.status(400).json({ success: false, message: "userId required" }); return; }

      const apps = await db.select().from(rtiApplications)
        .where(eq(rtiApplications.userId, userId))
        .orderBy(desc(rtiApplications.createdAt));

      res.json({ success: true, applications: apps });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get("/api/rti/track/:rtiId", async (req: Request, res: Response) => {
    try {
      const [app] = await db.select().from(rtiApplications)
        .where(eq(rtiApplications.rtiId, req.params.rtiId))
        .limit(1);

      if (!app) { res.status(404).json({ success: false, message: "RTI application not found" }); return; }
      res.json({ success: true, application: app });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ==================== NEARBY SERVICES DIRECTORY ====================

  const nearbyServices = [
    { category: "hospital", name: "AIIMS Raipur", address: "Tatibandh, GE Road, Raipur 492099", phone: "0771-2572222", type: "Government Hospital", hours: "24/7 Emergency", lat: 21.2514, lng: 81.6296 },
    { category: "hospital", name: "DKS Post Graduate Institute", address: "Rajbandha Maidan, Raipur", phone: "0771-2523255", type: "Government Hospital", hours: "24/7 Emergency", lat: 21.2362, lng: 81.6314 },
    { category: "hospital", name: "Ambedkar Hospital", address: "Byron Bazar, Raipur", phone: "0771-2224888", type: "Government Hospital", hours: "24/7", lat: 21.2455, lng: 81.6316 },
    { category: "hospital", name: "District Hospital, Raipur", address: "Jail Road, Raipur", phone: "0771-2234567", type: "Government Hospital", hours: "24/7", lat: 21.2401, lng: 81.6356 },
    { category: "police", name: "City Kotwali Police Station", address: "Kotwali Chowk, Raipur", phone: "0771-2229911", type: "Police Station", hours: "24/7", lat: 21.2457, lng: 81.6314 },
    { category: "police", name: "Civil Lines Police Station", address: "Civil Lines, Raipur", phone: "0771-2228100", type: "Police Station", hours: "24/7", lat: 21.2520, lng: 81.6280 },
    { category: "police", name: "Telibandha Police Station", address: "Telibandha, Raipur", phone: "0771-2283322", type: "Police Station", hours: "24/7", lat: 21.2395, lng: 81.6509 },
    { category: "police", name: "SP Office Raipur", address: "Civil Lines, Raipur", phone: "0771-2223344", type: "Superintendent Office", hours: "10:00-17:00", lat: 21.2530, lng: 81.6290 },
    { category: "bank", name: "SBI Main Branch", address: "Jaistambh Chowk, Raipur", phone: "0771-2224567", type: "Public Sector Bank", hours: "10:00-16:00 (Mon-Sat)", lat: 21.2487, lng: 81.6339 },
    { category: "bank", name: "Bank of India", address: "Pandri, Raipur", phone: "0771-2225656", type: "Public Sector Bank", hours: "10:00-16:00 (Mon-Sat)", lat: 21.2300, lng: 81.6330 },
    { category: "bank", name: "Central Bank of India", address: "Malviya Road, Raipur", phone: "0771-2225000", type: "Public Sector Bank", hours: "10:00-16:00 (Mon-Sat)", lat: 21.2460, lng: 81.6340 },
    { category: "postoffice", name: "GPO Raipur (Head Post Office)", address: "Jaistambh Chowk, Raipur 492001", phone: "0771-2224008", type: "Head Post Office", hours: "09:00-17:00 (Mon-Sat)", lat: 21.2485, lng: 81.6338 },
    { category: "postoffice", name: "Pandri Post Office", address: "Pandri, Raipur", phone: "0771-2225100", type: "Sub Post Office", hours: "09:00-17:00 (Mon-Sat)", lat: 21.2310, lng: 81.6320 },
    { category: "school", name: "Kendriya Vidyalaya No.1", address: "Sector 4, Raipur", phone: "0771-2254333", type: "Central Government School", hours: "07:30-14:00", lat: 21.2567, lng: 81.6200 },
    { category: "school", name: "Govt. Higher Secondary School", address: "Civil Lines, Raipur", phone: "0771-2222444", type: "Government School", hours: "07:30-14:00", lat: 21.2510, lng: 81.6270 },
    { category: "gas", name: "Indane Gas Agency - Raipur", address: "Devendra Nagar, Raipur", phone: "0771-2227788", type: "LPG Distributor", hours: "09:00-18:00 (Mon-Sat)", lat: 21.2400, lng: 81.6450 },
    { category: "gas", name: "HP Gas Agency - Central", address: "Pandri, Raipur", phone: "0771-2225599", type: "LPG Distributor", hours: "09:00-18:00 (Mon-Sat)", lat: 21.2320, lng: 81.6350 },
    { category: "ration", name: "Fair Price Shop - Ward 10", address: "Moudhapara, Raipur", phone: "9876543210", type: "Ration Shop", hours: "08:00-14:00 (Mon-Sat)", lat: 21.2380, lng: 81.6380 },
    { category: "ration", name: "Fair Price Shop - Ward 25", address: "Pandri, Raipur", phone: "9876543211", type: "Ration Shop", hours: "08:00-14:00 (Mon-Sat)", lat: 21.2290, lng: 81.6340 },
  ];

  app.get("/api/nearby-services", (req: Request, res: Response) => {
    const category = req.query.category as string;
    const search = (req.query.search as string || "").toLowerCase();

    let result = nearbyServices;
    if (category && category !== "all") {
      result = result.filter(s => s.category === category);
    }
    if (search) {
      result = result.filter(s =>
        s.name.toLowerCase().includes(search) ||
        s.address.toLowerCase().includes(search) ||
        s.type.toLowerCase().includes(search)
      );
    }

    res.json({ success: true, services: result });
  });

  // ==================== PROPERTY TAX CALCULATOR ====================

  app.post("/api/tax/calculate", (req: Request, res: Response) => {
    const { propertyType, zone, builtUpArea, floor, age, selfOccupied } = req.body;

    const baseRates: Record<string, number> = {
      residential: 1.5,
      commercial: 4.0,
      industrial: 3.5,
      mixeduse: 2.5,
    };

    const zoneMultiplier: Record<string, number> = {
      A: 1.5,
      B: 1.2,
      C: 1.0,
      D: 0.8,
    };

    const floorMultiplier: Record<string, number> = {
      ground: 1.0,
      first: 1.1,
      second: 1.15,
      third: 1.2,
    };

    const baseRate = baseRates[propertyType] || 1.5;
    const zoneMul = zoneMultiplier[zone] || 1.0;
    const floorMul = floorMultiplier[floor] || 1.0;
    const area = parseFloat(builtUpArea) || 0;

    let annualValue = area * baseRate * zoneMul * floorMul * 12;

    let ageDiscount = 0;
    const propAge = parseInt(age) || 0;
    if (propAge > 25) ageDiscount = 0.20;
    else if (propAge > 15) ageDiscount = 0.10;

    annualValue = annualValue * (1 - ageDiscount);

    if (selfOccupied) annualValue = annualValue * 0.6;

    const generalTax = annualValue * 0.12;
    const waterTax = annualValue * 0.04;
    const sewageTax = annualValue * 0.02;
    const lightingTax = annualValue * 0.015;
    const cleaningTax = annualValue * 0.06;

    const totalTax = generalTax + waterTax + sewageTax + lightingTax + cleaningTax;

    const earlyDiscount = totalTax * 0.10;

    res.json({
      success: true,
      calculation: {
        annualValue: Math.round(annualValue),
        breakdown: [
          { name: "General Tax (12%)", amount: Math.round(generalTax) },
          { name: "Water Tax (4%)", amount: Math.round(waterTax) },
          { name: "Sewage Tax (2%)", amount: Math.round(sewageTax) },
          { name: "Lighting Tax (1.5%)", amount: Math.round(lightingTax) },
          { name: "Cleaning Tax (6%)", amount: Math.round(cleaningTax) },
        ],
        totalTax: Math.round(totalTax),
        earlyPaymentDiscount: Math.round(earlyDiscount),
        afterDiscount: Math.round(totalTax - earlyDiscount),
        ageDiscountApplied: `${ageDiscount * 100}%`,
        selfOccupiedReduction: selfOccupied ? "40% reduction applied" : "None",
      },
    });
  });

  // ==================== GOVT SCHEMES ====================

  app.get("/api/schemes", async (req: Request, res: Response) => {
    try {
      const category = req.query.category as string;
      let result;
      if (category && category !== "all") {
        result = await db
          .select()
          .from(govtSchemes)
          .where(and(eq(govtSchemes.active, true), eq(govtSchemes.category, category)))
          .orderBy(desc(govtSchemes.createdAt));
      } else {
        result = await db
          .select()
          .from(govtSchemes)
          .where(eq(govtSchemes.active, true))
          .orderBy(desc(govtSchemes.createdAt));
      }
      res.json({ success: true, schemes: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get("/api/schemes/:id", async (req: Request, res: Response) => {
    try {
      const [scheme] = await db
        .select()
        .from(govtSchemes)
        .where(eq(govtSchemes.id, parseInt(req.params.id)))
        .limit(1);
      if (!scheme) {
        res.status(404).json({ success: false, message: "Scheme not found" });
        return;
      }
      res.json({ success: true, scheme });
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

      const existingAnnouncements = await db.select({ count: sql`count(*)` }).from(announcements);
      const announcementCount = Number(existingAnnouncements[0]?.count || 0);
      if (announcementCount === 0) {
        console.log("[Seed] Seeding announcements...");
        await db.insert(announcements).values([
          {
            title: "Water Supply Maintenance - Zone 3 & 4",
            body: "Water supply will be disrupted in Zone 3 and Zone 4 on Feb 15, 2026 from 9 AM to 5 PM due to pipeline maintenance. Please store sufficient water. Tanker services available on helpline 1800-233-4455.",
            category: "water",
            priority: "high",
            active: true,
          },
          {
            title: "New Ration Card Applications Open",
            body: "Applications for new ration cards are now being accepted at all Suvidha Kiosks. Bring Aadhaar, address proof, and income certificate. Last date: March 31, 2026.",
            category: "scheme",
            priority: "normal",
            active: true,
          },
          {
            title: "Property Tax Early Payment - 10% Discount",
            body: "Pay your property tax before March 15, 2026 to avail 10% early payment discount. Payment accepted via wallet, UPI, or cash at any Suvidha Kiosk.",
            category: "tax",
            priority: "high",
            active: true,
          },
          {
            title: "Free Health Camp - Pandri Community Center",
            body: "Free health checkup camp organized by Municipal Corporation at Pandri Community Center on Feb 20-22, 2026. Services include BP check, diabetes screening, eye checkup, and dental consultation.",
            category: "health",
            priority: "normal",
            active: true,
          },
          {
            title: "Electricity Tariff Revision Notice",
            body: "CSPDCL has revised electricity tariffs effective April 1, 2026. Domestic consumers: ₹3.50/unit (0-100), ₹5.00/unit (101-300), ₹6.50/unit (300+). Visit CSPDCL office or call 1912 for details.",
            category: "electricity",
            priority: "normal",
            active: true,
          },
          {
            title: "Smart City Road Construction - NH30 Diversion",
            body: "NH30 near Telibandha will be under construction from Feb 12-28, 2026. Traffic diverted via VIP Road. Please plan your travel accordingly.",
            category: "infrastructure",
            priority: "high",
            active: true,
          },
          {
            title: "PM Awas Yojana - New Registrations",
            body: "Registrations open for PM Awas Yojana (Urban) for eligible families. Apply at District Collector Office or through this kiosk. Income limit: ₹3 lakh/year for EWS category.",
            category: "scheme",
            priority: "normal",
            active: true,
          },
          {
            title: "Gas Cylinder Subsidy Direct Transfer",
            body: "LPG subsidy is now transferred directly to your linked bank account. Ensure your bank account and Aadhaar are linked. Check status at any Gas Service counter.",
            category: "gas",
            priority: "normal",
            active: true,
          },
        ]);
        console.log("[Seed] Announcements seeded successfully.");
      }

      const existingSchemes = await db.select({ count: sql`count(*)` }).from(govtSchemes);
      const schemeCount = Number(existingSchemes[0]?.count || 0);
      if (schemeCount === 0) {
        console.log("[Seed] Seeding government schemes...");
        await db.insert(govtSchemes).values([
          {
            name: "PM Awas Yojana (Urban) 2.0",
            ministry: "Ministry of Housing and Urban Affairs",
            category: "housing",
            summary: "Affordable housing scheme for urban poor and middle-income families. Provides financial assistance up to ₹2.5 lakh for construction or purchase of a house.",
            eligibility: "• EWS: Annual income up to ₹3 lakh\n• LIG: Annual income ₹3-6 lakh\n• MIG-I: Annual income ₹6-12 lakh\n• MIG-II: Annual income ₹12-18 lakh\n• Applicant should not own a pucca house anywhere in India\n• Women ownership or co-ownership mandatory for EWS/LIG",
            benefits: "• EWS/LIG: Up to ₹2.5 lakh subsidy\n• MIG-I: Up to ₹2.35 lakh interest subsidy on home loan\n• MIG-II: Up to ₹2.30 lakh interest subsidy\n• Credit-linked subsidy on home loans at 6.5% interest for 20 years",
            howToApply: "Step 1: Visit the nearest Suvidha Kiosk or Common Service Centre (CSC)\nStep 2: Fill the PMAY-U application form with Aadhaar details\nStep 3: Submit income proof, address proof, and Aadhaar card\nStep 4: Application verified by Urban Local Body (ULB)\nStep 5: Approved beneficiaries receive sanction letter\nStep 6: Subsidy credited directly to beneficiary's bank/loan account",
            documentsRequired: "• Aadhaar Card (mandatory)\n• Income Certificate from Tehsildar\n• Address Proof (Ration Card / Voter ID / Utility Bill)\n• Bank Account Details with IFSC\n• Passport-size Photos (3)\n• Affidavit of not owning pucca house\n• Land ownership documents (if applicable)",
            websiteUrl: "https://pmaymis.gov.in",
            lastDate: "March 31, 2026",
            isNew: true,
            active: true,
          },
          {
            name: "Ayushman Bharat - PMJAY",
            ministry: "Ministry of Health & Family Welfare",
            category: "health",
            summary: "World's largest health insurance scheme providing free health cover of ₹5 lakh per family per year for secondary and tertiary hospitalization to poor and vulnerable families.",
            eligibility: "• Families identified through SECC 2011 data\n• No restriction on family size or age\n• Deprived rural families and identified urban worker categories\n• All ration card holders from Chhattisgarh automatically eligible\n• Pre-existing diseases covered from day one",
            benefits: "• ₹5 lakh health cover per family per year\n• 1,929+ treatment packages covered\n• Cashless treatment at empanelled hospitals\n• Pre and post hospitalization expenses (3 & 15 days)\n• Transport allowance included\n• No cap on family size",
            howToApply: "Step 1: Check eligibility on mera.pmjay.gov.in or call 14555\nStep 2: Visit nearest Ayushman Mitra at empanelled hospital or CSC\nStep 3: Verify identity with Aadhaar card and ration card\nStep 4: e-KYC and biometric verification completed\nStep 5: Ayushman Card generated instantly (Golden Card)\nStep 6: Use card for cashless treatment at any empanelled hospital across India",
            documentsRequired: "• Aadhaar Card\n• Ration Card or SECC letter\n• Mobile Number for OTP\n• Passport-size Photo\n• Any government-issued ID (Voter ID, PAN, Driving License)",
            websiteUrl: "https://pmjay.gov.in",
            isNew: true,
            active: true,
          },
          {
            name: "PM Kisan Samman Nidhi",
            ministry: "Ministry of Agriculture & Farmers Welfare",
            category: "agriculture",
            summary: "Direct income support of ₹6,000 per year in three equal installments to all landholding farmer families across the country.",
            eligibility: "• All landholding farmer families with cultivable land\n• Small and marginal farmers (land up to 2 hectares) get priority\n• Must have valid Aadhaar and bank account\n• Institutional landholders, income tax payers, and govt employees excluded\n• Farmers from Chhattisgarh can apply at any Suvidha Kiosk",
            benefits: "• ₹6,000 per year (₹2,000 every 4 months)\n• Direct bank transfer (DBT)\n• No middlemen involved\n• Three installments: Apr-Jul, Aug-Nov, Dec-Mar\n• Can be used for any farming or personal need",
            howToApply: "Step 1: Visit Suvidha Kiosk or PM-KISAN portal (pmkisan.gov.in)\nStep 2: Register with Aadhaar number, name, and bank details\nStep 3: Enter land details (survey number, area in hectares)\nStep 4: Upload land ownership documents\nStep 5: Verification by State/UT government officials\nStep 6: After approval, ₹2,000 credited to bank account every 4 months",
            documentsRequired: "• Aadhaar Card\n• Bank Passbook (first page with IFSC)\n• Land Ownership Records (Khasra/Khatauni/B1)\n• Mobile Number linked with Aadhaar\n• Passport-size Photo",
            websiteUrl: "https://pmkisan.gov.in",
            isNew: false,
            active: true,
          },
          {
            name: "Ujjwala Yojana 2.0",
            ministry: "Ministry of Petroleum & Natural Gas",
            category: "energy",
            summary: "Free LPG connections to women from BPL households. Under 2.0, first refill and hotplate also provided free along with the connection.",
            eligibility: "• Women from BPL households\n• No LPG connection in the household\n• Adult woman member of the household\n• Priority to SC/ST, Pradhan Mantri Awas Yojana beneficiaries, Antyodaya, forest dwellers, tea garden workers\n• Migrant workers' families can apply with self-declaration",
            benefits: "• Free LPG connection with 14.2 kg cylinder\n• Free first refill\n• Free hotplate (stove)\n• Deposit-free connection\n• EMI facility for subsequent refills\n• Subsidy directly credited to bank account",
            howToApply: "Step 1: Visit nearest LPG distributor or Suvidha Kiosk\nStep 2: Fill the Ujjwala 2.0 application form (KYC form)\nStep 3: Submit required documents (BPL list/Ration Card + Aadhaar)\nStep 4: e-KYC verification at distributor point\nStep 5: Connection installed at home within 7-15 days\nStep 6: First cylinder and hotplate delivered free of cost",
            documentsRequired: "• Aadhaar Card (mandatory for both applicant and adult family members)\n• BPL Ration Card or Certificate\n• Bank Account Passbook\n• Passport-size Photo\n• Address Proof (if different from Aadhaar)\n• Self-declaration for migrants (in lieu of ration card)",
            websiteUrl: "https://www.pmujjwalayojana.com",
            isNew: false,
            active: true,
          },
          {
            name: "Sukanya Samriddhi Yojana",
            ministry: "Ministry of Finance",
            category: "women",
            summary: "Small savings scheme for girl children offering 8.2% interest rate with tax benefits. Secure your daughter's future education and marriage expenses.",
            eligibility: "• Parents/legal guardian of a girl child\n• Girl child must be below 10 years of age\n• Maximum 2 accounts per family (one per girl child)\n• Third account allowed only in case of twin girls\n• Indian resident only",
            benefits: "• Interest rate: 8.2% per annum (compounded annually)\n• Tax deduction under Section 80C (up to ₹1.5 lakh)\n• Interest earned is tax-free\n• Maturity amount is tax-free\n• Minimum deposit: ₹250/year\n• Maximum deposit: ₹1.5 lakh/year\n• Maturity: 21 years from account opening or marriage after 18",
            howToApply: "Step 1: Visit any Post Office or authorized bank branch\nStep 2: Fill SSY Account Opening Form\nStep 3: Submit girl child's birth certificate and guardian's ID\nStep 4: Make initial deposit (minimum ₹250)\nStep 5: Receive passbook with account number\nStep 6: Deposit annually (minimum ₹250) for 15 years, account matures at 21 years",
            documentsRequired: "• Birth Certificate of girl child\n• Aadhaar Card of guardian/parent\n• PAN Card of guardian\n• Address Proof\n• Passport-size Photos (guardian and girl child)\n• Initial deposit amount",
            websiteUrl: "https://www.nsiindia.gov.in",
            isNew: false,
            active: true,
          },
          {
            name: "PM Vishwakarma Yojana",
            ministry: "Ministry of Micro, Small & Medium Enterprises",
            category: "employment",
            summary: "End-to-end support for traditional artisans and craftspeople through recognition, skill upgradation, toolkit incentive, credit support and market linkage.",
            eligibility: "• Traditional artisans/craftspeople working with hands and tools\n• 18 trades covered: Carpenter, Blacksmith, Goldsmith, Potter, Sculptor, Cobbler, Tailor, Weaver, etc.\n• Age 18+ years\n• Must be self-employed, not in government/PSU\n• Only one member per family eligible\n• Registration through CSC/Suvidha Kiosk with biometric",
            benefits: "• PM Vishwakarma Certificate and ID Card\n• ₹15,000 toolkit incentive (via e-RUPI/e-voucher)\n• Collateral-free credit: ₹1 lakh (first) + ₹2 lakh (second tranche) at 5% interest\n• Free skill training: Basic (5-7 days) + Advanced (15 days)\n• ₹500/day stipend during training\n• Digital transaction incentive: ₹1 per transaction (max ₹100/month)\n• Marketing & branding support",
            howToApply: "Step 1: Visit Suvidha Kiosk or Common Service Centre\nStep 2: Register on PM Vishwakarma portal with Aadhaar and mobile\nStep 3: Gram Panchayat/ULB verifies your trade and identity\nStep 4: Receive PM Vishwakarma Certificate and ID Card\nStep 5: Enroll for skill training at designated center\nStep 6: After training, apply for toolkit incentive and credit support\nStep 7: Open bank account (if not available) for direct benefit transfer",
            documentsRequired: "• Aadhaar Card\n• Mobile Number linked to Aadhaar\n• Bank Account with IFSC\n• Ration Card / BPL Certificate\n• Caste Certificate (if applicable)\n• Passport-size Photo\n• Trade-related evidence (tools, workspace photo)",
            websiteUrl: "https://pmvishwakarma.gov.in",
            lastDate: "Open enrollment",
            isNew: true,
            active: true,
          },
          {
            name: "Atal Pension Yojana",
            ministry: "Ministry of Finance, Dept. of Financial Services",
            category: "pension",
            summary: "Guaranteed minimum pension of ₹1,000 to ₹5,000 per month after 60 years of age for unorganized sector workers. Government co-contributes 50% for eligible subscribers.",
            eligibility: "• Indian citizen aged 18-40 years\n• Must have savings bank account\n• Must have valid mobile number\n• Not covered under any statutory social security scheme\n• Not an income tax payer\n• Government co-contribution available for those who joined before Dec 2015",
            benefits: "• Guaranteed pension: ₹1,000 / ₹2,000 / ₹3,000 / ₹4,000 / ₹5,000 per month\n• Pension starts at age 60\n• Spouse gets same pension after subscriber's death\n• Nominee receives accumulated corpus\n• Tax benefit under Section 80CCD\n• Monthly contribution as low as ₹42 (age 18, ₹1,000 pension)",
            howToApply: "Step 1: Visit your bank branch or open account through net banking/mobile app\nStep 2: Fill APY registration form\nStep 3: Choose pension amount (₹1,000 to ₹5,000)\nStep 4: Provide Aadhaar and mobile number\nStep 5: Set up auto-debit from savings account\nStep 6: Receive confirmation SMS and PRAN (Permanent Retirement Account Number)",
            documentsRequired: "• Aadhaar Card\n• Bank Account (Savings)\n• Mobile Number\n• Nominee details with Aadhaar",
            websiteUrl: "https://www.npscra.nsdl.co.in/scheme-details.php",
            isNew: false,
            active: true,
          },
          {
            name: "PM Surya Ghar Muft Bijli Yojana",
            ministry: "Ministry of New and Renewable Energy",
            category: "energy",
            summary: "Free electricity scheme through rooftop solar panels. Get up to 300 units of free electricity per month with heavy subsidy on solar panel installation.",
            eligibility: "• Any residential household with a valid electricity connection\n• Roof should be suitable for solar panel installation\n• Grid-connected rooftop solar system required\n• Must apply through registered vendor empanelled by DISCOM\n• Available across all states and UTs",
            benefits: "• Up to 300 units free electricity per month\n• Central subsidy: ₹30,000 for 1 kW, ₹60,000 for 2 kW, ₹78,000 for 3+ kW systems\n• Excess electricity sold to grid at feed-in tariff\n• 25+ years system life with minimal maintenance\n• Estimated savings: ₹15,000-25,000 per year\n• Collateral-free loan available from banks at subsidized rates",
            howToApply: "Step 1: Register on National Portal (pmsuryaghar.gov.in) with electricity bill details\nStep 2: Select rooftop solar capacity based on consumption\nStep 3: Choose empanelled vendor from DISCOM list\nStep 4: Vendor conducts site survey and installs panels\nStep 5: DISCOM inspects and approves net metering installation\nStep 6: Apply for subsidy on portal after commissioning\nStep 7: Subsidy credited to bank account within 30 days of approval",
            documentsRequired: "• Aadhaar Card\n• Latest Electricity Bill\n• Bank Account Details\n• Passport-size Photo\n• Property ownership proof or NOC from owner\n• Roof area details / photos\n• Mobile Number for registration",
            websiteUrl: "https://pmsuryaghar.gov.in",
            lastDate: "March 31, 2027",
            isNew: true,
            active: true,
          },
          {
            name: "Chhattisgarh Mahtari Vandana Yojana",
            ministry: "Government of Chhattisgarh",
            category: "women",
            summary: "State scheme providing ₹1,000 per month financial assistance to married women of Chhattisgarh for their empowerment and economic independence.",
            eligibility: "• Married women of Chhattisgarh\n• Age: 21 years and above\n• Must be resident of Chhattisgarh\n• Annual family income should not exceed ₹2.5 lakh\n• Must have bank account linked with Aadhaar\n• Widows, divorced, and deserted women also eligible",
            benefits: "• ₹1,000 per month (₹12,000 per year)\n• Direct bank transfer to woman's own account\n• No middlemen involvement\n• Helps in economic empowerment\n• Can be used for any personal or family need",
            howToApply: "Step 1: Visit Suvidha Kiosk, Anganwadi Centre, or CSC\nStep 2: Fill the Mahtari Vandana application form\nStep 3: Submit Aadhaar, marriage certificate, and bank details\nStep 4: Biometric verification (fingerprint) at kiosk\nStep 5: Application verified by local administration\nStep 6: After approval, ₹1,000 credited monthly to bank account",
            documentsRequired: "• Aadhaar Card\n• Marriage Certificate or husband's Aadhaar\n• Bank Passbook (own account in woman's name)\n• Residence Proof (Ration Card / Voter ID)\n• Income Certificate (if applicable)\n• Passport-size Photo\n• Mobile Number",
            websiteUrl: "https://mahtarivandan.cgstate.gov.in",
            isNew: true,
            active: true,
          },
          {
            name: "Stand Up India - SC/ST/Women Entrepreneurs",
            ministry: "Ministry of Finance, Dept. of Financial Services",
            category: "employment",
            summary: "Bank loans between ₹10 lakh and ₹1 crore for SC, ST, and Women entrepreneurs to set up greenfield enterprises in manufacturing, services, or trading sector.",
            eligibility: "• SC/ST borrowers and/or Women entrepreneurs\n• Age 18+ years\n• For non-individual enterprises: 51% stake held by SC/ST/Woman\n• Greenfield enterprise (first-time venture) only\n• Should not be a defaulter to any bank\n• No prior Stand Up India loan availed",
            benefits: "• Composite loan: ₹10 lakh to ₹1 crore\n• Covers 75% of project cost (25% can be own contribution)\n• Repayment period: Up to 7 years\n• 18 months moratorium period available\n• Working capital included in composite loan\n• Margin money through convergence with other schemes",
            howToApply: "Step 1: Visit Stand Up India portal (standupmitra.in) or nearest bank branch\nStep 2: Create profile and submit business plan\nStep 3: Connect with Lead District Manager or branch manager\nStep 4: Bank evaluates project feasibility\nStep 5: Loan sanctioned within 15 working days\nStep 6: Disbursement as per project milestones\nStep 7: Handholding support through SIDBI and DIICs",
            documentsRequired: "• Aadhaar Card & PAN Card\n• Caste Certificate (for SC/ST)\n• Business Plan / Project Report\n• Address Proof\n• Bank Statements (6 months)\n• Passport-size Photos\n• Quotations for machinery/equipment\n• Experience Certificate (if any)",
            websiteUrl: "https://www.standupmitra.in",
            isNew: false,
            active: true,
          },
        ]);
        console.log("[Seed] Government schemes seeded successfully.");
      }
    } catch (e: any) {
      console.error("[Seed] Error:", e.message);
    }
  })();

  return server;
}
