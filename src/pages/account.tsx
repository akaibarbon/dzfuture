import { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme, themePresets } from "@/hooks/use-theme";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Mail, Shield, Palette, Camera, Save, Type, MessageCircle, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { LEVELS, SECONDARY_BRANCHES, getLevelMeta } from "@/lib/levels";

const fontOptions = [
  { value: "default", label: "Default (DM Sans)", family: "'DM Sans', sans-serif" },
  { value: "cinzel", label: "Cinzel (Display)", family: "'Cinzel', serif" },
  { value: "mono", label: "Monospace", family: "'Courier New', monospace" },
  { value: "serif", label: "Serif", family: "Georgia, serif" },
  { value: "comic", label: "Casual", family: "'Comic Sans MS', cursive" },
];

const bubbleColors = [
  { value: "primary", label: "Gold", hsl: "43 74% 49%" },
  { value: "blue", label: "Blue", hsl: "210 100% 50%" },
  { value: "green", label: "Green", hsl: "142 71% 45%" },
  { value: "pink", label: "Pink", hsl: "330 81% 60%" },
  { value: "purple", label: "Purple", hsl: "262 83% 58%" },
  { value: "orange", label: "Orange", hsl: "24 95% 53%" },
  { value: "cyan", label: "Cyan", hsl: "174 72% 46%" },
  { value: "red", label: "Red", hsl: "0 84% 60%" },
];

export default function AccountPage() {
  const { user, updateUser } = useAuth();
  const { currentTheme, setTheme } = useTheme();
  const { toast } = useToast();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: user?.fullName || "", nickname: user?.nickname || "", email: user?.email || "" });
  const [studyForm, setStudyForm] = useState({ level: user?.level || "", branch: user?.branch || "" });
  const [savingStudy, setSavingStudy] = useState(false);
  const [selectedFont, setSelectedFont] = useState(localStorage.getItem("uno-font") || "default");
  const [selectedBubble, setSelectedBubble] = useState(localStorage.getItem("uno-bubble") || "primary");

  const handleSave = async () => {
    updateUser(form);
    if (user?.id) await supabase.from("profiles").update({ full_name: form.fullName, nickname: form.nickname, email: form.email }).eq("user_id", user.id);
    setEditing(false);
    toast({ title: t("auth.profileUpdated") });
  };

  const handleSaveStudy = async () => {
    if (!user?.id || !studyForm.level) return;
    const meta = getLevelMeta(studyForm.level);
    if (meta?.branchRequired && !studyForm.branch) {
      toast({ title: "اختر الشعبة", variant: "destructive" }); return;
    }
    setSavingStudy(true);
    const branch = meta?.branchRequired ? studyForm.branch : null;
    const { error } = await supabase.from("profiles").update({ level: studyForm.level, branch }).eq("user_id", user.id);
    setSavingStudy(false);
    if (error) { toast({ title: "فشل الحفظ", description: error.message, variant: "destructive" }); return; }
    updateUser({ level: studyForm.level, branch });
    toast({ title: "✓ تم تحديث المعلومات الدراسية" });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { updateUser({ photoUrl: reader.result as string }); toast({ title: t("auth.photoUpdated") }); };
    reader.readAsDataURL(file);
  };

  const handleFontChange = (val: string) => {
    setSelectedFont(val);
    localStorage.setItem("uno-font", val);
    const font = fontOptions.find((f) => f.value === val);
    if (font) document.body.style.fontFamily = font.family;
    toast({ title: t("auth.fontUpdated") });
  };

  const handleBubbleChange = (val: string) => {
    setSelectedBubble(val);
    localStorage.setItem("uno-bubble", val);
    toast({ title: t("auth.bubbleUpdated") });
  };

  const avatarUrl = user?.photoUrl || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${user?.fullName || "default"}`;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-display font-bold text-glow mb-2">{t("acc.title")}</h1>
        <p className="text-muted-foreground">{t("acc.subtitle")}</p>
      </div>

      <Card className="glass-panel overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-primary/20 via-background to-background border-b border-border relative">
          <div className="absolute -bottom-12 left-8">
            <div className="relative group">
              <img src={avatarUrl} alt="Profile" className="w-24 h-24 rounded-2xl border-2 border-primary shadow-[0_0_20px_hsl(var(--primary)/0.3)] object-cover bg-card" />
              <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 rounded-2xl bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-6 h-6 text-primary" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </div>
          </div>
        </div>
        <CardContent className="pt-16 pb-8 px-8 space-y-8">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-display font-bold text-foreground">{user?.nickname || user?.fullName}</h2>
              <span className="inline-flex items-center mt-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase border border-primary/20">
                <Shield className="w-3 h-3 mr-1.5" />{user?.role}
              </span>
            </div>
            <Button variant="outline" onClick={() => setEditing(!editing)} className="border-primary/30 text-primary hover:bg-primary/10">
              {editing ? t("acc.cancel") : t("acc.editProfile")}
            </Button>
          </div>
          {editing ? (
            <div className="space-y-4 pt-4">
              <div className="space-y-2"><Label>{t("acc.fullName")}</Label><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="bg-background/40" /></div>
              <div className="space-y-2"><Label>{t("acc.nickname")}</Label><Input value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} className="bg-background/40" /></div>
              <div className="space-y-2"><Label>{t("acc.email")}</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-background/40" /></div>
              <Button onClick={handleSave} className="bg-primary text-primary-foreground font-bold"><Save className="w-4 h-4 mr-2" /> {t("acc.save")}</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="p-4 bg-background/30 rounded-xl border border-border flex items-center gap-4">
                <div className="p-3 bg-secondary rounded-lg text-muted-foreground"><Mail className="w-5 h-5" /></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider">{t("acc.email")}</p><p className="font-medium text-foreground">{user?.email}</p></div>
              </div>
              <div className="p-4 bg-background/30 rounded-xl border border-border flex items-center gap-4">
                <div className="p-3 bg-secondary rounded-lg text-primary"><KeyRound className="w-5 h-5" /></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider">{t("acc.serial")}</p><p className="font-mono font-bold text-primary tracking-widest text-lg">{user?.serialNumber || "N/A"}</p></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader><CardTitle className="font-display flex items-center gap-2"><GraduationCap className="w-5 h-5 text-primary" />المعلومات الدراسية</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">حدّث مستواك وشعبتك لرؤية المحتوى المخصّص لك.</p>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>المستوى الدراسي</Label>
              <Select value={studyForm.level} onValueChange={(v) => setStudyForm({ level: v, branch: "" })}>
                <SelectTrigger className="bg-background/40"><SelectValue placeholder="اختر..." /></SelectTrigger>
                <SelectContent>{LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.icon} {l.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {getLevelMeta(studyForm.level)?.branchRequired && (
              <div className="space-y-2">
                <Label>الشعبة</Label>
                <Select value={studyForm.branch} onValueChange={(v) => setStudyForm({ ...studyForm, branch: v })}>
                  <SelectTrigger className="bg-background/40"><SelectValue placeholder="اختر..." /></SelectTrigger>
                  <SelectContent>{SECONDARY_BRANCHES.filter((b) => b.value !== "common").map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>
          <Button onClick={handleSaveStudy} disabled={savingStudy} className="bg-primary text-primary-foreground font-bold gap-2">
            <Save className="w-4 h-4" /> حفظ التغييرات
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader><CardTitle className="font-display flex items-center gap-2"><Palette className="w-5 h-5 text-primary" />{t("acc.theme")}</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm mb-4">{t("acc.themeDesc")}</p>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {themePresets.map((preset) => (
              <button key={preset.label} onClick={() => setTheme(preset.primary)} className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${currentTheme === preset.primary ? "border-foreground bg-secondary scale-105 shadow-lg" : "border-border hover:border-foreground/30 hover:bg-secondary/50"}`}>
                <div className="w-8 h-8 rounded-full shadow-md" style={{ backgroundColor: `hsl(${preset.primary})` }} />
                <span className="text-xs text-muted-foreground">{preset.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader><CardTitle className="font-display flex items-center gap-2"><Type className="w-5 h-5 text-primary" />{t("acc.fontStyle")}</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm mb-4">{t("acc.fontStyleDesc")}</p>
          <Select value={selectedFont} onValueChange={handleFontChange}>
            <SelectTrigger className="bg-background/40"><SelectValue /></SelectTrigger>
            <SelectContent>{fontOptions.map((f) => (<SelectItem key={f.value} value={f.value}><span style={{ fontFamily: f.family }}>{f.label}</span></SelectItem>))}</SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader><CardTitle className="font-display flex items-center gap-2"><MessageCircle className="w-5 h-5 text-primary" />{t("acc.bubbleColor")}</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm mb-4">{t("acc.bubbleDesc")}</p>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {bubbleColors.map((bc) => (
              <button key={bc.value} onClick={() => handleBubbleChange(bc.value)} className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${selectedBubble === bc.value ? "border-foreground bg-secondary scale-105 shadow-lg" : "border-border hover:border-foreground/30 hover:bg-secondary/50"}`}>
                <div className="w-8 h-8 rounded-full shadow-md" style={{ backgroundColor: `hsl(${bc.hsl})` }} />
                <span className="text-xs text-muted-foreground">{bc.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
