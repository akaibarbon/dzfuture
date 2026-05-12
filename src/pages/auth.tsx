import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, Mail, User, KeyRound, Copy, Download, Check, AlertTriangle, Info, BookOpen, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { LevelPicker } from "@/components/level-picker";
import { getLevelMeta } from "@/lib/levels";
import { downloadSerialAsImage } from "@/lib/serial-image";
import { setSerialPassword, healSerialLogin } from "@/lib/set-serial-password.functions";
import { generateSerialNumber, normalizeSerial, serialPasswordCandidates } from "@/lib/serial-auth";
import { ImageDown } from "lucide-react";
import logoImg from "@/assets/logo.png";

function generateSerial() {
  return generateSerialNumber();
}

function generateAvatarUrl(seed: string) {
  return `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(seed)}&backgroundColor=1a1a2e`;
}

async function ensureProfile(
  user: any,
  setUser: any,
  setNewSerial: any,
  setMode: any,
  navigate: any,
  isOAuth = false,
  setOAuthPending?: (u: any) => void,
) {
  const normalizedEmail = (user.email || "").trim().toLowerCase();

  // 1) Try by user_id (existing linked account)
  let { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();

  // 2) If no profile by user_id, ALWAYS try linking by email (case-insensitive) to avoid duplicates
  //    This covers OAuth signing in for an admin-created account, or any provider-mismatch scenario.
  if (!profile && normalizedEmail) {
    const { data: byEmail } = await supabase
      .from("profiles")
      .select("*")
      .ilike("email", normalizedEmail)
      .maybeSingle();
    if (byEmail) {
      // Re-link this auth user to the existing profile (and normalize stored email)
      await supabase
        .from("profiles")
        .update({ user_id: user.id, email: normalizedEmail })
        .eq("id", byEmail.id);
      profile = { ...byEmail, user_id: user.id, email: normalizedEmail };
    }
  }

  // 3) If profile exists but its user_id no longer matches current auth user, re-link it
  if (profile && profile.user_id !== user.id) {
    await supabase.from("profiles").update({ user_id: user.id }).eq("id", profile.id);
    profile.user_id = user.id;
  }

  if (profile) {
    setUser({ id: user.id, fullName: profile.full_name, email: profile.email, role: profile.role, serialNumber: profile.serial_number, photoUrl: profile.photo_url || undefined, nickname: profile.nickname || undefined, level: profile.level, branch: profile.branch, approved: (profile as any).approved ?? true });
    navigate("/hub");
    return;
  }

  // 3) Brand new
  if (isOAuth && setOAuthPending) {
    // Defer profile creation until user completes onboarding form
    setOAuthPending(user);
    setMode("oauth-onboarding");
    return;
  }

  // Email/password signup path (legacy) — auto-create
  const serialNum = generateSerial();
  const fullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const photoUrl = user.user_metadata?.avatar_url || generateAvatarUrl(user.email || serialNum);
  const { error } = await supabase.from("profiles").insert({ user_id: user.id, full_name: fullName, email: user.email || "", role: "student", serial_number: serialNum, photo_url: photoUrl });
  if (!error) {
    setUser({ id: user.id, fullName, email: user.email || "", role: "student", serialNumber: serialNum, photoUrl });
    setNewSerial(serialNum);
    setMode("success");
  }
}

export default function AuthPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { setUser } = useAuth();
  const [mode, setMode] = useState<"login" | "register" | "success" | "oauth-onboarding">("login");
  const [oauthPending, setOauthPending] = useState<any>(null);
  const [oauthForm, setOauthForm] = useState({ fullName: "", role: "student", level: "", branch: "" });
  const [oauthBusy, setOauthBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serial, setSerial] = useState("");
  const [regData, setRegData] = useState({ fullName: "", email: "", password: "", role: "student", level: "", branch: "" });
  const [newSerial, setNewSerial] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [copied, setCopied] = useState(false);
  const [savedConfirmed, setSavedConfirmed] = useState(false);

  const handleCopySerial = async () => {
    try {
      await navigator.clipboard.writeText(newSerial);
      setCopied(true);
      toast({ title: "✓ تم النسخ", description: "تم نسخ الرقم التسلسلي للحافظة" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "تعذر النسخ", description: "انسخه يدوياً من الشاشة", variant: "destructive" });
    }
  };

  const handleDownloadSerial = () => {
    const content = `Future DZ — رقمك التسلسلي\n\nالرقم التسلسلي: ${newSerial}\n\nاحتفظ بهذا الرقم في مكان آمن. ستحتاجه لتسجيل الدخول.\n\nتاريخ الإنشاء: ${new Date().toLocaleString("ar-DZ")}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `FutureDZ-Serial-${newSerial}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "✓ تم التنزيل", description: "احتفظ بالملف في مكان آمن" });
  };

  useEffect(() => {
    let mounted = true;
    // Subscribe FIRST so we don't miss events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") && session?.user) {
        const isOAuth = session.user.app_metadata?.provider === "google" || !!session.user.user_metadata?.avatar_url;
        const u = session.user;
        setOauthForm((f) => ({ ...f, fullName: f.fullName || u.user_metadata?.full_name || "" }));
        setTimeout(() => { ensureProfile(u, setUser, setNewSerial, setMode, navigate, isOAuth, setOauthPending); }, 0);
      }
      if (event === "INITIAL_SESSION" && !session) {
        if (mounted) setCheckingSession(false);
      }
    });
    // getSession to trigger INITIAL_SESSION
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && mounted) {
        ensureProfile(session.user, setUser, setNewSerial, setMode, navigate, true, setOauthPending);
      }
      if (mounted) setCheckingSession(false);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serial.trim()) return;
    setLoading(true);
    const cleanSerial = normalizeSerial(serial);
    const { data: profile } = await supabase.from("profiles").select("*").eq("serial_number", cleanSerial).maybeSingle();
    if (profile) {
      let authData: any = null;
      let authError: any = null;
      for (const password of serialPasswordCandidates(cleanSerial)) {
        const result = await supabase.auth.signInWithPassword({ email: profile.email, password });
        authData = result.data;
        authError = result.error;
        if (!authError && authData?.user) break;
      }
      if (authError) {
        // Self-heal: set the auth password = serial via admin, then retry both candidates.
        try {
          const healed = await healSerialLogin({ data: { serial: cleanSerial } });
          const emailToUse = healed.email || profile.email;
          for (const password of healed.passwords || serialPasswordCandidates(cleanSerial)) {
            const retry = await supabase.auth.signInWithPassword({ email: emailToUse, password });
            authData = retry.data; authError = retry.error;
            if (!authError && authData?.user) break;
          }
        } catch (e: any) {
          toast({ title: "تعذر تسجيل الدخول", description: e?.message || "حاول الدخول عبر Google بدلاً من ذلك", variant: "destructive" });
          setLoading(false); return;
        }
      }
      if (authError || !authData?.user) {
        toast({ title: "تعذر تسجيل الدخول بالرقم التسلسلي", description: "إذا كان الحساب مرتبطاً بـ Google، استخدم زر «الدخول عبر Google» أدناه.", variant: "destructive" });
      } else {
        if (profile.user_id !== authData.user.id) {
          await supabase.from("profiles").update({ user_id: authData.user.id }).eq("id", profile.id);
        }
        setUser({ id: authData.user.id, fullName: profile.full_name, email: profile.email, role: profile.role, serialNumber: profile.serial_number, photoUrl: profile.photo_url || undefined, nickname: profile.nickname || undefined, level: profile.level, branch: profile.branch, approved: (profile as any).approved ?? true });
        navigate("/hub");
      }
    } else {
      toast({ title: t("auth.notFound"), description: t("auth.notFoundDesc"), variant: "destructive" });
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth", extraParams: { prompt: "select_account" } });
    if (result.error) { toast({ title: t("auth.googleFailed"), description: result.error.message, variant: "destructive" }); setLoading(false); }
    if (result.redirected) return;
    // If tokens returned directly (no redirect), session is already set
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regData.email || !regData.fullName || !regData.password || !regData.level) return;
    const meta = getLevelMeta(regData.level);
    if (meta?.branchRequired && !regData.branch) {
      toast({ title: "اختر الشعبة", description: "هذا المستوى يتطلب اختيار الشعبة.", variant: "destructive" });
      return;
    }
    setLoading(true);

    const emailLower = regData.email.trim().toLowerCase();
    // Check if email already exists (case-insensitive) — prevents duplicate accounts
    const { data: existingProfile } = await supabase.from("profiles").select("user_id, serial_number").ilike("email", emailLower).maybeSingle();
    if (existingProfile) {
      toast({
        title: "هذا الإيميل مسجّل مسبقاً",
        description: "ادخل عبر Google بنفس الإيميل أو استخدم رقمك التسلسلي.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const serialNum = generateSerial();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: regData.email,
      password: regData.password,
      options: { emailRedirectTo: window.location.origin + "/auth" },
    });
    if (authError) { toast({ title: t("auth.regFailed"), description: authError.message, variant: "destructive" }); setLoading(false); return; }
    if (authData.user) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: regData.email, password: regData.password });
      if (signInError) { toast({ title: t("auth.signInFailed"), description: signInError.message, variant: "destructive" }); setLoading(false); return; }
      const isTutor = regData.role === "tutor";
      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: authData.user.id, full_name: regData.fullName, email: regData.email, role: regData.role,
        serial_number: serialNum, photo_url: generateAvatarUrl(regData.fullName),
        level: regData.level, branch: meta?.branchRequired ? regData.branch : null,
        approved: !isTutor,
      } as any);
      if (profileError) { toast({ title: t("auth.profileError"), description: profileError.message, variant: "destructive" }); setLoading(false); return; }
      setUser({ id: authData.user.id, fullName: regData.fullName, email: regData.email, role: regData.role, serialNumber: serialNum, photoUrl: generateAvatarUrl(regData.fullName), level: regData.level, branch: meta?.branchRequired ? regData.branch : null, approved: !isTutor });
      setNewSerial(serialNum);
      setMode("success");
    }
    setLoading(false);
  };

  const handleOAuthOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oauthPending || !oauthForm.fullName.trim() || !oauthForm.level) return;
    const meta = getLevelMeta(oauthForm.level);
    if (meta?.branchRequired && !oauthForm.branch) {
      toast({ title: "اختر الشعبة", variant: "destructive" }); return;
    }
    setOauthBusy(true);
    const serialNum = generateSerial();
    const isTutor = oauthForm.role === "tutor";
    const photoUrl = oauthPending.user_metadata?.avatar_url || generateAvatarUrl(oauthForm.fullName);
    const { error } = await supabase.from("profiles").insert({
      user_id: oauthPending.id,
      full_name: oauthForm.fullName.trim(),
      email: oauthPending.email || "",
      role: oauthForm.role,
      serial_number: serialNum,
      photo_url: photoUrl,
      level: oauthForm.level,
      branch: meta?.branchRequired ? oauthForm.branch : null,
      approved: !isTutor,
    } as any);
    setOauthBusy(false);
    if (error) { toast({ title: "تعذر إنشاء الحساب", description: error.message, variant: "destructive" }); return; }
    // Set the auth password = serial so the user can also log in via the serial-number flow
    try { await setSerialPassword({ data: { userId: oauthPending.id, serial: serialNum } }); } catch {}
    setUser({ id: oauthPending.id, fullName: oauthForm.fullName.trim(), email: oauthPending.email || "", role: oauthForm.role, serialNumber: serialNum, photoUrl, level: oauthForm.level, branch: meta?.branchRequired ? oauthForm.branch : null, approved: !isTutor });
    setNewSerial(serialNum);
    setOauthPending(null);
    setMode("success");
  };


  if (checkingSession) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md glass-panel p-8 rounded-3xl relative z-10">
        <div className="text-center mb-8">
          <img src={logoImg} alt="Future DZ" className="w-20 h-20 mx-auto mb-4 drop-shadow-[0_0_20px_hsl(var(--primary)/0.5)]" />
          <h1 className="text-3xl font-display font-bold text-glow">{t("auth.title")}</h1>
          <p className="text-muted-foreground mt-2 font-medium">{t("auth.subtitle")}</p>
        </div>

        <AnimatePresence mode="wait">
          {mode === "login" && (
            <motion.form key="login" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label>{t("auth.serialLabel")}</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input value={serial} onChange={(e) => setSerial(e.target.value)} placeholder={t("auth.serialPlaceholder")} className="pl-10 h-12 bg-background/40 border-border uppercase" />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full h-12 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.3)]">
                {loading ? <Loader2 className="animate-spin" /> : t("enterHub")}
              </Button>

              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-right space-y-2">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <strong className="block mb-1 text-primary">الحسابات مُدارة من الإدارة</strong>
                    <span className="text-muted-foreground">لا يمكن إنشاء حساب ذاتياً. يتم إنشاء الحسابات من قِبل إدارة المنصة، وتسجيل الدخول يتم حصراً بالرقم التسلسلي الذي يُمنح لك. للحصول على حساب أو في حال فقدان الرقم، تواصل مع الإدارة.</span>
                  </div>
                </div>
              </div>

              <details className="group rounded-xl border border-border bg-background/40 overflow-hidden">
                <summary className="flex items-center justify-between gap-2 p-4 cursor-pointer hover:bg-background/60 transition list-none">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <span className="font-bold text-sm">دليل سريع للمنصة</span>
                  </div>
                  <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="p-4 pt-0 text-right text-xs space-y-3 text-muted-foreground max-h-80 overflow-y-auto">
                  <section>
                    <h3 className="font-bold text-foreground text-sm mb-1">🏠 المركز (Hub)</h3>
                    <p>الواجهة الرئيسية للوصول إلى جميع الأدوات والصفحات بعد الدخول.</p>
                  </section>
                  <section>
                    <h3 className="font-bold text-foreground text-sm mb-1">📅 الأجندة والبرنامج اليومي</h3>
                    <p>تنظيم المهام، الواجبات، الجدول الدراسي اليومي والاختبارات القادمة.</p>
                  </section>
                  <section>
                    <h3 className="font-bold text-foreground text-sm mb-1">📚 الدروس والملخصات</h3>
                    <p>الوصول إلى الدروس المعتمدة، الملخصات التشاركية، والمحتوى التعليمي.</p>
                  </section>
                  <section>
                    <h3 className="font-bold text-foreground text-sm mb-1">🤖 المحادثة الذكية وأدوات الذكاء الاصطناعي</h3>
                    <p>مساعد ذكي للإجابة على الأسئلة، توليد التمارين، تصحيح آلي، ورادار المعرفة لتحديد نقاط الضعف.</p>
                  </section>
                  <section>
                    <h3 className="font-bold text-foreground text-sm mb-1">👥 المجموعات والمحادثات</h3>
                    <p>مجموعات دراسية بإدارة الأستاذ، محادثات مباشرة مع الأساتذة والزملاء، ورسائل خاصة.</p>
                  </section>
                  <section>
                    <h3 className="font-bold text-foreground text-sm mb-1">📢 الإعلانات</h3>
                    <p>متابعة آخر الإعلانات الرسمية من الإدارة والأساتذة.</p>
                  </section>
                  <section>
                    <h3 className="font-bold text-foreground text-sm mb-1">🧮 حاسبة المعدل (GPA)</h3>
                    <p>حساب المعدل الفصلي والسنوي وفق نظام التعليم الجزائري.</p>
                  </section>
                  <section>
                    <h3 className="font-bold text-foreground text-sm mb-1">⚙️ الحساب ولوحة التحكم</h3>
                    <p>إدارة الملف الشخصي ورؤية الرقم التسلسلي. لوحة التحكم متاحة للأساتذة والإدارة فقط.</p>
                  </section>
                  <section>
                    <h3 className="font-bold text-foreground text-sm mb-1">🎯 آلية النقاط (XP) والشارات</h3>
                    <p>اكسب نقاط خبرة وشارات عبر إنجاز المهام والمشاركة في المنصة.</p>
                  </section>
                  <section>
                    <h3 className="font-bold text-foreground text-sm mb-1">🔐 الأمان</h3>
                    <p>الرقم التسلسلي شخصي وسري. لا تشاركه مع أحد. في حال فقدانه راسل الإدارة لإعادة التعيين.</p>
                  </section>
                </div>
              </details>

              <p className="text-center text-xs text-muted-foreground">
                للحصول على حساب، تواصل مع إدارة المنصة.
              </p>
            </motion.form>
          )}


          {mode === "success" && (
            <motion.div key="success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-5">
              <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/50">
                <ShieldCheck className="w-10 h-10 text-green-400" />
              </div>
              <h2 className="text-2xl font-display text-glow text-green-400">تم إنشاء حسابك بنجاح!</h2>
              <div className="bg-yellow-500/10 border border-yellow-500/40 rounded-xl p-4 text-right space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-200">
                    <strong className="block mb-1">⚠️ مهم جداً — احفظ رقمك التسلسلي الآن</strong>
                    <span className="text-yellow-300/80">هذا الرقم هو مفتاح دخولك الوحيد للموقع. انسخه أو نزّله واحتفظ به في مكان آمن. لن تتمكن من استرجاعه لاحقاً.</span>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-background/60 rounded-xl border-2 border-primary/50 text-4xl font-mono font-bold tracking-[0.2em] text-primary shadow-[0_0_20px_hsl(var(--primary)/0.2)] select-all">{newSerial}</div>
              <div className="grid grid-cols-3 gap-2">
                <Button type="button" onClick={handleCopySerial} variant="outline" className="h-12 gap-1 border-primary/50 hover:bg-primary/10 text-xs">
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? "نُسخ" : "نسخ"}
                </Button>
                <Button type="button" onClick={handleDownloadSerial} variant="outline" className="h-12 gap-1 border-primary/50 hover:bg-primary/10 text-xs">
                  <Download className="w-4 h-4" /> ملف
                </Button>
                <Button type="button" onClick={() => downloadSerialAsImage(newSerial)} variant="outline" className="h-12 gap-1 border-primary/50 hover:bg-primary/10 text-xs">
                  <ImageDown className="w-4 h-4" /> صورة
                </Button>
              </div>
              <label className="flex items-center gap-3 p-3 bg-background/40 rounded-lg border border-border cursor-pointer hover:bg-background/60 transition">
                <input type="checkbox" checked={savedConfirmed} onChange={(e) => setSavedConfirmed(e.target.checked)} className="w-5 h-5 accent-primary" />
                <span className="text-sm text-right flex-1">نعم، لقد حفظت رقمي التسلسلي في مكان آمن</span>
              </label>
              <Button onClick={() => navigate("/hub")} disabled={!savedConfirmed} className="w-full h-12 bg-primary text-primary-foreground font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                {savedConfirmed ? "دخول المنصة" : "احفظ الرقم أولاً للمتابعة"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
