import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, Bot, Send, Volume2, Loader2 } from "lucide-react";
import { t, type TranslationKey } from "@/lib/translations";

type AgentState = "idle" | "listening" | "processing" | "speaking";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function decodePCM16ToFloat32(base64Audio: string): Float32Array {
  const raw = atob(base64Audio);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  const pcm16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i] / 32768;
  }
  return float32;
}

export default function VoiceAgent({ language }: { language: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = useState("");
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const ensureConversation = useCallback(async (): Promise<number> => {
    if (conversationId) return conversationId;
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Kiosk Voice Chat" }),
    });
    const conv = await res.json();
    setConversationId(conv.id);
    return conv.id;
  }, [conversationId]);

  const initAudioPlayback = useCallback(async () => {
    if (audioCtxRef.current) return;
    const ctx = new AudioContext({ sampleRate: 24000 });
    await ctx.audioWorklet.addModule("/audio-playback-worklet.js");
    const worklet = new AudioWorkletNode(ctx, "audio-playback-processor");
    worklet.connect(ctx.destination);
    worklet.port.onmessage = (e) => {
      if (e.data.type === "ended") {
        setAgentState("idle");
      }
    };
    audioCtxRef.current = ctx;
    workletRef.current = worklet;
  }, []);

  const handleVoiceRecord = useCallback(async () => {
    if (agentState === "listening") {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state !== "recording") return;

      setAgentState("processing");

      const blob = await new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          const b = new Blob(chunksRef.current, { type: "audio/webm" });
          recorder.stream.getTracks().forEach((t) => t.stop());
          resolve(b);
        };
        recorder.stop();
      });

      try {
        await initAudioPlayback();
        const convId = await ensureConversation();

        const base64Audio = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.readAsDataURL(blob);
        });

        const response = await fetch(`/api/conversations/${convId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audio: base64Audio }),
        });

        if (!response.ok) throw new Error("Voice request failed");

        const streamReader = response.body?.getReader();
        if (!streamReader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";
        let fullTranscript = "";

        while (true) {
          const { done, value } = await streamReader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));

              switch (event.type) {
                case "user_transcript":
                  setMessages((prev) => [...prev, { role: "user", content: event.data }]);
                  break;
                case "transcript":
                  fullTranscript += event.data;
                  setAgentState("speaking");
                  break;
                case "audio":
                  if (workletRef.current) {
                    const samples = decodePCM16ToFloat32(event.data);
                    workletRef.current.port.postMessage({ type: "audio", samples });
                    setAgentState("speaking");
                  }
                  break;
                case "done":
                  if (fullTranscript) {
                    setMessages((prev) => [...prev, { role: "assistant", content: fullTranscript }]);
                  }
                  workletRef.current?.port.postMessage({ type: "streamComplete" });
                  break;
                case "error":
                  setErrorMsg(event.error);
                  setAgentState("idle");
                  break;
              }
            } catch {
            }
          }
        }
      } catch (err) {
        console.error("Voice error:", err);
        setErrorMsg("Could not process voice. Please try again.");
        setAgentState("idle");
      }
    } else {
      setErrorMsg(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
        mediaRecorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.start(100);
        setAgentState("listening");
      } catch {
        setErrorMsg("Microphone access denied. Please allow microphone access.");
        setAgentState("idle");
      }
    }
  }, [agentState, ensureConversation, initAudioPlayback]);

  const handleTextSend = useCallback(async () => {
    if (!textInput.trim() || agentState === "processing") return;

    const msg = textInput.trim();
    setTextInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setAgentState("processing");
    setErrorMsg(null);

    try {
      const convId = conversationId || undefined;
      const response = await fetch("/api/text-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, conversationId: convId }),
      });

      if (!response.ok) throw new Error("Chat request failed");

      const streamReader = response.body?.getReader();
      if (!streamReader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullResponse = "";

      while (true) {
        const { done, value } = await streamReader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "text") {
              fullResponse += event.data;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last && last.role === "assistant") {
                  return [...prev.slice(0, -1), { role: "assistant", content: last.content + event.data }];
                }
                return [...prev, { role: "assistant", content: event.data }];
              });
            } else if (event.type === "done") {
              if (!conversationId && event.conversationId) {
                setConversationId(event.conversationId);
              }
            } else if (event.type === "error") {
              setErrorMsg(event.error);
            }
          } catch {
          }
        }
      }
      setAgentState("idle");
    } catch (err) {
      console.error("Text chat error:", err);
      setErrorMsg("Could not send message. Please try again.");
      setAgentState("idle");
    }
  }, [textInput, agentState, conversationId]);

  const stateColors: Record<AgentState, string> = {
    idle: "from-blue-600 to-purple-600",
    listening: "from-red-500 to-red-600",
    processing: "from-amber-500 to-orange-500",
    speaking: "from-green-500 to-emerald-600",
  };

  const stateLabels: Record<AgentState, string> = {
    idle: t("voice_tap_to_speak" as TranslationKey, language) || "Tap to speak",
    listening: t("voice_listening" as TranslationKey, language) || "Listening...",
    processing: t("voice_processing" as TranslationKey, language) || "Processing...",
    speaking: t("voice_speaking" as TranslationKey, language) || "Speaking...",
  };

  return (
    <>
      <motion.button
        className={`fixed bottom-28 right-8 w-16 h-16 bg-gradient-to-br ${stateColors[agentState]} text-white rounded-full shadow-2xl flex items-center justify-center z-50`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t("ai_assistant" as TranslationKey, language)}
      >
        {agentState === "listening" ? (
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
            <Mic className="w-8 h-8" />
          </motion.div>
        ) : agentState === "speaking" ? (
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 0.5 }}>
            <Volume2 className="w-8 h-8" />
          </motion.div>
        ) : agentState === "processing" ? (
          <Loader2 className="w-8 h-8 animate-spin" />
        ) : (
          <Bot className="w-8 h-8" />
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-48 right-8 w-[420px] bg-white rounded-3xl shadow-2xl border border-border z-50 overflow-hidden flex flex-col"
            style={{ maxHeight: "70vh" }}
          >
            <div className={`bg-gradient-to-r ${stateColors[agentState]} text-white p-4 flex items-center gap-3 transition-colors duration-300`}>
              <Bot className="w-6 h-6 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-lg">{t("ai_assistant" as TranslationKey, language)}</h4>
                <p className="text-sm text-white/80 truncate">{stateLabels[agentState]}</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[350px] bg-secondary/30">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Bot className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">{t("ai_help_text" as TranslationKey, language)}</p>
                  <p className="text-xs mt-2 opacity-60">
                    {t("voice_tap_to_speak" as TranslationKey, language) || "Tap the microphone to speak or type below"}
                  </p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`rounded-2xl px-4 py-2.5 max-w-[85%] text-sm shadow-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-white border border-border"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {agentState === "processing" && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl px-4 py-2.5 border border-border shadow-sm">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              {errorMsg && (
                <div className="bg-destructive/10 text-destructive text-sm px-3 py-2 rounded-xl">
                  {errorMsg}
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 border-t border-border bg-white">
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleVoiceRecord}
                  disabled={agentState === "processing" || agentState === "speaking"}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                    agentState === "listening"
                      ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {agentState === "listening" ? (
                    <MicOff className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </motion.button>

                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTextSend()}
                  placeholder={t("ask_anything" as TranslationKey, language) || "Type your question..."}
                  className="flex-1 px-4 py-2.5 rounded-full border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={agentState === "processing" || agentState === "speaking"}
                />

                <button
                  onClick={handleTextSend}
                  disabled={!textInput.trim() || agentState === "processing" || agentState === "speaking"}
                  className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
