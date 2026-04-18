import { useState, useRef, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAITools } from "@/hooks/use-ai-tools";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  SendHorizontal, ArrowLeft, Clock, ShieldCheck, Bot, Loader2,
  Settings, Images, Pencil, Trash2, X, Check, Megaphone, MoreVertical,
} from "lucide-react";
import { ChatMediaInput, ChatMediaMessage } from "@/components/chat-media-input";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Message {
  id: string;
  group_id: string;
  sender_id: string | null;
  sender_name: string;
  content: string;
  file_url?: string;
  created_at: string;
  edited_at?: string | null;
  deleted?: boolean;
}

interface Group {
  id: string;
  name: string;
  is_verified: boolean;
  is_private: boolean;
  background_url?: string | null;
  created_by?: string | null;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  created_at: string;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isOwner = group?.created_by === user?.id;

  // Join request state
  const [joinStatus, setJoinStatus] = useState<"loading" | "none" | "pending" | "approved" | "rejected">("loading");
  const [joinForm, setJoinForm] = useState({ fullName: "", surname: "", dob: "", class: "" });

  // Check group + membership
  useEffect(() => {
    if (!groupId) return;
    const check = async () => {
      const { data: grp } = await supabase.from("groups").select("id, name, is_verified, is_private, background_url, created_by").eq("id", groupId).maybeSingle();
      if (grp) setGroup(grp as Group);

      if (!grp?.is_verified) { setJoinStatus("approved"); return; }
      if (!user?.id) { setJoinStatus("none"); return; }
      if (grp.created_by === user.id) { setJoinStatus("approved"); return; }

      const { data: req } = await supabase.from("group_join_requests").select("id, status").eq("group_id", groupId).eq("user_id", user.id).maybeSingle();
      if (req) setJoinStatus((req as JoinRequest).status as any);
      else setJoinStatus("none");
    };
    check();
  }, [groupId, user?.id]);

  // Load announcements
  useEffect(() => {
    if (!groupId || joinStatus !== "approved") return;
    const load = async () => {
      const { data } = await supabase.from("group_announcements").select("*").eq("group_id", groupId).order("created_at", { ascending: false }).limit(20);
      setAnnouncements((data || []) as Announcement[]);
    };
    load();
    const ch = supabase
      .channel(`group-ann:${groupId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_announcements", filter: `group_id=eq.${groupId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [groupId, joinStatus]);

  // Messages
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
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `group_id=eq.${groupId}` }, (payload) => {
        if (payload.eventType === "INSERT") {
          const newMsg = payload.new as Message;
          setMessages((prev) => prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]);
          lastSync = newMsg.created_at;
        } else if (payload.eventType === "UPDATE") {
          const upd = payload.new as Message;
          setMessages((prev) => prev.map((m) => m.id === upd.id ? upd : m));
        } else if (payload.eventType === "DELETE") {
          const del = payload.old as Message;
          setMessages((prev) => prev.filter((m) => m.id !== del.id));
        }
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

  const mediaMessages = useMemo(() => messages.filter((m) => m.file_url && !m.deleted), [messages]);

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

    if (msg.startsWith("/ask ")) {
      const question = msg.slice(5).trim();
      if (!question) return;
      await supabase.from("messages").insert({
        group_id: groupId, sender_id: user?.id || null,
        sender_name: user?.fullName || "Anonymous", content: msg,
      });
      const result = await callAI("group-bot", { question, groupName: group?.name || "Study Group" });
      if (result) {
        await supabase.from("messages").insert({
          group_id: groupId, sender_id: null, sender_name: "🤖 Future Bot", content: result,
        });
      }
      return;
    }

    const moderationResult = await callAI("moderate", { message: msg });
    if (moderationResult) {
      try {
        const jsonMatch = moderationResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (!parsed.safe) {
            toast({ title: t("chat.blocked"), description: parsed.reason || t("chat.blockedDesc"), variant: "destructive" });
            return;
          }
        }
      } catch {}
    }

    await supabase.from("messages").insert({
      group_id: groupId, sender_id: user?.id || null,
      sender_name: user?.fullName || "Anonymous", content: msg,
    });
  };

  const handleEditMessage = async (id: string) => {
    if (!editText.trim()) return;
    const { error } = await supabase.from("messages").update({
      content: editText.trim(),
      edited_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) toast({ title: t("chat.editFailed") || "فشل التعديل", description: error.message, variant: "destructive" });
    setEditingId(null);
    setEditText("");
  };

  const handleDeleteMessage = async (id: string) => {
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) toast({ title: t("chat.deleteFailed") || "فشل الحذف", description: error.message, variant: "destructive" });
  };

  const handleJoinRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !user?.id) return;
    const { error } = await supabase.from("group_join_requests").insert({
      group_id: groupId, user_id: user.id,
      full_name: joinForm.fullName, surname: joinForm.surname,
      date_of_birth: joinForm.dob, class: joinForm.class,
    });
    if (!error) setJoinStatus("pending");
  };

  // Verified group + not approved → show join form
  if (group?.is_verified && joinStatus !== "approved") {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col bg-card/40 rounded-2xl border border-border backdrop-blur-md overflow-hidden">
        <div className="h-16 border-b border-border flex items-center px-4 md:px-6 bg-background/20">
          <Link to="/groups" className="mr-4 text-muted-foreground hover:text-primary transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h2 className="font-display font-bold text-lg text-primary text-glow">{group?.name || t("chat.loading")}</h2>
            <p className="text-xs text-muted-foreground">{t("chat.verified")}</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          {joinStatus === "loading" && <div className="text-muted-foreground">{t("chat.loading")}</div>}
          {joinStatus === "pending" && (
            <div className="text-center space-y-4 max-w-sm">
              <div className="w-16 h-16 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center border border-amber-500/50"><Clock className="w-8 h-8 text-amber-400" /></div>
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
                <div className="space-y-2"><Label>{t("chat.firstName")}</Label><Input required value={joinForm.fullName} onChange={(e) => setJoinForm({ ...joinForm, fullName: e.target.value })} className="bg-background/40" /></div>
                <div className="space-y-2"><Label>{t("chat.surname")}</Label><Input required value={joinForm.surname} onChange={(e) => setJoinForm({ ...joinForm, surname: e.target.value })} className="bg-background/40" /></div>
                <div className="space-y-2"><Label>{t("chat.dob")}</Label><Input required type="date" value={joinForm.dob} onChange={(e) => setJoinForm({ ...joinForm, dob: e.target.value })} className="bg-background/40" /></div>
                <div className="space-y-2"><Label>{t("chat.class")}</Label><Input required value={joinForm.class} onChange={(e) => setJoinForm({ ...joinForm, class: e.target.value })} placeholder={t("chat.classPlaceholder")} className="bg-background/40" /></div>
                <Button type="submit" className="w-full bg-primary font-bold">{t("chat.submitRequest")}</Button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  const bgStyle = group?.background_url ? {
    backgroundImage: `linear-gradient(rgba(0,0,0,0.6),rgba(0,0,0,0.7)), url(${group.background_url})`,
    backgroundSize: "cover", backgroundPosition: "center",
  } : {};

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col rounded-2xl border border-border backdrop-blur-md overflow-hidden bg-card/40" style={bgStyle}>
      {/* Header */}
      <div className="h-16 border-b border-border flex items-center px-4 md:px-6 bg-background/40 backdrop-blur-md">
        <Link to="/groups" className="mr-3 text-muted-foreground hover:text-primary transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="flex-1 min-w-0">
          <h2 className="font-display font-bold text-lg text-primary text-glow truncate">{group?.name || t("chat.loading")}</h2>
          <p className="text-xs text-muted-foreground">{t("chat.secure")}</p>
        </div>
        <div className="flex items-center gap-1">
          {announcements.length > 0 && (
            <Button variant="ghost" size="icon" onClick={() => setShowAnnouncements(true)} className="relative h-10 w-10">
              <Megaphone className="w-5 h-5 text-primary" />
              <span className="absolute top-1 right-1 bg-primary text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{announcements.length}</span>
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setShowMediaGallery(true)} className="h-10 w-10" title={t("chat.gallery") || "معرض الوسائط"}>
            <Images className="w-5 h-5 text-muted-foreground" />
          </Button>
          {isOwner && (
            <Link to={`/group/${groupId}/control`} title={t("gc.controlPanel") || "لوحة التحكم"}>
              <Button variant="ghost" size="icon" className="h-10 w-10"><Settings className="w-5 h-5 text-primary" /></Button>
            </Link>
          )}
          <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-lg ml-1">
            <Bot className="w-3 h-3" /><span>/ask</span>
          </div>
        </div>
      </div>

      {/* Pinned latest announcement */}
      {announcements[0] && (
        <button onClick={() => setShowAnnouncements(true)} className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center gap-2 text-sm hover:bg-primary/15 transition-colors text-left">
          <Megaphone className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="font-bold text-primary">{announcements[0].title}</span>
          <span className="text-muted-foreground truncate">— {announcements[0].body}</span>
        </button>
      )}

      {/* Messages */}
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
            const canModify = (isMe || isOwner) && !isBot;
            const isEditing = editingId === msg.id;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}>
                <div className="flex items-end gap-2 max-w-[85%]">
                  {!isMe && (
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border ${isBot ? 'bg-primary/20 text-primary border-primary/30' : 'bg-secondary text-foreground border-border'}`}>
                      {isBot ? <Bot className="w-4 h-4" /> : msg.sender_name.charAt(0)}
                    </div>
                  )}
                  <div className={`relative p-3 rounded-2xl ${isBot ? 'bg-primary/5 border border-primary/20 rounded-bl-sm' : isMe ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-secondary text-foreground rounded-bl-sm border border-border'}`}>
                    {!isMe && <p className={`text-xs font-bold mb-1 ${isBot ? 'text-primary' : 'opacity-70'}`}>{msg.sender_name}</p>}
                    {msg.file_url ? <ChatMediaMessage fileUrl={msg.file_url} /> : null}
                    {isEditing ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Input value={editText} onChange={(e) => setEditText(e.target.value)} className="h-8 text-sm bg-background/60 text-foreground" autoFocus
                          onKeyDown={(e) => { if (e.key === "Enter") handleEditMessage(msg.id); if (e.key === "Escape") setEditingId(null); }} />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditMessage(msg.id)}><Check className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="w-4 h-4" /></Button>
                      </div>
                    ) : (
                      (!msg.file_url || (!msg.content.startsWith("🎤") && !msg.content.startsWith("📷"))) && (
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      )
                    )}
                    {msg.edited_at && !isEditing && <span className="text-[9px] opacity-60 italic">({t("chat.edited") || "معدلة"})</span>}

                    {canModify && !isEditing && (
                      <div className={`absolute -top-2 ${isMe ? '-left-2' : '-right-2'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="secondary" className="h-6 w-6 rounded-full"><MoreVertical className="w-3 h-3" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass-panel">
                            {isMe && !msg.file_url && (
                              <DropdownMenuItem onClick={() => { setEditingId(msg.id); setEditText(msg.content); }}>
                                <Pencil className="w-4 h-4 mr-2" />{t("chat.edit") || "تعديل"}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDeleteMessage(msg.id)} className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />{t("chat.delete") || "حذف"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
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
            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center"><Bot className="w-4 h-4 animate-pulse" /></div>
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 rounded-bl-sm flex items-center gap-1">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">{t("chat.botThinking")}</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-background/40 border-t border-border backdrop-blur-md">
        <form onSubmit={handleSend} className="flex items-center gap-1 sm:gap-2">
          <ChatMediaInput userId={user?.id || "anon"} onMediaUploaded={handleMediaUploaded} disabled={aiLoading} />
          <Input value={content} onChange={(e) => setContent(e.target.value)} placeholder={t("chat.placeholder")} className="flex-1 bg-secondary/50 border-border h-12 rounded-xl focus-visible:ring-primary/50" disabled={aiLoading} />
          <Button type="submit" disabled={!content.trim() || aiLoading} className="h-12 w-12 rounded-xl bg-primary hover:bg-primary/80 flex-shrink-0">
            <SendHorizontal className="w-5 h-5 text-primary-foreground" />
          </Button>
        </form>
      </div>

      {/* Media gallery dialog */}
      <Dialog open={showMediaGallery} onOpenChange={setShowMediaGallery}>
        <DialogContent className="glass-panel max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-primary">{t("chat.gallery") || "الوسائط المرسلة"} ({mediaMessages.length})</DialogTitle></DialogHeader>
          {mediaMessages.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{t("chat.noMedia") || "لا توجد وسائط بعد"}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 py-4">
              {mediaMessages.map((m) => (
                <div key={m.id} className="space-y-1">
                  <ChatMediaMessage fileUrl={m.file_url!} />
                  <p className="text-[10px] text-muted-foreground truncate">{m.sender_name}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Announcements dialog */}
      <Dialog open={showAnnouncements} onOpenChange={setShowAnnouncements}>
        <DialogContent className="glass-panel max-w-lg">
          <DialogHeader><DialogTitle className="font-display text-primary flex items-center gap-2"><Megaphone className="w-5 h-5" />{t("gc.announcements") || "الإشعارات"}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {announcements.map((a) => (
              <div key={a.id} className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="font-bold text-primary">{a.title}</p>
                {a.body && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.body}</p>}
                <p className="text-xs text-muted-foreground mt-2">{new Date(a.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
