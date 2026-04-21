import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Loader2, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

// Algerian Darija command parser
const COMMANDS = [
  { keys: ["جدول", "بروغرام", "حصص"], route: "/daily-schedule", reply: "نوريك الجدول اليومي" },
  { keys: ["مجموع", "قروب", "جماعة"], route: "/groups", reply: "هاهي المجموعات" },
  { keys: ["دروس", "كور", "ليسون"], route: "/lessons", reply: "هاهي الدروس" },
  { keys: ["رسائل", "ميساج"], route: "/messages", reply: "هاهي الرسائل" },
  { keys: ["إعلان", "اعلان", "خبر"], route: "/announcements", reply: "هاهي الإعلانات" },
  { keys: ["حساب", "بروفيل", "كومت"], route: "/account", reply: "هاهو الحساب ديالك" },
  { keys: ["معدل", "نقطة", "علامة"], route: "/gpa-calculator", reply: "نحسبلك المعدل" },
  { keys: ["ذكاء", "شات", "أسأل", "اسأل"], route: "/ai-chat", reply: "هاهو الذكاء الاصطناعي" },
];

export function VoiceAssistant() {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const recognitionRef = useRef<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const supportsSpeech = typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);

  const speak = (txt: string) => {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(txt);
    // Pick an Arabic voice if available for faster + more natural delivery
    const voices = speechSynthesis.getVoices();
    const ar = voices.find((v) => v.lang?.startsWith("ar")) || voices.find((v) => /arab/i.test(v.name));
    if (ar) u.voice = ar;
    u.lang = ar?.lang || "ar-SA";
    u.rate = 1.15;
    u.pitch = 1;
    speechSynthesis.speak(u);
  };

  const startListening = () => {
    if (!supportsSpeech) {
      toast({ title: "غير مدعوم", description: "متصفحك لا يدعم التعرف الصوتي. جرب Chrome.", variant: "destructive" });
      return;
    }
    const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const rec = new SR();
    rec.lang = "ar-DZ";
    rec.continuous = false;
    rec.interimResults = true; // show partial results live
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
      // Trigger command as soon as we have a final result (no waiting for onend)
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
    // Pre-warm voices (Chrome loads them async)
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

  const handleCommand = async (text: string) => {
    setProcessing(true);
    const lower = text.toLowerCase();

    // Match local commands first
    for (const cmd of COMMANDS) {
      if (cmd.keys.some((k) => lower.includes(k))) {
        setReply(cmd.reply);
        speak(cmd.reply);
        setTimeout(() => {
          navigate(cmd.route);
          setOpen(false);
        }, 1200);
        setProcessing(false);
        return;
      }
    }

    // Check for "ضيف مهمة / أضف مهمة" (add task)
    if (/(ضيف|اضف|أضف|دير).*(مهمة|تاسك|واجب)/i.test(text)) {
      const subject = text.replace(/(ضيف|اضف|أضف|دير|مهمة|تاسك|واجب)/gi, "").trim() || "مهمة جديدة";
      try {
        await supabase.from("daily_schedules").insert({
          user_id: user?.id,
          day_index: new Date().getDay(),
          subject,
          start_time: "08:00",
          end_time: "09:00",
        });
        const r = `زدت لك المهمة: ${subject}`;
        setReply(r);
        speak(r);
        toast({ title: "✓ تمت الإضافة", description: subject });
      } catch {
        setReply("ما قدرتش نزيدها، عاود");
        speak("ما قدرتش نزيدها، عاود");
      }
      setProcessing(false);
      return;
    }

    // Fallback: ask AI
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

  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-xl flex items-center justify-center hover:scale-110 transition focus:ring-4 focus:ring-primary/40"
        aria-label="المساعد الصوتي أمين"
      >
        <Sparkles className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 50, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 50, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl text-right"
            >
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">أمين</span>
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-4">المساعد الصوتي بالدارجة الجزائرية</p>

              <div className="flex flex-col items-center gap-4 py-4">
                <motion.button
                  onClick={listening ? stopListening : startListening}
                  disabled={processing}
                  animate={listening ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                  transition={listening ? { repeat: Infinity, duration: 1.2 } : {}}
                  className={`w-24 h-24 rounded-full flex items-center justify-center text-white shadow-xl ${
                    listening ? "bg-red-500" : "bg-primary"
                  } disabled:opacity-50`}
                >
                  {processing ? <Loader2 className="w-10 h-10 animate-spin" /> : listening ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
                </motion.button>
                <p className="text-sm text-muted-foreground">
                  {listening ? "🎤 نسمعك..." : processing ? "⏳ نفكّر..." : "اضغط وقول واش حاب"}
                </p>
              </div>

              {transcript && (
                <div className="mt-4 p-3 rounded-xl bg-secondary/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">قلت:</p>
                  <p className="font-medium">{transcript}</p>
                </div>
              )}
              {reply && (
                <div className="mt-2 p-3 rounded-xl bg-primary/10 border border-primary/30">
                  <p className="text-xs text-primary mb-1">أمين:</p>
                  <p className="font-medium">{reply}</p>
                </div>
              )}

              <div className="mt-4 text-xs text-muted-foreground">
                <p className="font-semibold mb-1">جرّب تقول:</p>
                <ul className="space-y-0.5 text-[11px]">
                  <li>• "ورّيلي الجدول"</li>
                  <li>• "روح للمجموعات"</li>
                  <li>• "ضيف مهمة رياضيات"</li>
                  <li>• "احسبلي المعدل"</li>
                </ul>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
