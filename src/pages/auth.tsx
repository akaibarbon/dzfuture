import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, Mail, User, KeyRound, Copy, Download, Check, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { LevelPicker } from "@/components/level-picker";
import { getLevelMeta } from "@/lib/levels";
import logoImg from "@/assets/logo.png";

function generateSerial() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return letters[Math.floor(Math.random() * 26)] + letters[Math.floor(Math.random() * 26)] + Math.floor(10 + Math.random() * 90).toString();
}

function generateAvatarUrl(seed: string) {
  return `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(seed)}&backgroundColor=1a1a2e`;
}

async function ensureProfile(user: any, setUser: any, setNewSerial: any, setMode: any, navigate: any, isOAuth = false) {
  // 1) Try by user_id (existing linked account)
  let { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();

  // 2) If OAuth and no profile by user_id, try linking by email (account merge)
  if (!profile && isOAuth && user.email) {
    const { data: byEmail } = await supabase.from("profiles").select("*").eq("email", user.email).maybeSingle();
    if (byEmail) {
      // Link this auth user to the existing profile
      await supabase.from("profiles").update({ user_id: user.id }).eq("id", byEmail.id);
      profile = { ...byEmail, user_id: user.id };
    }
  }

  if (profile) {
    setUser({ id: user.id, fullName: profile.full_name, email: profile.email, role: profile.role, serialNumber: profile.serial_number, photoUrl: profile.photo_url || undefined, nickname: profile.nickname || undefined, level: profile.level, branch: profile.branch, approved: (profile as any).approved ?? true });
    navigate("/hub");
    return;
  }

  // 3) Brand new — create profile
  const serialNum = generateSerial();
  const fullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const photoUrl = user.user_metadata?.avatar_url || generateAvatarUrl(user.email || serialNum);
  const { error } = await supabase.from("profiles").insert({ user_id: user.id, full_name: fullName, email: user.email || "", role: "student", serial_number: serialNum, photo_url: photoUrl });
  if (!error) {
    setUser({ id: user.id, fullName, email: user.email || "", role: "student", serialNumber: serialNum, photoUrl });
    if (isOAuth) {
      navigate("/hub");
    } else {
      setNewSerial(serialNum);
      setMode("success");
    }
  } else {
    const { data: retryProfile } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
    if (retryProfile) {
      setUser({ id: user.id, fullName: retryProfile.full_name, email: retryProfile.email, role: retryProfile.role, serialNumber: retryProfile.serial_number, photoUrl: retryProfile.photo_url || undefined, nickname: retryProfile.nickname || undefined });
      navigate("/hub");
    }
  }
}

export default function AuthPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { setUser } = useAuth();
  const [mode, setMode] = useState<"login" | "register" | "success">("login");
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
        setTimeout(() => { ensureProfile(session.user, setUser, setNewSerial, setMode, navigate, isOAuth); }, 0);
      }
      if (event === "INITIAL_SESSION" && !session) {
        if (mounted) setCheckingSession(false);
      }
    });
    // getSession to trigger INITIAL_SESSION
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && mounted) {
        ensureProfile(session.user, setUser, setNewSerial, setMode, navigate, true);
      }
      if (mounted) setCheckingSession(false);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serial.trim()) return;
    setLoading(true);
    const { data: profile } = await supabase.from("profiles").select("*").eq("serial_number", serial.toUpperCase()).maybeSingle();
    if (profile) {
      // Try signing in with serial as password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: profile.email, password: serial.toUpperCase() });
      if (authError) {
        // If password login fails (e.g. Google user), check if there's an existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser({ id: session.user.id, fullName: profile.full_name, email: profile.email, role: profile.role, serialNumber: profile.serial_number, photoUrl: profile.photo_url || undefined, nickname: profile.nickname || undefined });
          navigate("/hub");
        } else {
          toast({ title: t("auth.googleOnly"), description: t("auth.googleOnlyDesc"), variant: "destructive" });
        }
      } else {
        setUser({ id: authData.user.id, fullName: profile.full_name, email: profile.email, role: profile.role, serialNumber: profile.serial_number, photoUrl: profile.photo_url || undefined, nickname: profile.nickname || undefined });
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

    // Check if email already exists (linked via Google previously)
    const { data: existingProfile } = await supabase.from("profiles").select("user_id, serial_number").eq("email", regData.email).maybeSingle();
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
      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: authData.user.id, full_name: regData.fullName, email: regData.email, role: regData.role,
        serial_number: serialNum, photo_url: generateAvatarUrl(regData.fullName),
        level: regData.level, branch: meta?.branchRequired ? regData.branch : null,
      });
      if (profileError) { toast({ title: t("auth.profileError"), description: profileError.message, variant: "destructive" }); setLoading(false); return; }
      setUser({ id: authData.user.id, fullName: regData.fullName, email: regData.email, role: regData.role, serialNumber: serialNum, photoUrl: generateAvatarUrl(regData.fullName), level: regData.level, branch: meta?.branchRequired ? regData.branch : null });
      setNewSerial(serialNum);
      setMode("success");
    }
    setLoading(false);
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
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">{t("or")}</span></div>
              </div>
              <Button type="button" variant="outline" onClick={handleGoogleSignIn} disabled={loading} className="w-full h-12 gap-3 text-base font-medium border-border hover:bg-secondary/50">
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                {t("googleSignIn")}
              </Button>
              <p className="text-center text-sm text-muted-foreground mt-4">
                {t("dontHaveAccount")} <button type="button" onClick={() => setMode("register")} className="text-primary hover:underline font-semibold">{t("Register")}</button>
              </p>
            </motion.form>
          )}

          {mode === "register" && (
            <motion.form key="register" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label>{t("auth.fullName")}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input required value={regData.fullName} onChange={(e) => setRegData({ ...regData, fullName: e.target.value })} placeholder={t("auth.namePlaceholder")} className="pl-10 h-12 bg-background/40" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("auth.email")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input required type="email" value={regData.email} onChange={(e) => setRegData({ ...regData, email: e.target.value })} placeholder={t("auth.emailPlaceholder")} className="pl-10 h-12 bg-background/40" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("auth.password")}</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input required type="password" minLength={6} value={regData.password} onChange={(e) => setRegData({ ...regData, password: e.target.value })} placeholder={t("auth.passwordPlaceholder")} className="pl-10 h-12 bg-background/40" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("auth.role")}</Label>
                <Select value={regData.role} onValueChange={(v) => setRegData({ ...regData, role: v })}>
                  <SelectTrigger className="h-12 bg-background/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">{t("auth.student")}</SelectItem>
                    <SelectItem value="tutor">{t("auth.tutor")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <LevelPicker
                  level={regData.level || null}
                  branch={regData.branch || null}
                  onLevelChange={(v) => setRegData({ ...regData, level: v, branch: "" })}
                  onBranchChange={(v) => setRegData({ ...regData, branch: v })}
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-12 mt-6 bg-primary text-primary-foreground font-bold">
                {loading ? <Loader2 className="animate-spin" /> : t("Register")}
              </Button>
              <p className="text-center text-sm text-muted-foreground mt-4">
                {t("alreadyLegendary")} <button type="button" onClick={() => setMode("login")} className="text-primary hover:underline">{t("Login")}</button>
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
              <div className="grid grid-cols-2 gap-3">
                <Button type="button" onClick={handleCopySerial} variant="outline" className="h-12 gap-2 border-primary/50 hover:bg-primary/10">
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? "تم النسخ" : "نسخ"}
                </Button>
                <Button type="button" onClick={handleDownloadSerial} variant="outline" className="h-12 gap-2 border-primary/50 hover:bg-primary/10">
                  <Download className="w-4 h-4" />
                  تنزيل
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
