import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { chatStorage } from "./storage";

const SYSTEM_PROMPT = `You are Suvidha Assistant, a helpful AI agent for the Suvidha Kiosk — a digital citizen services platform in Chhattisgarh, India.

You help citizens with:
- Filing complaints for electricity, gas, water, municipal, and infrastructure issues
- Booking appointments at government offices
- Checking government schemes and eligibility (PM Awas Yojana, Ayushman Bharat, PM Kisan, etc.)
- Applying for certificates (birth, income, caste, domicile, marriage, death, residence, character)
- Filing RTI applications
- Tracking grievances and pension status
- DigiLocker document management
- Water bill queries and payment

When a user wants to file a complaint, extract:
- service: (electricity/gas/water/municipal/infrastructure/other)
- category: brief category
- description: detailed description
- urgency: (high/medium/low)

Then respond with a JSON block like:
\`\`\`json
{"action":"file_complaint","service":"...","category":"...","description":"...","urgency":"medium"}
\`\`\`

Always respond in the same language the user uses (Hindi or English).
Be concise, helpful, and empathetic. Use simple language for rural citizens.`;

export function registerChatRoutes(app: Express) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  app.get("/api/chat/conversations", async (_req: Request, res: Response) => {
    try {
      const conversations = await chatStorage.getAllConversations();
      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/chat/conversations", async (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      const conversation = await chatStorage.createConversation(title || "New Chat");
      res.json(conversation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/chat/conversations/:id", async (req: Request, res: Response) => {
    try {
      await chatStorage.deleteConversation(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/chat/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const messages = await chatStorage.getMessagesByConversation(parseInt(req.params.id));
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/chat/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;

      if (!content) {
        res.status(400).json({ error: "content is required" });
        return;
      }

      await chatStorage.createMessage(conversationId, "user", content);
      const history = await chatStorage.getMessagesByConversation(conversationId);

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        ],
        max_tokens: 500,
      });

      const reply = completion.choices[0]?.message?.content || "Sorry, I could not process your request.";
      const assistantMsg = await chatStorage.createMessage(conversationId, "assistant", reply);
      res.json(assistantMsg);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
