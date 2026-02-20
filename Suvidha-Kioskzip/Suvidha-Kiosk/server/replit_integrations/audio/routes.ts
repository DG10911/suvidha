import express, { type Express, type Request, type Response } from "express";
import { toFile } from "openai";
import { chatStorage } from "../chat/storage.js";
import { openai, ensureCompatibleFormat } from "./client.js";

const audioBodyParser = express.json({ limit: "50mb" });

const SYSTEM_PROMPT = `You are Suvidha, a friendly AI voice assistant for a government civic services kiosk in Raipur, Chhattisgarh, India. You help citizens navigate all kiosk services.

AVAILABLE SERVICES AND FEATURES:

1. ELECTRICITY (via "Electricity" tile on dashboard):
   - Pay electricity bill (lookup by Consumer ID: enter 10-digit ID, view bill, pay via UPI/Cash/Wallet)
   - Apply for new electricity connection
   - Report power outage in your area
   - Report meter fault or billing correction
   - Provider: CSPDCL (Chhattisgarh State Power Distribution Company)

2. GAS SERVICES (via "Gas Services" tile):
   - Book gas cylinder (Domestic 14.2kg, Commercial 19kg, Composite 5kg)
   - Pay gas bill
   - Report gas leakage (EMERGENCY - Call 1906 immediately)
   - Apply for new gas connection
   - Track cylinder delivery status
   - Check LPG subsidy status

3. MUNICIPAL SERVICES (mega-tile with 3 sub-sections):
   a) WATER SERVICES: Pay water bill, apply for new connection, report pipeline leak, report water quality issue
   b) WASTE MANAGEMENT: Schedule waste pickup, request bulk waste collection
   c) INFRASTRUCTURE: Report pothole, report streetlight issue, report drainage problem

4. COMPLAINT CENTER (via "Complaint Center" tile):
   - Register new complaint across 6 categories: Electricity, Gas, Water Supply, Waste Management, Infrastructure, Other/General
   - Check complaint status by entering complaint ID (format: SUV-2026-XXXX)
   - Reopen a resolved/closed ticket if issue persists
   - Each complaint gets a unique ID, visual timeline, assigned department, and SLA tracking

5. MY REQUESTS (via "My Requests" tile):
   - View all service requests and complaints with status (Submitted, In Progress, Resolved, Closed)
   - Filter by status, search by ID/service/category, sort by date/urgency/SLA
   - Live SLA countdown showing remaining time
   - Detailed timeline view for each request
   - Reopen resolved requests with a reason

6. DOCUMENTS & RECEIPTS (via "Documents" tile):
   - View all generated documents: payment receipts, complaint receipts, certificates, applications
   - View document content in detail modal
   - Print documents with formatted layout
   - Download documents as text files
   - Filter by document type (Receipt, Payment, Certificate, Complaint, Application)

7. NOTIFICATIONS (via "Notifications" tile):
   - Payment confirmations, complaint status updates, emergency alerts, general info
   - Mark individual notifications as read
   - Mark all as read at once
   - Delete notifications
   - Filter by type (All, Unread, Payments, Status Updates, Alerts, Info)

8. PROFILE & SETTINGS (via "Profile" tile):
   - View account summary with stats (total requests, active, documents, unread notifications)
   - Link/unlink services (Electricity, Water, Gas, Waste) with Consumer ID
   - View login methods status (Face Login, Mobile OTP, QR Code)
   - View session information
   - Logout

PAYMENT METHODS:
- UPI: Enter UPI ID or scan QR code for instant payment
- Cash: Insert cash at the kiosk machine
- Suvidha Wallet: Use prepaid kiosk wallet balance

ACCESSIBILITY:
- The kiosk supports 6 languages: English, Hindi, Chhattisgarhi, Marathi, Telugu, Tamil
- Screen reader mode with voice announcements
- High contrast mode for low vision
- Adjustable font sizes (Normal, Large, Extra-Large)

LOGIN OPTIONS:
- Sign Up with Aadhaar number (includes face registration)
- Face Login (for returning users)
- Mobile OTP Login
- QR Code Scan Login

EMERGENCY NUMBERS:
- Toll-free helpline: 1800-233-4455
- Gas emergency: 1906
- General emergency: 112

GUIDELINES:
- Keep responses concise (2-3 sentences max) and helpful
- Speak in a warm, clear, patient tone appropriate for all age groups
- If asked in Hindi or another Indian language, respond in that language
- Always guide citizens to the correct service tile or page
- For emergencies (gas leak, fire), immediately provide the emergency number
- For bill payments, guide them to the specific service tile on the dashboard
- For complaints, direct them to the Complaint Center
- Privacy first: Never ask for Aadhaar or personal details in chat`;

const ttsCache = new Map<string, Buffer>();

export function registerAudioRoutes(app: Express): void {
  app.post("/api/tts", express.json(), async (req: Request, res: Response) => {
    try {
      const { text, lang } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "text is required" });
      }

      const cacheKey = `${text}::${lang || "en"}`;
      let audioBuffer = ttsCache.get(cacheKey);

      if (!audioBuffer) {
        const ttsResponse = await openai.audio.speech.create({
          model: "tts-1",
          voice: "alloy",
          input: text,
          response_format: "pcm",
        });

        const arrayBuffer = await ttsResponse.arrayBuffer();
        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
          return res.status(500).json({ error: "No audio generated" });
        }
        audioBuffer = Buffer.from(arrayBuffer);
        ttsCache.set(cacheKey, audioBuffer);
        if (ttsCache.size > 200) {
          const firstKey = ttsCache.keys().next().value;
          if (firstKey) ttsCache.delete(firstKey);
        }
      }

      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(audioBuffer);
    } catch (error) {
      console.error("TTS error:", error);
      res.status(500).json({ error: "TTS failed" });
    }
  });

  app.get("/api/conversations", async (_req: Request, res: Response) => {
    try {
      const conversations = await chatStorage.getAllConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", async (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      const conversation = await chatStorage.createConversation(title || "Voice Chat");
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.delete("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      await chatStorage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  app.post("/api/conversations/:id/messages", audioBodyParser, async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id as string);
      const { audio, voice = "alloy" } = req.body;

      if (!audio) {
        return res.status(400).json({ error: "Audio data (base64) is required" });
      }

      const rawBuffer = Buffer.from(audio, "base64");

      // Transcribe audio using Whisper (supports webm, wav, mp3, mp4, m4a)
      let userTranscript: string;
      try {
        const { buffer: compatBuffer, format: compatFormat } = await ensureCompatibleFormat(rawBuffer).catch(() => ({ buffer: rawBuffer, format: "webm" as const }));
        const audioFile = await toFile(compatBuffer, `audio.${compatFormat}`);
        const transcription = await openai.audio.transcriptions.create({
          file: audioFile,
          model: "whisper-1",
        });
        userTranscript = transcription.text;
      } catch {
        userTranscript = "[Could not transcribe audio]";
      }

      await chatStorage.createMessage(conversationId, "user", userTranscript);

      const existingMessages = await chatStorage.getMessagesByConversation(conversationId);
      const chatHistory: Array<{role: "system" | "user" | "assistant"; content: string}> = [
        { role: "system", content: SYSTEM_PROMPT },
        ...existingMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      res.write(`data: ${JSON.stringify({ type: "user_transcript", data: userTranscript })}\n\n`);

      // Get text response from gpt-4o-mini
      const chatResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: chatHistory,
        max_tokens: 512,
      });

      const assistantTranscript = chatResponse.choices[0]?.message?.content || "";
      res.write(`data: ${JSON.stringify({ type: "transcript", data: assistantTranscript })}\n\n`);

      // Convert response to PCM16 audio via tts-1
      try {
        const ttsResponse = await openai.audio.speech.create({
          model: "tts-1",
          voice: voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
          input: assistantTranscript,
          response_format: "pcm",
        });
        const pcmBuffer = Buffer.from(await ttsResponse.arrayBuffer());
        res.write(`data: ${JSON.stringify({ type: "audio", data: pcmBuffer.toString("base64") })}\n\n`);
      } catch (ttsErr) {
        console.error("TTS error in voice chat:", ttsErr);
      }

      await chatStorage.createMessage(conversationId, "assistant", assistantTranscript);

      res.write(`data: ${JSON.stringify({ type: "done", transcript: assistantTranscript })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error processing voice message:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ type: "error", error: "Failed to process voice message" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to process voice message" });
      }
    }
  });

  app.post("/api/text-chat", async (req: Request, res: Response) => {
    try {
      const { message, conversationId } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      let convId = conversationId;
      if (!convId) {
        const conv = await chatStorage.createConversation("Text Chat");
        convId = conv.id;
      }

      await chatStorage.createMessage(convId, "user", message);

      const existingMessages = await chatStorage.getMessagesByConversation(convId);
      const chatHistory: Array<{role: "system" | "user" | "assistant"; content: string}> = [
        { role: "system", content: SYSTEM_PROMPT },
        ...existingMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: chatHistory,
        stream: true,
        max_tokens: 512,
      });

      let fullResponse = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ type: "text", data: content })}\n\n`);
        }
      }

      await chatStorage.createMessage(convId, "assistant", fullResponse);
      res.write(`data: ${JSON.stringify({ type: "done", conversationId: convId })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error in text chat:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ type: "error", error: "Failed to process message" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to process message" });
      }
    }
  });
}
