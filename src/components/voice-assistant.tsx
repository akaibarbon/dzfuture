import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Loader2, X, Sparkles, Send, Bell, Calendar, MessageSquare, ClipboardList } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

// Multilingual command keywords (AR Darija + Fusha, FR, EN)
type Cmd = { keys: string[]; route: string; reply: string };
const COMMANDS: Cmd[] = [
  { keys: ["جدول", "بروغرام", "حصص", "schedule", "programme", "emploi"], route: "/daily-schedule", reply: "الجدول اليومي" },
  { keys: ["أجندة", "اجندة", "agenda", "calendar"], route: "/agenda", reply: "الأجندة" },
  { keys: ["مجموع", "قروب", "جماعة", "group", "groupe"], route: "/groups", reply: "المجموعات" },
  { keys: ["دروس", "كور", "ليسون", "lesson", "leçon", "cours"], route: "/lessons", reply: "الدروس" },
  { keys: ["واجب", "تحدي", "homework", "devoir", "challenge", "défi"], route: "/assignments", reply: "الواجبات والتحديات" },
  { keys: ["رسائل", "ميساج", "message"], route: "/messages", reply: "الرسائل" },
  { keys: ["محادثة الأستاذ", "tutor chat", "chat tuteur", "أستاذ"], route: "/tutor-chat", reply: "محادثة الأستاذ" },
  { keys: ["إعلان", "اعلان", "خبر", "announce", "annonce", "news"], route: "/announcements", reply: "الإعلانات" },
  { keys: ["حساب", "بروفيل", "كومت", "account", "profile", "profil", "compte"], route: "/account", reply: "حسابك" },
  { keys: ["معدل", "نقطة", "علامة", "gpa", "moyenne", "average"], route: "/gpa-calculator", reply: "حاسبة المعدل" },
  { keys: ["ذكاء", "شات", "أسأل", "اسأل", "ai chat", "chat ai"], route: "/ai-chat", reply: "الذكاء الاصطناعي" },
  { keys: ["رادار", "ثغرات", "knowledge", "radar"], route: "/knowledge-radar", reply: "رادار المعرفة" },
  { keys: ["مساعدة", "اعانة", "study help", "aide"], route: "/study-helps", reply: "أدوات الدراسة" },
  { keys: ["برنامج المادة", "programme matière", "subject programme"], route: "/programme", reply: "البرنامج" },
  { keys: ["hub", "رئيس", "الرئيسية", "accueil", "home"], route: "/hub", reply: "الواجهة الرئيسية" },
  // Tutor-only
  { keys: ["مصحح", "auto grader", "correction"], route: "/auto-grader", reply: "المصحح الآلي" },
  { keys: ["تعليم متقدم", "advanced teaching", "enseignement"], route: "/advanced-teaching", reply: "التعليم المتقدم" },
  { keys: ["أدوات", "ai tools", "outils ai"], route: "/ai-tools", reply: "أدوات الذكاء" },
  { keys: ["لوحة التحكم", "control panel", "panneau"], route: "/control-panel", reply: "لوحة التحكم" },
];

const HELP_LINES = [
  "• «ورّيلي الجدول» / «show schedule» / «montre l'emploi»",
  "• «روح للمجموعات» / «go to groups»",
  "• «ضيف مهمة رياضيات 9:00» / «add task math 9am»",
  "• «أخبرني بالمستجدات» / «what's new» / «quoi de neuf»",
  "• «أنشر إعلان: ...» (للأستاذ فقط)",
  "• «احسبلي المعدل»",
];

export function VoiceAssistant() {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [textInput, setTextInput] = useState("");
  const [lang, setLang] = useState<"ar" | "fr" | "en">("ar");
  const recognitionRef = useRef<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const isTutor = user?.role === "tutor" && user?.approved !== false;
  const supportsSpeech = typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);

  const speak = (txt: string) => {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(txt);
    const voices = speechSynthesis.getVoices();
    const localeMap = { ar: "ar", fr: "fr", en: "en" } as const;
    const want = localeMap[lang];
    const v = voices.find((v) => v.lang?.startsWith(want)) || voices.find((v) => v.lang?.startsWith("ar"));
    if (v) u.voice = v;
    u.lang = v?.lang || (lang === "fr" ? "fr-FR" : lang === "en" ? "en-US" : "ar-SA");
    u.rate = 1.15;
    speechSynthesis.speak(u);
  };

  const startListening = () => {
    if (!supportsSpeech) {
      toast({ title: "غير مدعوم", description: "متصفحك لا يدعم التعرف الصوتي. جرب Chrome.", variant: "destructive" });
      return;
    }
    const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const rec = new SR();
    rec.lang = lang === "fr" ? "fr-FR" : lang === "en" ? "en-US" : "ar-DZ";
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    let finalText = "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setTranscript(finalText || interim);
      if (finalText) {
        try { rec.stop(); } catch {}
        handleCommand(finalText);
      }
    };
    rec.onerror = (e: any) => {
      setListening(false);
      if (e.error !== "no-speech" && e.error !== "aborted") {
        toast({ title: "خطأ", description: e.error || "حدث خطأ في التسجيل", variant: "destructive" });
      }
    };
    rec.onend = () => setListening(false);
    if ("speechSynthesis" in window) speechSynthesis.getVoices();
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
    setTranscript("");
    setReply("");
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  // --- INTENT HANDLERS ---

  const fetchUpdates = async () => {
    if (!user?.id) return "سجّل دخولك أولاً";
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [notifs, anns, asgns, dms] = await Promise.all([
      supabase.from("notifications").select("title,created_at,read").eq("user_id", user.id).eq("read", false).order("created_at", { ascending: false }).limit(5),
      supabase.from("announcements").select("title,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(3),
      supabase.from("assignments").select("title,kind,due_at").gte("created_at", since).order("created_at", { ascending: false }).limit(3),
      supabase.from("direct_messages").select("content,created_at").eq("receiver_id", user.id).eq("read", false).order("created_at", { ascending: false }).limit(3),
    ]);
    const lines: string[] = [];
    if (notifs.data?.length) lines.push(`🔔 ${notifs.data.length} إشعارات جديدة: ${notifs.data.map((n: any) => n.title).slice(0, 3).join(" • ")}`);
    if (asgns.data?.length) lines.push(`📝 واجبات/تحديات حديثة: ${asgns.data.map((a: any) => a.title).join(" • ")}`);
    if (anns.data?.length) lines.push(`📢 إعلانات: ${anns.data.map((a: any) => a.title).join(" • ")}`);
    if (dms.data?.length) lines.push(`💬 ${dms.data.length} رسائل غير مقروءة`);
    if (!lines.length) return "ما كاينش جديد، كلش هادي.";
    return lines.join("\n");
  };

  const parseTime = (text: string): { time: string; subject: string } => {
    const timeMatch = text.match(/(\d{1,2})\s*[:hH]?\s*(\d{0,2})/);
    const hour = timeMatch ? Math.min(23, parseInt(timeMatch[1])) : 8;
    const min = timeMatch && timeMatch[2] ? Math.min(59, parseInt(timeMatch[2])) : 0;
    const time = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    const subject = text.replace(/(\d{1,2}\s*[:hH]?\s*\d{0,2})/g, "").replace(/(ضيف|اضف|أضف|دير|مهمة|تاسك|واجب|حصة|add|task|ajoute|tâche)/gi, "").trim();
    return { time, subject: subject || "مهمة جديدة" };
  };

  const addTask = async (text: string) => {
    if (!user?.id) return "سجّل دخولك أولاً";
    const { time, subject } = parseTime(text);
    const endHour = Math.min(23, parseInt(time.split(":")[0]) + 1);
    const endTime = `${String(endHour).padStart(2, "0")}:${time.split(":")[1]}`;
    const { error } = await supabase.from("daily_schedules").insert({
      user_id: user.id,
      day_index: new Date().getDay(),
      subject,
      start_time: time,
      end_time: endTime,
    });
    if (error) return "ما قدرتش نزيدها";
    toast({ title: "✓ تمت الإضافة", description: `${subject} • ${time}` });
    return `زدت لك: ${subject} على ${time}`;
  };

  const publishAnnouncement = async (text: string) => {
    if (!isTutor) return "هذا الأمر للأساتذة فقط";
    const body = text.replace(/(أنشر|انشر|publish|announce).*?(إعلان|annonce|announcement)\s*[:،,]?\s*/i, "").trim();
    if (!body) return "قل: «أنشر إعلان: نص الإعلان»";
    const title = body.split(/[.،,\n]/)[0].slice(0, 80) || "إعلان جديد";
    const { error } = await supabase.from("announcements").insert({
      title,
      description: body,
      date: new Date().toISOString().slice(0, 10),
      level: user?.level || null,
    });
    if (error) return "فشل النشر";
    toast({ title: "✓ نُشر الإعلان", description: title });
    return `نُشر الإعلان: ${title}`;
  };

  const publishAssignment = async (text: string, kind: "homework" | "challenge") => {
    if (!isTutor || !user?.id) return "هذا الأمر للأساتذة فقط";
    const body = text.replace(/(أنشر|انشر|publish|أضف|اضف|add).*?(واجب|تحدي|homework|devoir|challenge|défi)\s*[:،,]?\s*/i, "").trim();
    if (!body) return `قل: «أضف ${kind === "challenge" ? "تحدي" : "واجب"}: العنوان والوصف»`;
    const title = body.split(/[.،,\n]/)[0].slice(0, 80) || (kind === "challenge" ? "تحدي جديد" : "واجب جديد");
    const { error } = await supabase.from("assignments").insert({
      tutor_id: user.id,
      tutor_name: user.fullName || user.nickname || "الأستاذ",
      kind,
      title,
      description: body,
      target_levels: [],
      target_branches: [],
    });
    if (error) return "فشل النشر";
    toast({ title: `✓ نُشر ${kind === "challenge" ? "التحدي" : "الواجب"}`, description: title });
    return `نُشر: ${title}`;
  };

  const handleCommand = async (text: string) => {
    setProcessing(true);
    const lower = text.toLowerCase().trim();

    // 1. Updates intent
    if (/(جديد|مستجدات|أخبار|أخبرني|new|update|news|quoi de neuf|nouveau)/i.test(text)) {
      const msg = await fetchUpdates();
      setReply(msg);
      speak(msg.split("\n")[0]);
      setProcessing(false);
      return;
    }

    // 2. Publish announcement (tutor)
    if (/(أنشر|انشر|publish|announce).*?(إعلان|annonce|announcement)/i.test(text)) {
      const msg = await publishAnnouncement(text);
      setReply(msg); speak(msg); setProcessing(false); return;
    }

    // 3. Publish challenge
    if (/(أضف|اضف|أنشر|انشر|add|publish).*?(تحدي|challenge|défi)/i.test(text)) {
      const msg = await publishAssignment(text, "challenge");
      setReply(msg); speak(msg); setProcessing(false); return;
    }

    // 4. Publish homework
    if (/(أضف|اضف|أنشر|انشر|add|publish).*?(واجب|homework|devoir)/i.test(text)) {
      const msg = await publishAssignment(text, "homework");
      setReply(msg); speak(msg); setProcessing(false); return;
    }

    // 5. Add task to schedule
    if (/(ضيف|اضف|أضف|دير|add|ajoute).*(مهمة|تاسك|حصة|task|tâche|cours)/i.test(text)) {
      const msg = await addTask(text);
      setReply(msg); speak(msg); setProcessing(false); return;
    }

    // 6. Navigation
    for (const cmd of COMMANDS) {
      if (cmd.keys.some((k) => lower.includes(k.toLowerCase()))) {
        setReply(`أفتحلك ${cmd.reply}`);
        speak(cmd.reply);
        setTimeout(() => { navigate(cmd.route); setOpen(false); }, 900);
        setProcessing(false);
        return;
      }
    }

    // 7. Fallback: ask AI
    try {
      const { data } = await supabase.functions.invoke("ai-chat", {
        body: { type: "voice", payload: { question: text } },
      });
      const answer = data?.result || data?.content || "ما فهمتش، عاود من فضلك";
      setReply(answer);
      speak(answer);
    } catch {
      setReply("ما قدرتش نفهم، عاود");
      speak("ما قدرتش نفهم، عاود");
    }
    setProcessing(false);
  };

  const submitText = () => {
    if (!textInput.trim()) return;
    setTranscript(textInput);
    handleCommand(textInput);
    setTextInput("");
  };

  useEffect(() => () => recognitionRef.current?.stop(), []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-xl flex items-center justify-center hover:scale-110 transition focus:ring-4 focus:ring-primary/40"
        aria-label="المساعد الذكي أمين"
      >
        <Sparkles className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 50, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 50, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl text-right max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">أمين</span>
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
              </div>

              {/* Language selector */}
              <div className="flex items-center justify-end gap-1 mb-3">
                {(["ar", "fr", "en"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-2 py-0.5 text-xs rounded-md border ${lang === l ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>

              <p className="text-xs text-muted-foreground mb-3">مساعد ذكي بالصوت أو الكتابة — يربط كل الصفحات والإجراءات</p>

              {/* Quick action chips */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                <button onClick={() => handleCommand("أخبرني بالمستجدات")} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-secondary hover:bg-secondary/80 border border-border">
                  <Bell className="w-3 h-3" /> المستجدات
                </button>
                <button onClick={() => handleCommand("ورّيلي الجدول")} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-secondary hover:bg-secondary/80 border border-border">
                  <Calendar className="w-3 h-3" /> الجدول
                </button>
                <button onClick={() => handleCommand("روح للواجبات")} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-secondary hover:bg-secondary/80 border border-border">
                  <ClipboardList className="w-3 h-3" /> الواجبات
                </button>
                <button onClick={() => handleCommand("روح للرسائل")} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-secondary hover:bg-secondary/80 border border-border">
                  <MessageSquare className="w-3 h-3" /> الرسائل
                </button>
              </div>

              {/* Mic */}
              <div className="flex flex-col items-center gap-3 py-3">
                <motion.button
                  onClick={listening ? stopListening : startListening}
                  disabled={processing}
                  animate={listening ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                  transition={listening ? { repeat: Infinity, duration: 1.2 } : {}}
                  className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl ${listening ? "bg-red-500" : "bg-primary"} disabled:opacity-50`}
                >
                  {processing ? <Loader2 className="w-9 h-9 animate-spin" /> : listening ? <MicOff className="w-9 h-9" /> : <Mic className="w-9 h-9" />}
                </motion.button>
                <p className="text-xs text-muted-foreground">
                  {listening ? "🎤 نسمعك..." : processing ? "⏳ نفكّر..." : "اضغط للتسجيل أو اكتب أسفل"}
                </p>
              </div>

              {/* Text input */}
              <div className="flex items-center gap-2 mt-2">
                <button onClick={submitText} disabled={!textInput.trim() || processing} className="p-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-50">
                  <Send className="w-4 h-4" />
                </button>
                <input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitText()}
                  placeholder="اكتب أمراً... مثلاً: ضيف مهمة رياضيات 9:00"
                  className="flex-1 px-3 py-2 rounded-xl bg-secondary/50 border border-border text-sm text-right"
                  dir="auto"
                />
              </div>

              {transcript && (
                <div className="mt-3 p-3 rounded-xl bg-secondary/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">قلت/كتبت:</p>
                  <p className="font-medium text-sm">{transcript}</p>
                </div>
              )}
              {reply && (
                <div className="mt-2 p-3 rounded-xl bg-primary/10 border border-primary/30 whitespace-pre-line">
                  <p className="text-xs text-primary mb-1">أمين:</p>
                  <p className="font-medium text-sm">{reply}</p>
                </div>
              )}

              <details className="mt-3 text-xs text-muted-foreground">
                <summary className="cursor-pointer font-semibold">جرّب تقول/اكتب:</summary>
                <ul className="mt-2 space-y-0.5 text-[11px]">
                  {HELP_LINES.map((l, i) => <li key={i}>{l}</li>)}
                </ul>
              </details>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
