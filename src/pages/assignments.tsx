import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { LEVELS, levelLabel, getLevelMeta, SECONDARY_BRANCHES } from "@/lib/levels";
import { ClipboardList, Plus, Trash2, FileText, Image as ImageIcon, Music, Video, File, Loader2, Upload, Trophy, Clock, Users, Pencil } from "lucide-react";

interface Assignment {
  id: string;
  tutor_id: string;
  tutor_name: string;
  kind: string;
  title: string;
  description: string;
  subject: string | null;
  file_url: string | null;
  file_type: string | null;
  due_at: string | null;
  target_levels: string[];
  target_branches: string[];
  target_group_id: string | null;
  created_at: string;
}

interface GroupItem { id: string; name: string }

function fileIcon(type: string | null) {
  if (!type) return <File className="w-4 h-4" />;
  if (type.startsWith("image")) return <ImageIcon className="w-4 h-4" />;
  if (type.startsWith("video")) return <Video className="w-4 h-4" />;
  if (type.startsWith("audio")) return <Music className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
}

function timeLeft(due: string | null) {
  if (!due) return null;
  const ms = new Date(due).getTime() - Date.now();
  if (ms < 0) return { txt: "انتهى الأجل", over: true };
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days > 0) return { txt: `${days}ي ${hours}س متبقية`, over: false };
  const mins = Math.floor((ms % 3600000) / 60000);
  return { txt: `${hours}س ${mins}د متبقية`, over: false };
}

export default function AssignmentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const isApprovedTutor = user?.role === "tutor" && user?.approved !== false;

  const [items, setItems] = useState<Assignment[]>([]);
  const [tab, setTab] = useState<"homework" | "challenge">("homework");
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [keepExistingFile, setKeepExistingFile] = useState(true);
  const [form, setForm] = useState({
    kind: "homework" as "homework" | "challenge",
    title: "",
    description: "",
    subject: "",
    due_at: "",
    target_levels: [] as string[],
    target_branches: [] as string[],
    target_group_id: "__none__",
  });

  const load = async () => {
    const { data } = await supabase.from("assignments").select("*").order("created_at", { ascending: false });
    if (data) setItems(data as Assignment[]);
  };

  const loadGroups = async () => {
    if (!user?.id) return;
    const { data } = await supabase.from("groups").select("id, name").eq("created_by", user.id);
    if (data) setGroups(data as GroupItem[]);
  };

  useEffect(() => { load(); loadGroups(); }, [user?.id]);

  const filtered = useMemo(() => {
    let list = items.filter((a) => a.kind === tab);
    // Students see only what targets them (or open ones)
    if (!isApprovedTutor && user) {
      list = list.filter((a) => {
        if (a.target_levels.length === 0) return true;
        if (!user.level || !a.target_levels.includes(user.level)) return false;
        if (a.target_branches.length > 0 && user.branch && !a.target_branches.includes(user.branch)) return false;
        return true;
      });
    }
    return list;
  }, [items, tab, isApprovedTutor, user]);

  const toggleLevel = (lv: string) => {
    setForm((f) => ({
      ...f,
      target_levels: f.target_levels.includes(lv) ? f.target_levels.filter((x) => x !== lv) : [...f.target_levels, lv],
    }));
  };
  const toggleBranch = (b: string) => {
    setForm((f) => ({
      ...f,
      target_branches: f.target_branches.includes(b) ? f.target_branches.filter((x) => x !== b) : [...f.target_branches, b],
    }));
  };

  const resetForm = () => {
    setForm({ kind: tab, title: "", description: "", subject: "", due_at: "", target_levels: [], target_branches: [], target_group_id: "__none__" });
    setFile(null);
    setEditingId(null);
    setKeepExistingFile(true);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (a: Assignment) => {
    setEditingId(a.id);
    setForm({
      kind: (a.kind as "homework" | "challenge") || "homework",
      title: a.title,
      description: a.description || "",
      subject: a.subject || "",
      due_at: a.due_at ? new Date(a.due_at).toISOString().slice(0, 16) : "",
      target_levels: a.target_levels || [],
      target_branches: a.target_branches || [],
      target_group_id: a.target_group_id || "__none__",
    });
    setFile(null);
    setKeepExistingFile(!!a.file_url);
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !form.title.trim()) return;
    setUploading(true);
    const existing = editingId ? items.find((i) => i.id === editingId) : null;
    let fileUrl: string | null = existing && keepExistingFile ? existing.file_url : null;
    let fileType: string | null = existing && keepExistingFile ? existing.file_type : null;
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast({ title: "الملف كبير جداً", description: "الحد 50MB", variant: "destructive" });
        setUploading(false); return;
      }
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("lessons").upload(path, file);
      if (upErr) { toast({ title: "فشل الرفع", description: upErr.message, variant: "destructive" }); setUploading(false); return; }
      fileUrl = supabase.storage.from("lessons").getPublicUrl(path).data.publicUrl;
      fileType = file.type;
    }
    const payload = {
      tutor_id: user.id,
      tutor_name: user.fullName,
      kind: form.kind,
      title: form.title.trim(),
      description: form.description.trim(),
      subject: form.subject || null,
      file_url: fileUrl,
      file_type: fileType,
      due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
      target_levels: form.target_levels,
      target_branches: form.target_branches,
      target_group_id: form.target_group_id !== "__none__" ? form.target_group_id : null,
    };
    const { error } = editingId
      ? await supabase.from("assignments").update(payload).eq("id", editingId)
      : await supabase.from("assignments").insert(payload);
    setUploading(false);
    if (error) { toast({ title: editingId ? "فشل التعديل" : "فشل النشر", description: error.message, variant: "destructive" }); return; }
    toast({ title: editingId ? "✓ تم التحديث" : "✓ تم النشر", description: "تم تحديث إشعارات التلاميذ والمجموعة." });
    resetForm();
    setOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد الحذف؟ سيتم إزالة الإشعارات المرتبطة.")) return;
    await supabase.from("assignments").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-glow mb-2 flex items-center gap-2">
            <ClipboardList className="w-8 h-8 text-primary" /> الواجبات والتحديات
          </h1>
          <p className="text-muted-foreground">واجبات وتحديات من أساتذتك مع آخر أجل وإشعارات فورية.</p>
        </div>
        {isApprovedTutor && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="bg-primary text-primary-foreground font-bold">
                <Plus className="w-5 h-5 mr-2" /> نشر جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-panel sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-display text-2xl text-primary">{editingId ? "تعديل" : "نشر"} واجب أو تحدي</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant={form.kind === "homework" ? "default" : "outline"} onClick={() => setForm({ ...form, kind: "homework" })} className={form.kind === "homework" ? "bg-primary" : ""}>
                    <ClipboardList className="w-4 h-4 mr-2" /> واجب
                  </Button>
                  <Button type="button" variant={form.kind === "challenge" ? "default" : "outline"} onClick={() => setForm({ ...form, kind: "challenge" })} className={form.kind === "challenge" ? "bg-primary" : ""}>
                    <Trophy className="w-4 h-4 mr-2" /> تحدي
                  </Button>
                </div>
                <div className="space-y-2"><Label>العنوان</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-background/40" /></div>
                <div className="space-y-2"><Label>التفاصيل / النص</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-background/40 min-h-[100px]" placeholder="اكتب نص الواجب أو وصف التحدي..." /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>المادة (اختياري)</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="bg-background/40" /></div>
                  <div className="space-y-2"><Label className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> آخر أجل</Label><Input type="datetime-local" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} className="bg-background/40" /></div>
                </div>
                <div className="space-y-2">
                  <Label>الأقسام المستهدفة (اتركها فارغة = الكل)</Label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto p-2 rounded-lg border border-border bg-background/30">
                    {LEVELS.map((l) => (
                      <label key={l.value} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={form.target_levels.includes(l.value)} onCheckedChange={() => toggleLevel(l.value)} />
                        <span>{l.icon} {l.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>الشُّعب (للثانوي)</Label>
                  <div className="flex flex-wrap gap-2">
                    {SECONDARY_BRANCHES.filter((b) => b.value !== "common").map((b) => (
                      <label key={b.value} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border border-border cursor-pointer">
                        <Checkbox checked={form.target_branches.includes(b.value)} onCheckedChange={() => toggleBranch(b.value)} />
                        <span>{b.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {groups.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> نشر داخل مجموعة (اختياري)</Label>
                    <Select value={form.target_group_id} onValueChange={(v) => setForm({ ...form, target_group_id: v })}>
                      <SelectTrigger className="bg-background/40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— بدون —</SelectItem>
                        {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>إرفاق ملف أو صورة (اختياري — حتى 50MB)</Label>
                  <input ref={fileRef} type="file" onChange={(e) => { setFile(e.target.files?.[0] || null); setKeepExistingFile(false); }} className="hidden" accept="image/*,video/*,audio/*,.pdf,.txt,.doc,.docx,.ppt,.pptx" />
                  <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="w-full justify-start">
                    <Upload className="w-4 h-4 mr-2" />{file ? file.name : (editingId && keepExistingFile ? "إبقاء الملف الحالي" : "اختر ملفاً...")}
                  </Button>
                  {editingId && keepExistingFile && !file && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setKeepExistingFile(false)} className="text-xs text-destructive">إزالة الملف الحالي</Button>
                  )}
                </div>
                <Button type="submit" disabled={uploading} className="w-full bg-primary font-bold h-11">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? "حفظ التعديلات" : "نشر")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={tab === "homework" ? "default" : "outline"} onClick={() => setTab("homework")} className={tab === "homework" ? "bg-primary text-primary-foreground" : ""}>
          <ClipboardList className="w-4 h-4 mr-2" /> الواجبات
        </Button>
        <Button variant={tab === "challenge" ? "default" : "outline"} onClick={() => setTab("challenge")} className={tab === "challenge" ? "bg-primary text-primary-foreground" : ""}>
          <Trophy className="w-4 h-4 mr-2" /> التحديات
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground py-12">
            {tab === "homework" ? "لا توجد واجبات حالياً." : "لا توجد تحديات حالياً."}
          </p>
        ) : filtered.map((a) => {
          const isOwner = a.tutor_id === user?.id;
          const tl = timeLeft(a.due_at);
          const isChallenge = a.kind === "challenge";
          return (
            <Card key={a.id} className={`glass-panel flex flex-col hover:border-primary/40 transition-colors ${isChallenge ? "border-amber-500/30" : ""}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isChallenge ? <Trophy className="w-5 h-5 text-amber-500 flex-shrink-0" /> : <ClipboardList className="w-5 h-5 text-primary flex-shrink-0" />}
                    <CardTitle className="text-lg font-display line-clamp-2">{a.title}</CardTitle>
                  </div>
                  {isOwner && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(a)} className="h-7 w-7 text-primary"><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(a.id)} className="h-7 w-7 text-destructive"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{a.tutor_name} • {new Date(a.created_at).toLocaleDateString("ar-DZ")}</p>
              </CardHeader>
              <CardContent className="flex-1 space-y-2">
                {a.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-5">{a.description}</p>}
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {a.subject && <span className="px-2 py-0.5 rounded-full bg-secondary border border-border">{a.subject}</span>}
                  {a.target_levels.map((lv) => {
                    const meta = getLevelMeta(lv);
                    return (
                      <span key={lv} className="px-2 py-0.5 rounded-full" style={{ backgroundColor: `hsl(${meta?.color || "var(--primary)"} / 0.15)`, color: `hsl(${meta?.color || "var(--primary)"})`, border: `1px solid hsl(${meta?.color || "var(--primary)"} / 0.3)` }}>
                        {meta?.icon} {levelLabel(lv, null)}
                      </span>
                    );
                  })}
                </div>
                {tl && (
                  <div className={`flex items-center gap-1.5 text-xs font-bold ${tl.over ? "text-destructive" : "text-amber-500"}`}>
                    <Clock className="w-3.5 h-3.5" /> {tl.txt}
                    {a.due_at && <span className="text-muted-foreground font-normal">({new Date(a.due_at).toLocaleString("ar-DZ", { dateStyle: "short", timeStyle: "short" })})</span>}
                  </div>
                )}
              </CardContent>
              {a.file_url && (
                <CardFooter>
                  <a href={a.file_url} target="_blank" rel="noopener noreferrer" className="w-full">
                    <Button variant="outline" className="w-full gap-2">{fileIcon(a.file_type)} فتح المرفق</Button>
                  </a>
                </CardFooter>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
