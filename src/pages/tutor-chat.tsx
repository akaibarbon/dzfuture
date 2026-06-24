import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SendHorizontal, MessageSquare, Search, ArrowLeft, GraduationCap, User as UserIcon } from "lucide-react";
import { ChatMediaInput } from "@/components/chat-media-input";

interface Profile {
  id: string;
  user_id: string | null;
  full_name: string;
  nickname: string | null;
  photo_url: string | null;
  role: string;
  approved?: boolean;
}

interface DM {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

/**
 * صفحة مخصّصة للمحادثات بين التلاميذ والأساتذة فقط.
 * - التلميذ يرى قائمة الأساتذة المعتمدين فقط
 * - الأستاذ يرى قائمة التلاميذ فقط
 */
export default function TutorChatPage() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<DM[]>([]);
  const [content, setContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const isTutor = user?.role === "tutor";
  const targetRole = isTutor ? "student" : "tutor";
  const pageTitle = isTutor ? "محادثة التلاميذ" : "محادثة الأساتذة";
  const pageSubtitle = isTutor
    ? "تواصل مع تلاميذك مباشرة"
    : "تواصل مع أساتذتك واطرح أسئلتك";

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("public_profiles")
        .select("id,user_id,full_name,nickname,photo_url,role,approved")
        .eq("role", targetRole)
        .order("full_name");
      if (data) {
        const list = (data as Profile[]).filter((p) => p.user_id && p.user_id !== user?.id);
        // Students should only see approved tutors
        setProfiles(isTutor ? list : list.filter((p) => p.approved !== false));
      }
    })();
  }, [user?.id, targetRole, isTutor]);

  useEffect(() => {
    if (!selected?.user_id || !user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${selected.user_id}),and(sender_id.eq.${selected.user_id},receiver_id.eq.${user.id})`,
        )
        .order("created_at", { ascending: true });
      if (data) setMessages(data as DM[]);
    })();

    const channel = supabase
      .channel(`tutor-dm-${selected.user_id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload) => {
          const msg = payload.new as DM;
          if (
            (msg.sender_id === user.id && msg.receiver_id === selected.user_id) ||
            (msg.sender_id === selected.user_id && msg.receiver_id === user.id)
          ) {
            setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selected?.user_id, user?.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !selected?.user_id || !user?.id) return;
    const msg = content.trim();
    setContent("");
    await supabase.from("direct_messages").insert({
      sender_id: user.id,
      receiver_id: selected.user_id,
      content: msg,
    });
    await supabase.rpc("send_notification", {
      p_user_id: selected.user_id,
      p_type: "tutor_chat",
      p_title: isTutor ? "رسالة من الأستاذ" : "رسالة من تلميذ",
      p_body: `${user.fullName}: ${msg.substring(0, 60)}`,
      p_related_id: user.id,
    });
  };

  const handleMediaUploaded = async (url: string, type: "voice" | "image") => {
    if (!selected?.user_id || !user?.id) return;
    const label = type === "voice" ? "🎤 رسالة صوتية" : "📷 صورة";
    await supabase.from("direct_messages").insert({
      sender_id: user.id,
      receiver_id: selected.user_id,
      content: `${label}\n${url}`,
    });
  };

  const filtered = profiles.filter(
    (p) =>
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.nickname || "").toLowerCase().includes(search.toLowerCase()),
  );

  const getAvatar = (p: Profile) =>
    p.photo_url || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${p.full_name}`;

  if (selected) {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col bg-card/40 rounded-2xl border border-border backdrop-blur-md overflow-hidden">
        <div className="h-14 border-b border-border flex items-center px-4 bg-background/20 gap-3">
          <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-primary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <img src={getAvatar(selected)} alt="" className="w-8 h-8 rounded-full bg-card border border-border" />
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-sm text-primary truncate">
              {selected.nickname || selected.full_name}
            </p>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              {selected.role === "tutor" ? <GraduationCap className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
              {selected.role === "tutor" ? "أستاذ" : "تلميذ"}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-12">لا توجد رسائل بعد. ابدأ المحادثة.</p>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === user?.id;
              const hasMedia = msg.content.includes("\nhttps://");
              const mediaUrl = hasMedia ? msg.content.split("\n").pop() : null;
              const textContent = hasMedia ? msg.content.split("\n")[0] : msg.content;
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] p-3 rounded-2xl ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-secondary text-foreground rounded-bl-sm border border-border"
                    }`}
                  >
                    {mediaUrl ? (
                      mediaUrl.includes(".webm") || mediaUrl.includes(".ogg") || mediaUrl.includes(".mp3") ? (
                        <audio controls className="max-w-[200px] h-10">
                          <source src={mediaUrl} />
                        </audio>
                      ) : (
                        <img
                          src={mediaUrl}
                          alt=""
                          className="max-w-[200px] max-h-[180px] rounded-lg object-cover cursor-pointer"
                          onClick={() => window.open(mediaUrl, "_blank")}
                        />
                      )
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{textContent}</p>
                    )}
                    <p
                      className={`text-[10px] mt-1 ${
                        isMe ? "text-primary-foreground/60" : "text-muted-foreground"
                      }`}
                    >
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-3 bg-background/40 border-t border-border">
          <form onSubmit={handleSend} className="flex items-center gap-1">
            <ChatMediaInput userId={user?.id || "anon"} onMediaUploaded={handleMediaUploaded} />
            <Input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="اكتب رسالتك..."
              className="flex-1 bg-secondary/50 border-border h-11 rounded-xl"
            />
            <Button
              type="submit"
              disabled={!content.trim()}
              className="h-11 w-11 rounded-xl bg-primary flex-shrink-0"
            >
              <SendHorizontal className="w-5 h-5 text-primary-foreground" />
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-glow mb-2">{pageTitle}</h1>
        <p className="text-muted-foreground text-sm">{pageSubtitle}</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isTutor ? "ابحث عن تلميذ..." : "ابحث عن أستاذ..."}
          className="pl-10 bg-card/60 border-border h-11 rounded-xl"
        />
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">{isTutor ? "لا يوجد تلاميذ بعد." : "لا يوجد أساتذة معتمدون بعد."}</p>
          </div>
        ) : (
          filtered.map((p) => (
            <Card
              key={p.id}
              onClick={() => setSelected(p)}
              className="glass-panel p-3 flex items-center gap-3 cursor-pointer hover:border-primary/40 transition-colors"
            >
              <img
                src={getAvatar(p)}
                alt=""
                className="w-10 h-10 rounded-full bg-card border border-border flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{p.nickname || p.full_name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {p.role === "tutor" ? <GraduationCap className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                  {p.role === "tutor" ? "أستاذ" : "تلميذ"}
                </p>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
