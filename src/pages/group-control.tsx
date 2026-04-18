import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Settings,
  Users,
  Megaphone,
  Image as ImageIcon,
  Trash2,
  Check,
  X,
  Loader2,
  Crown,
} from "lucide-react";

interface Group {
  id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  password: string | null;
  background_url: string | null;
  serial_number: string | null;
  created_by: string | null;
  is_verified: boolean;
}

interface JoinRequest {
  id: string;
  user_id: string;
  full_name: string;
  surname: string;
  date_of_birth: string;
  class: string;
  status: string;
  created_at: string;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

export default function GroupControlPage() {
  const { id: groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [members, setMembers] = useState<{ user_id: string; sender_name: string }[]>([]);

  // Settings form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [password, setPassword] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [bgUrl, setBgUrl] = useState("");
  const [uploadingBg, setUploadingBg] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Announcement form
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");

  useEffect(() => {
    if (!groupId || !user?.id) return;
    let active = true;

    const load = async () => {
      const { data: grp } = await supabase.from("groups").select("*").eq("id", groupId).maybeSingle();
      if (!active) return;
      if (!grp || grp.created_by !== user.id) {
        toast({ title: t("gc.notOwner") || "غير مصرح", description: t("gc.notOwnerDesc") || "أنت لست مالك هذه المجموعة", variant: "destructive" });
        navigate(`/group/${groupId}`);
        return;
      }
      setGroup(grp as Group);
      setName(grp.name);
      setDescription(grp.description || "");
      setPassword(grp.password || "");
      setIsPrivate(grp.is_private);
      setBgUrl(grp.background_url || "");
      setLoading(false);

      // Load requests, announcements, members
      const [reqRes, annRes, memRes] = await Promise.all([
        supabase.from("group_join_requests").select("*").eq("group_id", groupId).order("created_at", { ascending: false }),
        supabase.from("group_announcements").select("*").eq("group_id", groupId).order("created_at", { ascending: false }),
        supabase.from("messages").select("sender_id, sender_name").eq("group_id", groupId).not("sender_id", "is", null),
      ]);
      if (!active) return;
      setRequests((reqRes.data || []) as JoinRequest[]);
      setAnnouncements((annRes.data || []) as Announcement[]);
      // Unique members
      const seen = new Map<string, string>();
      (memRes.data || []).forEach((m: any) => {
        if (m.sender_id && !seen.has(m.sender_id)) seen.set(m.sender_id, m.sender_name);
      });
      setMembers([...seen.entries()].map(([user_id, sender_name]) => ({ user_id, sender_name })));
    };

    load();
  }, [groupId, user?.id]);

  const refreshRequests = async () => {
    const { data } = await supabase.from("group_join_requests").select("*").eq("group_id", groupId).order("created_at", { ascending: false });
    setRequests((data || []) as JoinRequest[]);
  };

  const handleApprove = async (id: string, userId: string) => {
    await supabase.from("group_join_requests").update({ status: "approved" }).eq("id", id);
    await supabase.from("notifications").insert({
      user_id: userId,
      title: t("gc.approvedTitle") || "تم قبول طلبك",
      body: `${t("gc.approvedBody") || "تم قبولك في مجموعة"}: ${group?.name}`,
      type: "success",
      related_id: groupId || null,
    });
    toast({ title: t("cp.requestApproved") });
    refreshRequests();
  };

  const handleReject = async (id: string, userId: string) => {
    await supabase.from("group_join_requests").update({ status: "rejected" }).eq("id", id);
    await supabase.from("notifications").insert({
      user_id: userId,
      title: t("gc.rejectedTitle") || "تم رفض طلبك",
      body: `${t("gc.rejectedBody") || "تم رفض طلب الانضمام إلى"}: ${group?.name}`,
      type: "warning",
      related_id: groupId || null,
    });
    toast({ title: t("cp.requestRejected") });
    refreshRequests();
  };

  const handleKickMember = async (userId: string, name: string) => {
    // Set their join request to rejected (effectively kicks)
    await supabase.from("group_join_requests").delete().eq("group_id", groupId).eq("user_id", userId);
    await supabase.from("notifications").insert({
      user_id: userId,
      title: t("gc.kickedTitle") || "تم إخراجك",
      body: `${t("gc.kickedBody") || "تم إخراجك من مجموعة"}: ${group?.name}`,
      type: "warning",
      related_id: groupId || null,
    });
    toast({ title: `${t("gc.kicked") || "تم الإخراج"}: ${name}` });
    setMembers((m) => m.filter((x) => x.user_id !== userId));
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    const { error } = await supabase
      .from("groups")
      .update({
        name,
        description: description || null,
        is_private: isPrivate,
        password: isPrivate ? password : null,
        background_url: bgUrl || null,
      })
      .eq("id", groupId);
    setSavingSettings(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("gc.settingsSaved") || "تم حفظ الإعدادات" });
    }
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !groupId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: t("media.tooLarge"), variant: "destructive" });
      return;
    }
    setUploadingBg(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${groupId}/bg-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("chat-media").upload(path, file);
    if (error) {
      toast({ title: t("media.uploadError"), variant: "destructive" });
    } else {
      const { data } = supabase.storage.from("chat-media").getPublicUrl(path);
      setBgUrl(data.publicUrl);
    }
    setUploadingBg(false);
  };

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim()) return;
    const { error } = await supabase.from("group_announcements").insert({
      group_id: groupId,
      title: annTitle,
      body: annBody,
      created_by: user?.id || null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setAnnTitle("");
      setAnnBody("");
      const { data } = await supabase.from("group_announcements").select("*").eq("group_id", groupId).order("created_at", { ascending: false });
      setAnnouncements((data || []) as Announcement[]);
      toast({ title: t("gc.annPublished") || "تم النشر" });
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    await supabase.from("group_announcements").delete().eq("id", id);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  const handleClearMessages = async () => {
    await supabase.from("messages").delete().eq("group_id", groupId);
    toast({ title: t("gc.messagesCleared") || "تم مسح الرسائل" });
  };

  const handleDeleteGroup = async () => {
    await supabase.from("groups").delete().eq("id", groupId);
    toast({ title: t("gc.groupDeleted") || "تم حذف المجموعة" });
    navigate("/groups");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!group) return null;

  const pendingRequests = requests.filter((r) => r.status === "pending");

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to={`/group/${groupId}`} className="text-muted-foreground hover:text-primary">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-display font-bold text-glow flex items-center gap-2">
            <Crown className="w-7 h-7 text-primary" />
            {group.name}
          </h1>
          <p className="text-xs text-muted-foreground font-mono">{group.serial_number}</p>
        </div>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-1" />{t("gc.settings") || "الإعدادات"}</TabsTrigger>
          <TabsTrigger value="requests">
            <Users className="w-4 h-4 mr-1" />{t("gc.requests") || "الطلبات"}
            {pendingRequests.length > 0 && <span className="ml-1 bg-primary text-primary-foreground text-xs rounded-full px-1.5">{pendingRequests.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="members"><Users className="w-4 h-4 mr-1" />{t("gc.members") || "الأعضاء"}</TabsTrigger>
          <TabsTrigger value="announcements"><Megaphone className="w-4 h-4 mr-1" />{t("gc.announcements") || "الإشعارات"}</TabsTrigger>
        </TabsList>

        {/* SETTINGS */}
        <TabsContent value="settings" className="space-y-4 pt-4">
          <Card className="glass-panel">
            <CardHeader><CardTitle>{t("gc.basicSettings") || "إعدادات أساسية"}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("grp.name")}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-background/40" />
              </div>
              <div className="space-y-2">
                <Label>{t("grp.descLabel") || "الوصف"}</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-background/40" rows={3} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="priv" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="accent-primary w-4 h-4" />
                <Label htmlFor="priv">{t("grp.private")}</Label>
              </div>
              {isPrivate && (
                <div className="space-y-2">
                  <Label>{t("grp.password")}</Label>
                  <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-background/40" />
                </div>
              )}
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><ImageIcon className="w-4 h-4" />{t("gc.background") || "خلفية المجموعة"}</Label>
                {bgUrl && (
                  <div className="h-32 w-full bg-cover bg-center rounded-lg border border-border" style={{ backgroundImage: `url(${bgUrl})` }} />
                )}
                <div className="flex gap-2">
                  <Input type="file" accept="image/*" onChange={handleBgUpload} disabled={uploadingBg} className="bg-background/40" />
                  {bgUrl && <Button variant="outline" type="button" onClick={() => setBgUrl("")}>{t("cp.remove")}</Button>}
                </div>
                {uploadingBg && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
              </div>
              <Button onClick={handleSaveSettings} disabled={savingSettings} className="w-full bg-primary font-bold">
                {savingSettings && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {t("gc.save") || "حفظ"}
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-panel border-destructive/40">
            <CardHeader><CardTitle className="text-destructive">{t("gc.dangerZone") || "منطقة الخطر"}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full border-destructive/40 text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4 mr-2" />{t("gc.clearAllMessages") || "مسح كل الرسائل"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("gc.confirmClear") || "تأكيد المسح"}</AlertDialogTitle>
                    <AlertDialogDescription>{t("gc.confirmClearDesc") || "سيتم حذف جميع الرسائل نهائياً."}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("cancel") || "إلغاء"}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearMessages} className="bg-destructive text-destructive-foreground">{t("confirm") || "تأكيد"}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="w-4 h-4 mr-2" />{t("gc.deleteGroup") || "حذف المجموعة"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("gc.confirmDelete") || "تأكيد الحذف"}</AlertDialogTitle>
                    <AlertDialogDescription>{t("gc.confirmDeleteDesc") || "سيتم حذف المجموعة وكل بياناتها نهائياً."}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("cancel") || "إلغاء"}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive text-destructive-foreground">{t("confirm") || "تأكيد"}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REQUESTS */}
        <TabsContent value="requests" className="space-y-3 pt-4">
          {requests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{t("cp.noRequests")}</p>
          ) : (
            requests.map((r) => (
              <Card key={r.id} className="glass-panel">
                <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-bold">{r.full_name} {r.surname}</p>
                    <p className="text-xs text-muted-foreground">{r.class} • {r.date_of_birth}</p>
                    <span className={`text-xs mt-1 inline-block px-2 py-0.5 rounded ${r.status === 'approved' ? 'bg-green-500/20 text-green-400' : r.status === 'rejected' ? 'bg-destructive/20 text-destructive' : 'bg-amber-500/20 text-amber-400'}`}>
                      {r.status === "pending" ? t("cp.statusPending") : r.status === "approved" ? t("cp.statusApproved") : t("cp.statusRejected")}
                    </span>
                  </div>
                  {r.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleApprove(r.id, r.user_id)} className="bg-green-600 hover:bg-green-700"><Check className="w-4 h-4" /></Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReject(r.id, r.user_id)}><X className="w-4 h-4" /></Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* MEMBERS */}
        <TabsContent value="members" className="space-y-3 pt-4">
          {members.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{t("gc.noMembers") || "لا يوجد أعضاء بعد"}</p>
          ) : (
            members.map((m) => (
              <Card key={m.user_id} className="glass-panel">
                <CardContent className="p-3 flex items-center justify-between">
                  <p className="font-medium">{m.sender_name}</p>
                  {m.user_id !== user?.id && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10">
                          <X className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("gc.kickConfirm") || "إخراج العضو؟"}</AlertDialogTitle>
                          <AlertDialogDescription>{m.sender_name}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("cancel") || "إلغاء"}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleKickMember(m.user_id, m.sender_name)} className="bg-destructive text-destructive-foreground">{t("gc.kick") || "إخراج"}</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ANNOUNCEMENTS */}
        <TabsContent value="announcements" className="space-y-4 pt-4">
          <Card className="glass-panel">
            <CardHeader><CardTitle>{t("gc.newAnn") || "إشعار جديد"}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleAddAnnouncement} className="space-y-3">
                <Input placeholder={t("cp.annTitle")} value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} required className="bg-background/40" />
                <Textarea placeholder={t("cp.annDesc")} value={annBody} onChange={(e) => setAnnBody(e.target.value)} rows={3} className="bg-background/40" />
                <Button type="submit" className="w-full bg-primary font-bold">{t("cp.publish")}</Button>
              </form>
            </CardContent>
          </Card>

          {announcements.map((a) => (
            <Card key={a.id} className="glass-panel">
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-bold text-primary">{a.title}</p>
                  {a.body && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.body}</p>}
                  <p className="text-xs text-muted-foreground mt-2">{new Date(a.created_at).toLocaleString()}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => handleDeleteAnnouncement(a.id)} className="text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
