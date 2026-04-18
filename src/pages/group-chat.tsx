import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAITools } from "@/hooks/use-ai-tools";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SendHorizontal, ArrowLeft, Clock, ShieldCheck, Bot, Loader2, AlertTriangle } from "lucide-react";
import { ChatMediaInput, ChatMediaMessage } from "@/components/chat-media-input";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  group_id: string;
  sender_id: string | null;
  sender_name: string;
  content: string;
  file_url?: string;
  created_at: string;
}

interface Group {
  id: string;
  name: string;
  is_verified: boolean;
}

interface JoinRequest {
  id: string;
  status: string;
}

export default function GroupChatPage() {
  const { id: groupId } = useParams();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { callAI, loading: aiLoading } = useAITools();
  const [messages, setMessages] = useState<Message[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [content, setContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Join request state
  const [joinStatus, setJoinStatus] = useState<"loading" | "none" | "pending" | "approved" | "rejected">("loading");
  const [joinForm, setJoinForm] = useState({ fullName: "", surname: "", dob: "", class: "" });

  // Check if this is a verified group and user's membership status
  useEffect(() => {
    if (!groupId) return;
    const check = async () => {
      const { data: grp } = await supabase.from("groups").select("id, name, is_verified").eq("id", groupId).maybeSingle();
      if (grp) setGroup(grp as Group);

      if (!grp?.is_verified) {
        setJoinStatus("approved");
        return;
      }

      if (!user?.id) {
        setJoinStatus("none");
        return;
      }

      const { data: req } = await supabase.from("group_join_requests").select("id, status").eq("group_id", groupId).eq("user_id", user.id).maybeSingle();
      if (req) {
        setJoinStatus((req as JoinRequest).status as any);
      } else {
        setJoinStatus("none");
      }
    };
    check();
  }, [groupId, user?.id]);

  // Messages - only load if approved
  useEffect(() => {
    if (!groupId || joinStatus !== "approved") return;
    let pollInterval = 2000;
    let lastSync: string | null = null;
    let isActive = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const fetchInitial = async () => {
      const { data } = await supabase.from("messages").select("*").eq("group_id", groupId).order("created_at", { ascending: true });
      if (data && data.length > 0) {
        setMessages(data as Message[]);
        lastSync = data[data.length - 1].created_at;
      }
    };
    fetchInitial();

    const channel = supabase
      .channel(`group-messages:${groupId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `group_id=eq.${groupId}` }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        lastSync = newMsg.created_at;
        pollInterval = 2000;
      })
      .subscribe();

    const poll = async () => {
      if (!isActive) return;
      const { data } = await supabase.from("messages").select("*").eq("group_id", groupId).gt("created_at", lastSync || "1970-01-01").order("created_at", { ascending: true });
      if (data && data.length > 0) {
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          const newMsgs = data.filter((m: any) => !ids.has(m.id));
          return newMsgs.length > 0 ? [...prev, ...(newMsgs as Message[])] : prev;
        });
        lastSync = data[data.length - 1].created_at;
        pollInterval = 2000;
      } else {
        pollInterval = Math.min(pollInterval * 1.5, 15000);
      }
      if (isActive) timeoutId = setTimeout(poll, pollInterval);
    };
    timeoutId = setTimeout(poll, pollInterval);

    return () => { isActive = false; clearTimeout(timeoutId); supabase.removeChannel(channel); };
  }, [groupId, joinStatus]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  const handleMediaUploaded = async (url: string, type: "voice" | "image") => {
    if (!groupId) return;
    await supabase.from("messages").insert({
      group_id: groupId,
      sender_id: user?.id || null,
      sender_name: user?.fullName || "Anonymous",
      content: type === "voice" ? "🎤 Voice message" : "📷 Image",
      file_url: url,
    });
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() || !groupId) return;
    const msg = content.trim();
    setContent("");

    // Check if it's a bot command
    if (msg.startsWith("/ask ")) {
      const question = msg.slice(5).trim();
      if (!question) return;

      await supabase.from("messages").insert({
        group_id: groupId,
        sender_id: user?.id || null,
        sender_name: user?.fullName || "Anonymous",
        content: msg,
      });

      const result = await callAI("group-bot", { question, groupName: group?.name || "Study Group" });
      if (result) {
        await supabase.from("messages").insert({
          group_id: groupId,
          sender_id: null,
          sender_name: "🤖 Future Bot",
          content: result,
        });
      }
      return;
    }

    // Content moderation
    const moderationResult = await callAI("moderate", { message: msg });
    if (moderationResult) {
      try {
        const jsonMatch = moderationResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (!parsed.safe) {
            toast({
              title: t("chat.blocked"),
              description: parsed.reason || t("chat.blockedDesc"),
              variant: "destructive",
            });
            return;
          }
        }
      } catch {}
    }

    await supabase.from("messages").insert({
      group_id: groupId,
      sender_id: user?.id || null,
      sender_name: user?.fullName || "Anonymous",
      content: msg,
    });
  };

  const handleJoinRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !user?.id) return;
    const { error } = await supabase.from("group_join_requests").insert({
      group_id: groupId,
      user_id: user.id,
      full_name: joinForm.fullName,
      surname: joinForm.surname,
      date_of_birth: joinForm.dob,
      class: joinForm.class,
    });
    if (!error) setJoinStatus("pending");
  };

  // Show join request form for verified groups
  if (group?.is_verified && joinStatus !== "approved") {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col bg-card/40 rounded-2xl border border-border backdrop-blur-md overflow-hidden">
        <div className="h-16 border-b border-border flex items-center px-4 md:px-6 bg-background/20">
          <Link to="/groups" className="mr-4 text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="font-display font-bold text-lg text-primary text-glow">{group?.name || t("chat.loading")}</h2>
            <p className="text-xs text-muted-foreground">{t("chat.verified")}</p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          {joinStatus === "loading" && (
            <div className="text-muted-foreground">{t("chat.loading")}</div>
          )}

          {joinStatus === "pending" && (
            <div className="text-center space-y-4 max-w-sm">
              <div className="w-16 h-16 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center border border-amber-500/50">
                <Clock className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-xl font-display font-bold text-amber-400">{t("chat.pendingTitle")}</h3>
              <p className="text-muted-foreground text-sm">{t("chat.pendingDesc")}</p>
            </div>
          )}

          {joinStatus === "rejected" && (
            <div className="text-center space-y-4 max-w-sm">
              <h3 className="text-xl font-display font-bold text-destructive">{t("chat.rejectedTitle")}</h3>
              <p className="text-muted-foreground text-sm">{t("chat.rejectedDesc")}</p>
            </div>
          )}

          {joinStatus === "none" && (
            <div className="w-full max-w-md space-y-6">
              <div className="text-center space-y-2">
                <ShieldCheck className="w-12 h-12 mx-auto text-primary" />
                <h3 className="text-xl font-display font-bold text-primary">{t("chat.joinTitle")}</h3>
                <p className="text-muted-foreground text-sm">{t("chat.joinDesc")}</p>
              </div>
              <form onSubmit={handleJoinRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("chat.firstName")}</Label>
                  <Input required value={joinForm.fullName} onChange={(e) => setJoinForm({ ...joinForm, fullName: e.target.value })} className="bg-background/40" />
                </div>
                <div className="space-y-2">
                  <Label>{t("chat.surname")}</Label>
                  <Input required value={joinForm.surname} onChange={(e) => setJoinForm({ ...joinForm, surname: e.target.value })} className="bg-background/40" />
                </div>
                <div className="space-y-2">
                  <Label>{t("chat.dob")}</Label>
                  <Input required type="date" value={joinForm.dob} onChange={(e) => setJoinForm({ ...joinForm, dob: e.target.value })} className="bg-background/40" />
                </div>
                <div className="space-y-2">
                  <Label>{t("chat.class")}</Label>
                  <Input required value={joinForm.class} onChange={(e) => setJoinForm({ ...joinForm, class: e.target.value })} placeholder={t("chat.classPlaceholder")} className="bg-background/40" />
                </div>
                <Button type="submit" className="w-full bg-primary font-bold">{t("chat.submitRequest")}</Button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-card/40 rounded-2xl border border-border backdrop-blur-md overflow-hidden">
      <div className="h-16 border-b border-border flex items-center px-4 md:px-6 bg-background/20">
        <Link to="/groups" className="mr-4 text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h2 className="font-display font-bold text-lg text-primary text-glow">{group?.name || t("chat.loading")}</h2>
          <p className="text-xs text-muted-foreground">{t("chat.secure")}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-lg">
          <Bot className="w-3 h-3" />
          <span>/ask</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
            <p>{t("chat.empty")}</p>
            <p className="text-xs">{t("chat.botHint")}</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            const isBot = msg.sender_name === "🤖 Future Bot" || msg.sender_name === "🤖 UNO Bot";
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-end gap-2 max-w-[80%]">
                  {!isMe && (
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border ${isBot ? 'bg-primary/20 text-primary border-primary/30' : 'bg-secondary text-foreground border-border'}`}>
                      {isBot ? <Bot className="w-4 h-4" /> : msg.sender_name.charAt(0)}
                    </div>
                  )}
                  <div className={`p-4 rounded-2xl ${isBot ? 'bg-primary/5 border border-primary/20 rounded-bl-sm' : isMe ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-secondary text-foreground rounded-bl-sm border border-border'}`}>
                    {!isMe && <p className={`text-xs font-bold mb-1 ${isBot ? 'text-primary' : 'opacity-70'}`}>{msg.sender_name}</p>}
                    {msg.file_url ? <ChatMediaMessage fileUrl={msg.file_url} /> : null}
                    {(!msg.file_url || !msg.content.startsWith("🎤") && !msg.content.startsWith("📷")) && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 mx-10">
                  {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            );
          })
        )}
        {aiLoading && (
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 rounded-bl-sm flex items-center gap-1">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">{t("chat.botThinking")}</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-background/40 border-t border-border">
        <form onSubmit={handleSend} className="flex items-center gap-1 sm:gap-2">
          <ChatMediaInput userId={user?.id || "anon"} onMediaUploaded={handleMediaUploaded} disabled={aiLoading} />
          <Input value={content} onChange={(e) => setContent(e.target.value)} placeholder={t("chat.placeholder")} className="flex-1 bg-secondary/50 border-border h-12 rounded-xl focus-visible:ring-primary/50" disabled={aiLoading} />
          <Button type="submit" disabled={!content.trim() || aiLoading} className="h-12 w-12 rounded-xl bg-primary hover:bg-primary/80 flex-shrink-0">
            <SendHorizontal className="w-5 h-5 text-primary-foreground" />
          </Button>
        </form>
      </div>
    </div>
  );
}
