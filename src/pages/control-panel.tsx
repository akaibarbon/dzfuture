import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, Megaphone, Users, Trash2, Plus, Lock, BadgeCheck, CheckCircle, XCircle, UserCheck, GraduationCap, UserPlus, Copy, Loader2, Download, ImageDown } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LEVELS, SECONDARY_BRANCHES, getLevelMeta, levelLabel } from "@/lib/levels";
import { adminCreateAccount } from "@/lib/admin-users.functions";
import { downloadSerialAsImage } from "@/lib/serial-image";

const ADMIN_SERIAL = "EJ76";
const ADMIN_EMAIL = "boukaachey@gmail.com";
const ADMIN_PASSWORD = "younes2011,";

interface Announcement { id: string; title: string; description: string; date: string; }
interface Group { id: string; name: string; is_verified: boolean; created_by: string | null; }
interface Profile { id: string; user_id: string | null; full_name: string; email: string; role: string; serial_number: string; photo_url: string | null; level: string | null; branch: string | null; approved?: boolean; }
interface JoinRequest { id: string; group_id: string; user_id: string; full_name: string; surname: string; date_of_birth: string; class: string; status: string; created_at: string; }

export default function ControlPanelPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);

  // Create-account form
  const [acctForm, setAcctForm] = useState<{ fullName: string; role: "student" | "tutor"; level: string; branch: string; levels: string[]; email: string }>({ fullName: "", role: "student", level: "", branch: "", levels: [], email: "" });
  const [acctBusy, setAcctBusy] = useState(false);
  const [createdSerial, setCreatedSerial] = useState<{ serial: string; name: string } | null>(null);

  // Create-group form
  const [grpForm, setGrpForm] = useState({ name: "", level: "", description: "", isPrivate: false, password: "", tutorsOnly: false });
  const [grpBusy, setGrpBusy] = useState(false);

  const isSuperAdmin = user?.serialNumber?.toUpperCase() === ADMIN_SERIAL || user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const isApprovedTutor = user?.role === "tutor" && user?.approved !== false;
  const isAuthorized = isSuperAdmin || isApprovedTutor;
  // Approved tutors bypass the password gate
  useEffect(() => { if (isApprovedTutor && !authenticated) setAuthenticated(true); }, [isApprovedTutor]);

  const fetchData = async () => {
    const [annRes, grpRes, profRes, reqRes] = await Promise.all([
      supabase.from("announcements").select("*").order("created_at", { ascending: false }),
      supabase.from("groups").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("group_join_requests").select("*").order("created_at", { ascending: false }),
    ]);
    if (annRes.data) setAnnouncements(annRes.data as Announcement[]);
    if (grpRes.data) setGroups(grpRes.data as Group[]);
    if (profRes.data) setProfiles(profRes.data as Profile[]);
    if (reqRes.data) setJoinRequests(reqRes.data as JoinRequest[]);
  };

  useEffect(() => { if (authenticated) fetchData(); }, [authenticated]);

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="glass-panel max-w-md w-full text-center p-8">
          <ShieldAlert className="w-16 h-16 mx-auto text-destructive mb-4" />
          <h2 className="text-2xl font-display font-bold mb-2">{t("accessDenied")}</h2>
          <p className="text-muted-foreground">{t("accessDeniedDesc")}</p>
        </Card>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Card className="glass-panel max-w-md w-full p-8">
            <div className="text-center mb-6">
              <Lock className="w-12 h-12 mx-auto text-primary mb-3" />
              <h2 className="text-2xl font-display font-bold text-glow">{t("cp.title")}</h2>
              <p className="text-muted-foreground text-sm mt-1">{t("enterPassword")}</p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if (password === ADMIN_PASSWORD) setAuthenticated(true); else toast({ title: t("cp.wrongPassword"), variant: "destructive" }); }} className="space-y-4">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-12 bg-background/40" />
              <Button type="submit" className="w-full h-12 font-bold">{t("Unlock")}</Button>
            </form>
          </Card>
        </motion.div>
      </div>
    );
  }

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;
    const { error } = await supabase.from("announcements").insert({ title: newTitle, description: newDesc, date: new Date().toISOString().split("T")[0] });
    if (!error) { setNewTitle(""); setNewDesc(""); toast({ title: t("cp.published") }); fetchData(); }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    await supabase.from("announcements").delete().eq("id", id);
    toast({ title: t("cp.removed") });
    fetchData();
  };

  const handleToggleVerified = async (group: Group) => {
    await supabase.from("groups").update({ is_verified: !group.is_verified }).eq("id", group.id);
    toast({ title: group.is_verified ? t("cp.badgeRemoved") : t("cp.badgeAdded") });
    fetchData();
  };

  const handleApproveRequest = async (req: JoinRequest) => {
    await supabase.from("group_join_requests").update({ status: "approved" }).eq("id", req.id);
    // Send notification to user
    await supabase.from("notifications").insert({
      user_id: req.user_id,
      type: "join_approved",
      title: t("cp.requestApproved"),
      body: `${t("cp.forGroup")}: ${getGroupName(req.group_id)}`,
      related_id: req.group_id,
    });
    toast({ title: t("cp.requestApproved") });
    fetchData();
  };

  const handleRejectRequest = async (req: JoinRequest) => {
    await supabase.from("group_join_requests").update({ status: "rejected" }).eq("id", req.id);
    // Send notification to user
    await supabase.from("notifications").insert({
      user_id: req.user_id,
      type: "join_rejected",
      title: t("cp.requestRejected"),
      body: `${t("cp.forGroup")}: ${getGroupName(req.group_id)}`,
      related_id: req.group_id,
    });
    toast({ title: t("cp.requestRejected") });
    fetchData();
  };

  const handleDeleteGroup = async (g: Group) => {
    if (!confirm(`حذف المجموعة "${g.name}" نهائياً؟ سيتم حذف جميع الرسائل والإعلانات المرتبطة.`)) return;
    // delete dependents first to avoid FK errors
    await supabase.from("messages").delete().eq("group_id", g.id);
    await supabase.from("group_announcements").delete().eq("group_id", g.id);
    await supabase.from("group_join_requests").delete().eq("group_id", g.id);
    await supabase.from("daily_schedules").delete().eq("group_id", g.id);
    const { error } = await supabase.from("groups").delete().eq("id", g.id);
    if (error) { toast({ title: "فشل الحذف", description: error.message, variant: "destructive" }); return; }
    toast({ title: "✓ تم حذف المجموعة" });
    fetchData();
  };

  const handleUpdateProfile = async (p: Profile, patch: Partial<Profile>) => {
    const meta = getLevelMeta(patch.level ?? p.level);
    const branch = meta?.branchRequired ? (patch.branch ?? p.branch) : null;
    const payload: any = { ...patch };
    if (patch.level !== undefined) payload.branch = branch;
    const { error } = await supabase.from("profiles").update(payload).eq("id", p.id);
    if (error) { toast({ title: "فشل الحفظ", description: error.message, variant: "destructive" }); return; }
    if (patch.approved === true && p.user_id) {
      await supabase.from("notifications").insert({ user_id: p.user_id, type: "tutor_approved", title: "✓ تمت الموافقة على حسابك كأستاذ", body: "يمكنك الآن نشر الدروس واستخدام المصحّح الآلي." });
    }
    toast({ title: "✓ تم التحديث" });
    fetchData();
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acctForm.fullName.trim()) return;
    setAcctBusy(true);
    try {
      const res = await adminCreateAccount({ data: {
        fullName: acctForm.fullName.trim(),
        role: acctForm.role,
        level: acctForm.role === "student" ? acctForm.level : null,
        branch: acctForm.role === "student" ? acctForm.branch : null,
        levels: acctForm.role === "tutor" ? acctForm.levels : [],
        email: acctForm.email.trim() || null,
      }});
      setCreatedSerial({ serial: res.serial, name: res.fullName });
      setAcctForm({ fullName: "", role: "student", level: "", branch: "", levels: [], email: "" });
      toast({ title: "✓ تم إنشاء الحساب", description: `الرقم التسلسلي: ${res.serial}` });
      fetchData();
    } catch (err: any) {
      toast({ title: "فشل الإنشاء", description: err.message, variant: "destructive" });
    } finally {
      setAcctBusy(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grpForm.name.trim()) return;
    setGrpBusy(true);
    const { error } = await supabase.from("groups").insert({
      name: grpForm.name.trim(),
      description: grpForm.description || null,
      level: grpForm.level || null,
      is_private: grpForm.isPrivate,
      password: grpForm.isPrivate ? grpForm.password : null,
      tutors_only: grpForm.tutorsOnly,
      created_by: user?.id || null,
    } as any);
    setGrpBusy(false);
    if (error) { toast({ title: "فشل الإنشاء", description: error.message, variant: "destructive" }); return; }
    toast({ title: "✓ تم إنشاء المجموعة" });
    setGrpForm({ name: "", level: "", description: "", isPrivate: false, password: "", tutorsOnly: false });
    fetchData();
  };

  const pendingRequests = joinRequests.filter((r) => r.status === "pending");
  const pendingTutors = profiles.filter((p) => p.role === "tutor" && p.approved === false);
  const getGroupName = (gid: string) => groups.find((g) => g.id === gid)?.name || "—";

  return (
    <div className="space-y-8 max-w-4xl mx-auto" dir="rtl">
      <div className="text-center">
        <h1 className="text-4xl font-display font-bold text-glow mb-2">{t("cp.title")}</h1>
        <p className="text-muted-foreground">{t("cp.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="glass-panel text-center p-4">
          <Users className="w-7 h-7 mx-auto text-primary mb-1.5" />
          <p className="text-2xl font-bold font-mono text-primary">{profiles.length}</p>
          <p className="text-[11px] text-muted-foreground">{t("cp.users")}</p>
        </Card>
        <Card className="glass-panel text-center p-4">
          <Megaphone className="w-7 h-7 mx-auto text-primary mb-1.5" />
          <p className="text-2xl font-bold font-mono text-primary">{announcements.length}</p>
          <p className="text-[11px] text-muted-foreground">{t("cp.announcements")}</p>
        </Card>
        <Card className="glass-panel text-center p-4">
          <Users className="w-7 h-7 mx-auto text-primary mb-1.5" />
          <p className="text-2xl font-bold font-mono text-primary">{groups.length}</p>
          <p className="text-[11px] text-muted-foreground">{t("cp.groups")}</p>
        </Card>
        <Card className="glass-panel text-center p-4">
          <UserCheck className="w-7 h-7 mx-auto text-amber-400 mb-1.5" />
          <p className="text-2xl font-bold font-mono text-amber-400">{pendingRequests.length + pendingTutors.length}</p>
          <p className="text-[11px] text-muted-foreground">قيد الانتظار</p>
        </Card>
      </div>

      {/* Quick navigation */}
      <nav className="sticky top-0 z-10 -mx-3 px-3 py-2 bg-background/80 backdrop-blur-md border-y border-border/40 overflow-x-auto">
        <ul className="flex items-center gap-2 text-xs whitespace-nowrap">
          {[
            { id: "sec-newaccount", label: "+ حساب", icon: UserPlus },
            { id: "sec-newgroup", label: "+ مجموعة", icon: Plus },
            { id: "sec-announce", label: "إعلانات", icon: Megaphone },
            { id: "sec-groups", label: "المجموعات", icon: Users },
            { id: "sec-requests", label: `طلبات (${pendingRequests.length})`, icon: UserCheck },
            { id: "sec-users", label: "المستخدمون", icon: Users },
          ].map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/50 hover:bg-primary/20 hover:text-primary transition">
                <s.icon className="w-3.5 h-3.5" />{s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* SECTION: Create account */}
      <section id="sec-newaccount" className="space-y-3 scroll-mt-20">
        <h2 className="text-xl font-bold flex items-center gap-2 border-b border-border/40 pb-2"><UserPlus className="w-5 h-5 text-primary" /> إنشاء حساب جديد</h2>
        <Card className="glass-panel">
          <CardContent className="pt-6">
            {createdSerial && (
              <div className="mb-4 p-4 rounded-xl border-2 border-green-500/50 bg-green-500/10 space-y-3">
                <p className="text-sm text-muted-foreground">تم إنشاء الحساب لـ <b>{createdSerial.name}</b>. الرقم التسلسلي للدخول:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-2xl font-mono font-bold text-green-400 bg-background/60 px-4 py-2 rounded-lg tracking-widest text-center">{createdSerial.serial}</code>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(createdSerial.serial); toast({ title: "✓ نُسخ" }); }}>
                    <Copy className="w-4 h-4 ml-1" /> نسخ
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => {
                    const txt = `CEM G.M\n\nالاسم: ${createdSerial.name}\nالرقم التسلسلي: ${createdSerial.serial}\n\nاحفظ هذا الرقم — هو مفتاح الدخول.`;
                    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a"); a.href = url; a.download = `CEMGM-Serial-${createdSerial.serial}.txt`;
                    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                  }}>
                    <Download className="w-4 h-4 ml-1" /> ملف
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => downloadSerialAsImage(createdSerial.serial, createdSerial.name)}>
                    <ImageDown className="w-4 h-4 ml-1" /> صورة
                  </Button>
                </div>
                <p className="text-xs text-amber-400">⚠ احفظ هذا الرقم — لن يظهر مرة أخرى.</p>
                <Button type="button" size="sm" variant="ghost" className="w-full" onClick={() => setCreatedSerial(null)}>إغلاق</Button>
              </div>
            )}
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="space-y-2"><Label>الاسم واللقب</Label><Input required value={acctForm.fullName} onChange={(e) => setAcctForm({ ...acctForm, fullName: e.target.value })} className="bg-background/40" placeholder="مثال: محمد بن علي" /></div>
              <div className="space-y-2"><Label>الإيميل (اختياري — لربط الدخول عبر Google)</Label><Input type="email" value={acctForm.email} onChange={(e) => setAcctForm({ ...acctForm, email: e.target.value })} className="bg-background/40" placeholder="student@gmail.com" /></div>
              <div className="space-y-2">
                <Label>الدور</Label>
                <Select value={acctForm.role} onValueChange={(v: any) => setAcctForm({ ...acctForm, role: v, level: "", branch: "", levels: [] })}>
                  <SelectTrigger className="bg-background/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">تلميذ</SelectItem>
                    <SelectItem value="tutor">أستاذ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {acctForm.role === "student" ? (
                <div className="space-y-2">
                  <Label>القسم</Label>
                  <Select value={acctForm.level} onValueChange={(v) => setAcctForm({ ...acctForm, level: v })}>
                    <SelectTrigger className="bg-background/40"><SelectValue placeholder="اختر..." /></SelectTrigger>
                    <SelectContent>{LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.icon} {l.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>الأقسام التي يدرّسها (يمكن اختيار أكثر من واحد)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {LEVELS.map((l) => {
                      const checked = acctForm.levels.includes(l.value);
                      return (
                        <label key={l.value} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${checked ? "border-primary bg-primary/10" : "border-border bg-background/40"}`}>
                          <input type="checkbox" checked={checked} onChange={(e) => {
                            const next = e.target.checked ? [...acctForm.levels, l.value] : acctForm.levels.filter((x) => x !== l.value);
                            setAcctForm({ ...acctForm, levels: next });
                          }} className="accent-primary" />
                          <span className="text-sm">{l.icon} {l.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              <Button type="submit" disabled={acctBusy} className="w-full h-11">{acctBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "إنشاء وإصدار رقم تسلسلي"}</Button>
            </form>
          </CardContent>
        </Card>
      </section>

      {/* SECTION: Create group */}
      <section id="sec-newgroup" className="space-y-3 scroll-mt-20">
        <h2 className="text-xl font-bold flex items-center gap-2 border-b border-border/40 pb-2"><Plus className="w-5 h-5 text-primary" /> إنشاء مجموعة جديدة</h2>
        <Card className="glass-panel">
          <CardContent className="pt-6">
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div className="space-y-2"><Label>اسم المجموعة</Label><Input required value={grpForm.name} onChange={(e) => setGrpForm({ ...grpForm, name: e.target.value })} placeholder="مثال: 1م1 — رياضيات" className="bg-background/40" /></div>
              <div className="space-y-2"><Label>وصف (اختياري)</Label><Input value={grpForm.description} onChange={(e) => setGrpForm({ ...grpForm, description: e.target.value })} className="bg-background/40" /></div>
              <div className="space-y-2">
                <Label>المستوى المستهدف</Label>
                <Select value={grpForm.level || "__any__"} onValueChange={(v) => setGrpForm({ ...grpForm, level: v === "__any__" ? "" : v })}>
                  <SelectTrigger className="bg-background/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any__">كل المستويات</SelectItem>
                    {LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.icon} {l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 cursor-pointer">
                <input type="checkbox" checked={grpForm.tutorsOnly} onChange={(e) => setGrpForm({ ...grpForm, tutorsOnly: e.target.checked })} className="accent-primary w-4 h-4" />
                <span className="text-sm"><GraduationCap className="w-4 h-4 inline ml-1 text-amber-400" /> مجموعة خاصة بالأساتذة فقط (لن يراها التلاميذ)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" id="cp-private" checked={grpForm.isPrivate} onChange={(e) => setGrpForm({ ...grpForm, isPrivate: e.target.checked })} className="accent-primary w-4 h-4" />
                <span className="text-sm">مجموعة خاصة (بكلمة سر)</span>
              </label>
              {grpForm.isPrivate && (
                <div className="space-y-2"><Label>كلمة السر</Label><Input required type="text" value={grpForm.password} onChange={(e) => setGrpForm({ ...grpForm, password: e.target.value })} className="bg-background/40" /></div>
              )}
              <Button type="submit" disabled={grpBusy} className="w-full h-11">{grpBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "إنشاء المجموعة"}</Button>
            </form>
          </CardContent>
        </Card>
      </section>

      {/* SECTION: Announcements */}
      <section id="sec-announce" className="space-y-3 scroll-mt-20">
        <h2 className="text-xl font-bold flex items-center gap-2 border-b border-border/40 pb-2"><Megaphone className="w-5 h-5 text-primary" /> إعلانات الموقع</h2>
        <Card className="glass-panel">
          <CardContent className="pt-6">
            <form onSubmit={handleAddAnnouncement} className="space-y-4">
              <div className="space-y-2">
                <Label>{t("cp.annTitle")}</Label>
                <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="bg-background/40" />
              </div>
              <div className="space-y-2">
                <Label>{t("cp.annDesc")}</Label>
                <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="bg-background/40 min-h-[100px]" />
              </div>
              <Button type="submit" className="w-full h-11">{t("cp.publish")}</Button>
            </form>
          </CardContent>
        </Card>
        <div className="space-y-2">
          {announcements.map((ev) => (
            <Card key={ev.id} className="glass-panel border-l-4 border-l-primary">
              <CardContent className="py-3 flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold">{ev.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{ev.description}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{ev.date}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteAnnouncement(ev.id)} className="text-destructive hover:bg-destructive/10 flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* SECTION: Manage groups */}
      <section id="sec-groups" className="space-y-3 scroll-mt-20">
        <h2 className="text-xl font-bold flex items-center gap-2 border-b border-border/40 pb-2"><Users className="w-5 h-5 text-primary" /> إدارة المجموعات</h2>
        <Card className="glass-panel">
          <CardContent className="pt-6 space-y-3">
            <p className="text-muted-foreground text-sm">{t("cp.vbadgeDesc")}</p>
            {groups.map((g) => (
              <div key={g.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold truncate">{g.name}</span>
                  {g.is_verified && <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />}
                  {(g as any).tutors_only && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">أساتذة</span>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button size="sm" variant={g.is_verified ? "default" : "outline"} onClick={() => handleToggleVerified(g)}>
                    {g.is_verified ? t("cp.removeBadge") : t("cp.addBadge")}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDeleteGroup(g)} title="حذف المجموعة">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {groups.length === 0 && <p className="text-muted-foreground text-center py-4">{t("cp.noGroups")}</p>}
          </CardContent>
        </Card>
      </section>

      {/* SECTION: Requests */}
      <section id="sec-requests" className="space-y-3 scroll-mt-20">
        <h2 className="text-xl font-bold flex items-center gap-2 border-b border-border/40 pb-2"><UserCheck className="w-5 h-5 text-amber-400" /> طلبات الانضمام</h2>
        <Card className="glass-panel">
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm mb-4">{t("cp.joinRequestsDesc")}</p>
            {joinRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">{t("cp.noRequests")}</p>
            ) : (
              <div className="space-y-3">
                {joinRequests.map((req) => (
                  <div key={req.id} className={`p-3 rounded-xl border ${req.status === "pending" ? "border-amber-500/50 bg-amber-500/5" : req.status === "approved" ? "border-green-500/50 bg-green-500/5" : "border-destructive/50 bg-destructive/5"}`}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <p className="font-bold text-foreground">{req.full_name} {req.surname}</p>
                        <p className="text-xs text-muted-foreground">{t("chat.dob")}: {req.date_of_birth} • {t("chat.class")}: {req.class}</p>
                        <p className="text-xs text-muted-foreground">{t("cp.forGroup")}: <span className="text-primary font-semibold">{getGroupName(req.group_id)}</span></p>
                        <p className={`text-xs font-bold ${req.status === "pending" ? "text-amber-400" : req.status === "approved" ? "text-green-400" : "text-destructive"}`}>
                          {req.status === "pending" ? t("cp.statusPending") : req.status === "approved" ? t("cp.statusApproved") : t("cp.statusRejected")}
                        </p>
                      </div>
                      {req.status === "pending" && (
                        <div className="flex gap-2 flex-shrink-0">
                          <Button size="sm" onClick={() => handleApproveRequest(req)} className="bg-green-600 hover:bg-green-700 text-white">
                            <CheckCircle className="w-4 h-4 mr-1" /> {t("cp.approve")}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleRejectRequest(req)}>
                            <XCircle className="w-4 h-4 mr-1" /> {t("cp.reject")}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* SECTION: Users */}
      <section id="sec-users" className="space-y-3 scroll-mt-20 pb-12">
        <h2 className="text-xl font-bold flex items-center gap-2 border-b border-border/40 pb-2"><Users className="w-5 h-5 text-primary" /> إدارة المستخدمين</h2>
        <Card className="glass-panel">
          <CardContent className="py-6 space-y-3">
            {pendingTutors.length > 0 && (
              <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-500/5 text-sm">
                ⏳ <b>{pendingTutors.length}</b> أستاذ بانتظار الموافقة. اضغط "اعتماد" أمام كل أستاذ.
              </div>
            )}
            {profiles.length === 0 ? (
              <p className="text-center text-muted-foreground">{t("cp.noUsers")}</p>
            ) : (
              profiles.map((u) => {
                const meta = getLevelMeta(u.level);
                const isPendingTutor = u.role === "tutor" && u.approved === false;
                return (
                  <div key={u.id} className={`p-4 rounded-xl bg-secondary/30 border space-y-3 ${isPendingTutor ? "border-amber-500/50" : "border-border"}`}>
                    <div className="flex items-center gap-3">
                      <img src={u.photo_url || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${u.full_name}`} alt="" className="w-10 h-10 rounded-xl" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{u.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email} • SN: {u.serial_number}</p>
                        {u.level && <p className="text-xs text-primary mt-0.5">{meta?.icon} {levelLabel(u.level, u.branch)}</p>}
                      </div>
                      {isPendingTutor && (
                        <Button size="sm" onClick={() => handleUpdateProfile(u, { approved: true })} className="bg-green-600 hover:bg-green-700 text-white flex-shrink-0">
                          <CheckCircle className="w-4 h-4 mr-1" /> اعتماد
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Select value={u.role} onValueChange={(v) => handleUpdateProfile(u, { role: v, approved: v !== "tutor" ? true : u.approved })}>
                        <SelectTrigger className="bg-background/40 h-9 text-xs"><SelectValue placeholder="الدور" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">تلميذ</SelectItem>
                          <SelectItem value="tutor">أستاذ</SelectItem>
                          <SelectItem value="parent">ولي أمر</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={u.level || ""} onValueChange={(v) => handleUpdateProfile(u, { level: v })}>
                        <SelectTrigger className="bg-background/40 h-9 text-xs"><SelectValue placeholder="المستوى" /></SelectTrigger>
                        <SelectContent>{LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.icon} {l.label}</SelectItem>)}</SelectContent>
                      </Select>
                      {meta?.branchRequired && (
                        <Select value={u.branch || ""} onValueChange={(v) => handleUpdateProfile(u, { branch: v })}>
                          <SelectTrigger className="bg-background/40 h-9 text-xs"><SelectValue placeholder="الشعبة" /></SelectTrigger>
                          <SelectContent>{SECONDARY_BRANCHES.filter((b) => b.value !== "common").map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

