import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import KioskLayout from "@/components/layout/KioskLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Bot,
  Send,
  Loader2,
  Mic,
  MicOff,
  Trash2,
  MessageSquare,
  Sparkles,
  User,
} from "lucide-react";
import { useVoiceRecorder } from "../../replit_integrations/audio";
import { useVoiceStream } from "../../replit_integrations/audio";

interface Message {
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
}

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
}

export default function AIAgent() {
  const [, navigate] = useLocation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const recorder = useVoiceRecorder();
  const voiceStream = useVoiceStream({
    onUserTranscript: (text) => {
      setMessages((prev) => [
        ...prev.filter((m) => !m.pending),
        { role: "user", content: text },
        { role: "assistant", content: "", pending: true },
      ]);
      setVoiceTranscript("");
    },
    onTranscript: (_, full) => {
      setMessages((prev) =>
        prev.map((m, i) => (i === prev.length - 1 && m.pending ? { ...m, content: full } : m)),
      );
    },
    onComplete: (text) => {
      setMessages((prev) =>
        prev.map((m, i) => (i === prev.length - 1 && m.pending ? { role: "assistant", content: text } : m)),
      );
      setIsLoading(false);
    },
    onError: (err) => {
      console.error("Voice error:", err);
      setIsLoading(false);
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversations on mount
  useEffect(() => {
    fetch("/api/conversations")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setConversations(data);
      })
      .catch((err) => console.error("Failed to load conversations:", err));
  }, []);

  const startNewConversation = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Suvidha AI Chat" }),
      });
      const conv = await res.json();
      setCurrentConvId(conv.id);
      setMessages([]);
      setConversations((prev) => [conv, ...prev]);
      return conv.id;
    } catch (_e) {
      return null;
    }
  }, []);

  const loadConversation = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      const data = await res.json();
      setCurrentConvId(id);
      setMessages((data.messages || []).map((m: any) => ({ role: m.role, content: m.content })));
    } catch (err) {
      console.error("Failed to load conversation:", err);
    }
  }, []);

  const deleteConversation = useCallback(
    async (id: number, e: React.MouseEvent) => {
      e.stopPropagation();
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConvId === id) {
        setCurrentConvId(null);
        setMessages([]);
      }
    },
    [currentConvId],
  );

  const sendTextMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      let convId = currentConvId;
      if (!convId) {
        convId = await startNewConversation();
        if (!convId) return;
      }

      setInputText("");
      setIsLoading(true);
      setMessages((prev) => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: "", pending: true },
      ]);

      try {
        const res = await fetch(`/api/conversations/${convId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text }),
        });

        if (!res.ok) throw new Error("Request failed");
        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullResponse = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.content) {
                fullResponse += event.content;
                setMessages((prev) =>
                  prev.map((m, i) =>
                    i === prev.length - 1 && m.pending ? { ...m, content: fullResponse } : m,
                  ),
                );
              }
              if (event.done) {
                setMessages((prev) =>
                  prev.map((m, i) =>
                    i === prev.length - 1 && m.pending ? { role: "assistant", content: fullResponse } : m,
                  ),
                );
              }
            } catch (e) {
              if (!(e instanceof SyntaxError)) console.error("SSE parse error:", e);
            }
          }
        }
      } catch (err) {
        setMessages((prev) =>
          prev.map((m, i) =>
            i === prev.length - 1 && m.pending
              ? { role: "assistant", content: "Sorry, I encountered an error. Please try again." }
              : m,
          ),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [currentConvId, isLoading, startNewConversation],
  );

  const handleVoiceClick = useCallback(async () => {
    if (recorder.state === "recording") {
      setIsLoading(true);
      const blob = await recorder.stopRecording();
      if (!blob) {
        setIsLoading(false);
        return;
      }

      let convId = currentConvId;
      if (!convId) {
        convId = await startNewConversation();
        if (!convId) {
          setIsLoading(false);
          return;
        }
      }

      await voiceStream.streamVoiceResponse(`/api/conversations/${convId}/messages`, blob);
    } else {
      setVoiceTranscript("Listening…");
      await recorder.startRecording();
    }
  }, [recorder, currentConvId, startNewConversation, voiceStream]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage(inputText);
    }
  };

  return (
    <KioskLayout>
      <div className="flex h-full gap-4">
        {/* Sidebar: conversation list */}
        <div className="w-64 flex flex-col gap-2 shrink-0">
          <Button
            onClick={async () => {
              await startNewConversation();
            }}
            className="w-full gap-2"
          >
            <Sparkles className="w-4 h-4" />
            New Chat
          </Button>
          <div className="flex-1 overflow-y-auto space-y-1">
            {conversations.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No conversations yet</p>
            )}
            {conversations.map((conv) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`group flex items-center justify-between gap-1 px-3 py-2 rounded-xl cursor-pointer text-sm transition-colors ${
                  currentConvId === conv.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => loadConversation(conv.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{conv.title}</span>
                </div>
                <button
                  onClick={(e) => deleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </motion.div>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 pb-3 border-b mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Suvidha AI Agent</h2>
              <p className="text-xs text-muted-foreground">Your Government Services Assistant</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant={isVoiceMode ? "default" : "outline"}
                size="sm"
                className="gap-1"
                onClick={() => setIsVoiceMode((v) => !v)}
              >
                {isVoiceMode ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                {isVoiceMode ? "Voice On" : "Voice Off"}
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center h-full gap-4 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Hello! I'm Suvidha</h3>
                  <p className="text-muted-foreground mt-1 text-sm max-w-xs">
                    Your AI assistant for government services. Ask me anything about certificates,
                    schemes, complaints, or any civic service.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    "How do I apply for a birth certificate?",
                    "What schemes am I eligible for?",
                    "How to file a grievance?",
                    "Track my complaint status",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => sendTextMessage(suggestion)}
                      className="text-xs bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-full transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted rounded-bl-sm"
                    }`}
                  >
                    {msg.content || (msg.pending && <Loader2 className="w-4 h-4 animate-spin" />)}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="pt-3 border-t mt-3">
            {isVoiceMode ? (
              <div className="flex flex-col items-center gap-2">
                {voiceTranscript && (
                  <p className="text-sm text-muted-foreground italic">{voiceTranscript}</p>
                )}
                <Button
                  size="lg"
                  className={`rounded-full w-16 h-16 ${
                    recorder.state === "recording"
                      ? "bg-red-500 hover:bg-red-600 animate-pulse"
                      : ""
                  }`}
                  onClick={handleVoiceClick}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : recorder.state === "recording" ? (
                    <MicOff className="w-6 h-6" />
                  ) : (
                    <Mic className="w-6 h-6" />
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {recorder.state === "recording" ? "Tap to stop recording" : "Tap to speak"}
                </p>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your question…"
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={() => sendTextMessage(inputText)}
                  disabled={isLoading || !inputText.trim()}
                  size="icon"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </KioskLayout>
  );
}
