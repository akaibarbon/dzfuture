import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SendHorizontal, Bot, User, Plus, Paperclip, Loader2, Trash2, MessageSquare, X, FileText, Image as ImageIcon } from "lucide-react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type Msg = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  file_url?: string | null;
  file_type?: string | null;
};

type Conv = { id: string; title: string; updated_at: string };

const ACCEPTED = "image/*,application/pdf,text/plain,.txt,.md,.docx";

export default function AiChatPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ url: string; type: string; name: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  useEffect(() => {
    if (user?.id) loadConversations();
  }, [user?.id]);

  useEffect(() => {
    if (activeConv) loadMessages(activeConv);
    else setMessages([]);
  }, [activeConv]);

  const loadConversations = async () => {
    if (!user?.id) return;
    const { data } = await supabase.from("ai_conversations").select("id,title,updated_at").eq("user_id", user.id).order("updated_at", { ascending: false });
    setConversations(data || []);
  };

  const loadMessages = async (convId: string) => {
    const { data } = await supabase.from("ai_messages").select("*").eq("conversation_id", convId).order("created_at");
    setMessages((data || []).map((m: any) => ({ id: m.id, role: m.role as any, content: m.content, file_url: m.file_url, file_type: m.file_type })));
  };

  const handleNewSession = () => {
    setActiveConv(null);
    setMessages([]);
    setPendingFile(null);
    setSidebarOpen(false);
    toast({ title: t("ai.newSession"), description: t("ai.newSessionDesc") });
  };

  const handleDeleteConv = async (id: string) => {
    if (!confirm("حذف هذه المحادثة؟")) return;
    await supabase.from("ai_conversations").delete().eq("id", id);
    if (activeConv === id) handleNewSession();
    loadConversations();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "الملف كبير جداً (الحد 20MB)", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("ai-files").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("ai-files").getPublicUrl(path);
      setPendingFile({ url: data.publicUrl, type: file.type, name: file.name });
    } catch (err: any) {
      toast({ title: "فشل رفع الملف", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const ensureConversation = async (firstUserContent: string): Promise<string | null> => {
    if (activeConv) return activeConv;
    if (!user?.id) return null;
    const title = firstUserContent.slice(0, 50) || "محادثة جديدة";
    const { data, error } = await supabase.from("ai_conversations").insert({ user_id: user.id, title }).select("id").single();
    if (error || !data) {
      toast({ title: "فشل إنشاء المحادثة", variant: "destructive" });
      return null;
    }
    setActiveConv(data.id);
    loadConversations();
    return data.id;
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !pendingFile) || isLoading || !user?.id) return;

    const userMsg: Msg = {
      role: "user",
      content: input || (pendingFile ? "حلّل هذا الملف من فضلك." : ""),
      file_url: pendingFile?.url || null,
      file_type: pendingFile?.type || null,
    };

    const convId = await ensureConversation(userMsg.content);
    if (!convId) return;

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setPendingFile(null);
    setIsLoading(true);

    // Persist user msg
    await supabase.from("ai_messages").insert({
      conversation_id: convId,
      user_id: user.id,
      role: "user",
      content: userMsg.content,
      file_url: userMsg.file_url,
      file_type: userMsg.file_type,
    });

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { messages: newMessages },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      const reply = data?.content || "";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      await supabase.from("ai_messages").insert({
        conversation_id: convId,
        user_id: user.id,
        role: "assistant",
        content: reply,
      });
    } catch (e: any) {
      toast({ title: t("ai.error"), description: e?.message || "Error", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4 max-w-6xl mx-auto">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "fixed inset-0 z-50 bg-background/95 p-4" : "hidden"} lg:relative lg:block lg:w-64 lg:bg-transparent lg:p-0`}>
        <div className="glass-panel rounded-2xl p-3 h-full flex flex-col">
          <div className="flex items-center justify-between mb-3 lg:hidden">
            <h2 className="font-display font-bold">المحادثات</h2>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}><X className="w-5 h-5" /></Button>
          </div>
          <Button onClick={handleNewSession} className="w-full mb-3 gap-2 bg-primary text-primary-foreground"><Plus className="w-4 h-4" /> محادثة جديدة</Button>
          <ScrollArea className="flex-1">
            <div className="space-y-1">
              {conversations.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">لا توجد محادثات بعد</p>}
              {conversations.map((c) => (
                <div key={c.id} className={`group flex items-center gap-2 rounded-lg p-2 cursor-pointer hover:bg-secondary/50 ${activeConv === c.id ? "bg-secondary border border-primary/30" : ""}`}
                  onClick={() => { setActiveConv(c.id); setSidebarOpen(false); }}>
                  <MessageSquare className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="flex-1 text-sm truncate">{c.title}</span>
                  <Button variant="ghost" size="icon" className="w-6 h-6 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleDeleteConv(c.id); }}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}><MessageSquare className="w-4 h-4 ml-1" /> المحادثات</Button>
          <div className="text-center flex-1">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-glow text-primary">{t("ai.title")}</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleNewSession} className="gap-1 hidden lg:flex"><Plus className="w-4 h-4" /> جديد</Button>
        </div>

        <div className="flex-1 glass-panel rounded-3xl flex flex-col overflow-hidden shadow-[0_0_50px_hsl(var(--primary)/0.1)]">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-muted-foreground text-center">
                <div>
                  <Bot className="w-16 h-16 mx-auto mb-4 text-primary opacity-50" />
                  <p className="text-lg font-display">{t("ai.emptyTitle")}</p>
                  <p className="text-sm mt-1">{t("ai.emptyDesc")}</p>
                  <p className="text-xs mt-3 text-primary/70">📎 يمكنك إرفاق صور و PDF و TXT للتحليل</p>
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={i} className={`flex gap-3 max-w-[90%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}>
                <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg ${msg.role === "assistant" ? "bg-primary/20 text-primary border border-primary/30" : "bg-secondary text-foreground border border-border"}`}>
                  {msg.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
                <div className={`p-4 rounded-2xl text-[14px] leading-relaxed ${msg.role === "assistant" ? "bg-secondary/50 border border-border rounded-tl-sm" : "bg-primary/10 border border-primary/20 rounded-tr-sm"}`}>
                  {msg.file_url && (
                    msg.file_type?.startsWith("image") ? (
                      <img src={msg.file_url} alt="" className="max-w-[260px] rounded-lg mb-2 cursor-pointer" onClick={() => window.open(msg.file_url!, "_blank")} />
                    ) : (
                      <a href={msg.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 mb-2 p-2 bg-background/40 rounded-lg text-xs hover:bg-background/60">
                        <FileText className="w-4 h-4 text-primary" /> عرض الملف المرفق
                      </a>
                    )
                  )}
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm prose-invert max-w-none"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                  ) : msg.content}
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 max-w-[85%]">
                <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary border border-primary/30 flex items-center justify-center"><Bot className="w-4 h-4 animate-pulse" /></div>
                <div className="p-4 rounded-2xl bg-secondary/50 border border-border rounded-tl-sm flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </motion.div>
            )}
          </div>

          <div className="p-3 md:p-4 bg-background/40 border-t border-border space-y-2">
            {pendingFile && (
              <div className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/30 rounded-lg text-sm">
                {pendingFile.type.startsWith("image") ? <ImageIcon className="w-4 h-4 text-primary" /> : <FileText className="w-4 h-4 text-primary" />}
                <span className="flex-1 truncate text-xs">{pendingFile.name}</span>
                <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => setPendingFile(null)}><X className="w-3 h-3" /></Button>
              </div>
            )}
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept={ACCEPTED} className="hidden" onChange={handleFileSelect} />
              <Button type="button" variant="ghost" size="icon" disabled={uploading || isLoading} onClick={() => fileInputRef.current?.click()} className="h-12 w-12 rounded-xl flex-shrink-0 text-muted-foreground hover:text-primary">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
              </Button>
              <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("ai.placeholder")} className="flex-1 bg-background/40 border-border h-12 rounded-2xl text-sm px-4 focus-visible:ring-primary/50" />
              <Button type="submit" disabled={(!input.trim() && !pendingFile) || isLoading} className="h-12 w-12 rounded-2xl bg-primary hover:bg-primary/80 text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.4)]">
                <SendHorizontal className="w-5 h-5" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
