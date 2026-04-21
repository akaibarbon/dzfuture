import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, Megaphone, Users, Trash2, Plus, Lock, BadgeCheck, CheckCircle, XCircle, UserCheck, GraduationCap, Save } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LEVELS, SECONDARY_BRANCHES, getLevelMeta, levelLabel } from "@/lib/levels";

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

  const isAuthorized = user?.serialNumber?.toUpperCase() === ADMIN_SERIAL || user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

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

  const pendingRequests = joinRequests.filter((r) => r.status === "pending");
  const pendingTutors = profiles.filter((p) => p.role === "tutor" && p.approved === false);
  const getGroupName = (gid: string) => groups.find((g) => g.id === gid)?.name || "—";

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="text-center">
        <h1 className="text-4xl font-display font-bold text-glow mb-2">{t("cp.title")}</h1>
        <p className="text-muted-foreground">{t("cp.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="glass-panel text-center p-6">
          <Users className="w-8 h-8 mx-auto text-primary mb-2" />
          <p className="text-3xl font-bold font-mono text-primary">{profiles.length}</p>
          <p className="text-xs text-muted-foreground">{t("cp.users")}</p>
        </Card>
        <Card className="glass-panel text-center p-6">
          <Megaphone className="w-8 h-8 mx-auto text-primary mb-2" />
          <p className="text-3xl font-bold font-mono text-primary">{announcements.length}</p>
          <p className="text-xs text-muted-foreground">{t("cp.announcements")}</p>
        </Card>
        <Card className="glass-panel text-center p-6">
          <Users className="w-8 h-8 mx-auto text-primary mb-2" />
          <p className="text-3xl font-bold font-mono text-primary">{groups.length}</p>
          <p className="text-xs text-muted-foreground">{t("cp.groups")}</p>
        </Card>
        <Card className="glass-panel text-center p-6">
          <UserCheck className="w-8 h-8 mx-auto text-amber-400 mb-2" />
          <p className="text-3xl font-bold font-mono text-amber-400">{pendingRequests.length}</p>
          <p className="text-xs text-muted-foreground">{t("cp.pendingRequests")}</p>
        </Card>
      </div>

      <Tabs defaultValue="announce" className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="announce">{t("cp.announcements")}</TabsTrigger>
          <TabsTrigger value="vbadge">{t("cp.vbadge")}</TabsTrigger>
          <TabsTrigger value="requests" className="relative">
            {t("cp.requests")}
            {pendingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{pendingRequests.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="users">{t("cp.users")}</TabsTrigger>
        </TabsList>

        <TabsContent value="announce" className="space-y-6 mt-6">
          <Card className="glass-panel">
            <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> {t("cp.newAnn")}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleAddAnnouncement} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("cp.annTitle")}</Label>
                  <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="bg-background/40" />
                </div>
                <div className="space-y-2">
                  <Label>{t("cp.annDesc")}</Label>
                  <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="bg-background/40 min-h-[120px]" />
                </div>
                <Button type="submit" className="w-full">{t("cp.publish")}</Button>
              </form>
            </CardContent>
          </Card>
          <div className="space-y-3">
            {announcements.map((ev) => (
              <Card key={ev.id} className="glass-panel border-l-4 border-l-primary">
                <CardContent className="py-4 flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{ev.title}</h3>
                    <p className="text-sm text-muted-foreground">{ev.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{ev.date}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteAnnouncement(ev.id)} className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="vbadge" className="mt-6">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BadgeCheck className="w-5 h-5 text-primary" /> {t("cp.vbadge")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm mb-4">{t("cp.vbadgeDesc")}</p>
              <div className="space-y-3">
                {groups.map((g) => (
                  <div key={g.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{g.name}</span>
                      {g.is_verified && <BadgeCheck className="w-4 h-4 text-primary" />}
                    </div>
                    <Button size="sm" variant={g.is_verified ? "default" : "outline"} onClick={() => handleToggleVerified(g)}>
                      {g.is_verified ? t("cp.removeBadge") : t("cp.addBadge")}
                    </Button>
                  </div>
                ))}
                {groups.length === 0 && <p className="text-muted-foreground text-center py-4">{t("cp.noGroups")}</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="mt-6">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserCheck className="w-5 h-5 text-amber-400" /> {t("cp.joinRequests")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm mb-4">{t("cp.joinRequestsDesc")}</p>
              {joinRequests.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">{t("cp.noRequests")}</p>
              ) : (
                <div className="space-y-4">
                  {joinRequests.map((req) => (
                    <div key={req.id} className={`p-4 rounded-xl border ${req.status === "pending" ? "border-amber-500/50 bg-amber-500/5" : req.status === "approved" ? "border-green-500/50 bg-green-500/5" : "border-destructive/50 bg-destructive/5"}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <p className="font-bold text-foreground">{req.full_name} {req.surname}</p>
                          <p className="text-sm text-muted-foreground">{t("chat.dob")}: {req.date_of_birth}</p>
                          <p className="text-sm text-muted-foreground">{t("chat.class")}: {req.class}</p>
                          <p className="text-xs text-muted-foreground">{t("cp.forGroup")}: <span className="text-primary font-semibold">{getGroupName(req.group_id)}</span></p>
                          <p className={`text-xs font-bold mt-1 ${req.status === "pending" ? "text-amber-400" : req.status === "approved" ? "text-green-400" : "text-destructive"}`}>
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
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <Card className="glass-panel">
            <CardContent className="py-6">
              {profiles.length === 0 ? (
                <p className="text-center text-muted-foreground">{t("cp.noUsers")}</p>
              ) : (
                <div className="space-y-3">
                  {profiles.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border">
                      <div className="flex items-center gap-3">
                        <img src={u.photo_url || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${u.full_name}`} alt="" className="w-10 h-10 rounded-xl" />
                        <div>
                          <p className="font-bold">{u.full_name}</p>
                          <p className="text-xs text-muted-foreground">{u.email} • {u.role} • SN: {u.serial_number}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
