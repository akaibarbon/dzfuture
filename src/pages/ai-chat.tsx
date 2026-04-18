import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SendHorizontal, Bot, User, Plus } from "lucide-react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { chatStream } from "@/server/ai.functions";

type Msg = { role: "user" | "assistant"; content: string };

export default function AiChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const handleNewSession = () => {
    setMessages([]);
    toast({ title: t("ai.newSession"), description: t("ai.newSessionDesc") });
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };
    await streamChat({
      messages: [...messages, userMsg],
      onDelta: upsert,
      onDone: () => setIsLoading(false),
      onError: (msg) => { toast({ title: t("ai.error"), description: msg, variant: "destructive" }); setIsLoading(false); },
    });
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="text-center flex-1">
          <h1 className="text-4xl font-display font-bold text-glow text-primary mb-1">{t("ai.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("ai.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleNewSession} className="gap-2 border-border">
          <Plus className="w-4 h-4" /> {t("ai.newSession")}
        </Button>
      </div>

      <div className="flex-1 glass-panel rounded-3xl flex flex-col overflow-hidden shadow-[0_0_50px_hsl(var(--primary)/0.1)]">
        <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full text-muted-foreground text-center">
              <div>
                <Bot className="w-16 h-16 mx-auto mb-4 text-primary opacity-50" />
                <p className="text-lg font-display">{t("ai.emptyTitle")}</p>
                <p className="text-sm mt-1">{t("ai.emptyDesc")}</p>
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={i} className={`flex gap-4 max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}>
              <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg ${msg.role === "assistant" ? "bg-primary/20 text-primary border border-primary/30" : "bg-secondary text-foreground border border-border"}`}>
                {msg.role === "assistant" ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              <div className={`p-5 rounded-2xl text-[15px] leading-relaxed ${msg.role === "assistant" ? "bg-secondary/50 border border-border rounded-tl-sm" : "bg-primary/10 border border-primary/20 rounded-tr-sm"}`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                ) : msg.content}
              </div>
            </motion.div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 max-w-[85%]">
              <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary border border-primary/30 flex items-center justify-center"><Bot className="w-5 h-5 animate-pulse" /></div>
              <div className="p-5 rounded-2xl bg-secondary/50 border border-border rounded-tl-sm flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </motion.div>
          )}
        </div>

        <div className="p-4 bg-background/40 border-t border-border">
          <form onSubmit={handleSend} className="flex items-center gap-3">
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("ai.placeholder")} className="flex-1 bg-background/40 border-border h-14 rounded-2xl text-base px-6 focus-visible:ring-primary/50" />
            <Button type="submit" disabled={!input.trim() || isLoading} className="h-14 w-14 rounded-2xl bg-primary hover:bg-primary/80 text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.4)]">
              <SendHorizontal className="w-6 h-6" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
