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
import { useToast } from "@/hooks/use-toast";
import { LEVELS, levelLabel, subjectsForLevel, getLevelMeta, SECONDARY_BRANCHES } from "@/lib/levels";
import { BookOpenCheck, Plus, GraduationCap, Trash2, FileText, Image as ImageIcon, Music, Video, File, Heart, Star, Loader2, Upload, Filter } from "lucide-react";

interface Lesson {
  id: string;
  tutor_id: string;
  tutor_name: string;
  title: string;
  description: string;
  subject: string;
  level: string;
  branch: string | null;
  file_url: string | null;
  file_type: string | null;
  created_at: string;
}

interface Tutor {
  user_id: string;
  full_name: string;
  photo_url: string | null;
}

function fileIcon(type: string | null) {
  if (!type) return <File className="w-4 h-4" />;
  if (type.startsWith("image")) return <ImageIcon className="w-4 h-4" />;
  if (type.startsWith("video")) return <Video className="w-4 h-4" />;
  if (type.startsWith("audio")) return <Music className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
}

export default function LessonsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const isTutor = user?.role === "tutor";

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [tab, setTab] = useState<"feed" | "favorites">("feed");
  const [levelFilter, setLevelFilter] = useState<string>(user?.level || "__mine__");
  const [subjectFilter, setSubjectFilter] = useState<string>("__all__");
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", subject: "", level: user?.level || "", branch: user?.branch || "" });
  const [file, setFile] = useState<File | null>(null);

  const load = async () => {
    const { data } = await supabase.from("lessons").select("*").order("created_at", { ascending: false });
    if (data) setLessons(data as Lesson[]);
  };

  const loadFavorites = async () => {
    if (!user?.id) return;
    const { data } = await supabase.from("favorite_tutors").select("tutor_id").eq("student_id", user.id);
    if (data) setFavorites(new Set(data.map((d: any) => d.tutor_id)));
  };

  const loadTutors = async () => {
    const { data } = await supabase.from("profiles").select("user_id, full_name, photo_url").eq("role", "tutor");
    if (data) setTutors(data.filter((t: any) => t.user_id) as Tutor[]);
  };

  useEffect(() => { load(); loadFavorites(); loadTutors(); }, [user?.id]);

  const filtered = useMemo(() => {
    let list = lessons;
    if (tab === "favorites") {
      list = list.filter((l) => favorites.has(l.tutor_id));
    } else if (levelFilter === "__mine__" && user?.level) {
      list = list.filter((l) => l.level === user.level && (!l.branch || !user.branch || l.branch === user.branch));
    } else if (levelFilter !== "__all__" && levelFilter !== "__mine__") {
      list = list.filter((l) => l.level === levelFilter);
    }
    if (subjectFilter !== "__all__") list = list.filter((l) => l.subject === subjectFilter);
    return list;
  }, [lessons, favorites, tab, levelFilter, subjectFilter, user?.level, user?.branch]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !form.title || !form.subject || !form.level) return;
    const meta = getLevelMeta(form.level);
    if (meta?.branchRequired && !form.branch) {
      toast({ title: "اختر الشعبة", variant: "destructive" }); return;
    }
    setUploading(true);
    let fileUrl: string | null = null;
    let fileType: string | null = null;
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast({ title: "الملف كبير جداً", description: "الحد 50MB", variant: "destructive" });
        setUploading(false); return;
      }
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("lessons").upload(path, file);
      if (upErr) { toast({ title: "فشل الرفع", description: upErr.message, variant: "destructive" }); setUploading(false); return; }
      const { data } = supabase.storage.from("lessons").getPublicUrl(path);
      fileUrl = data.publicUrl;
      fileType = file.type;
    }
    const { error } = await supabase.from("lessons").insert({
      tutor_id: user.id, tutor_name: user.fullName,
      title: form.title, description: form.description,
      subject: form.subject, level: form.level,
      branch: meta?.branchRequired ? form.branch : null,
      file_url: fileUrl, file_type: fileType,
    });
    setUploading(false);
    if (error) { toast({ title: "فشل النشر", description: error.message, variant: "destructive" }); return; }
    toast({ title: "✓ تم نشر الدرس", description: "تم إخطار طلابك المفضلين." });
    setForm({ title: "", description: "", subject: "", level: user.level || "", branch: user.branch || "" });
    setFile(null);
    setOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذا الدرس؟")) return;
    await supabase.from("lessons").delete().eq("id", id);
    load();
  };

  const toggleFavorite = async (tutorId: string) => {
    if (!user?.id) return;
    if (favorites.has(tutorId)) {
      await supabase.from("favorite_tutors").delete().eq("student_id", user.id).eq("tutor_id", tutorId);
      setFavorites((p) => { const n = new Set(p); n.delete(tutorId); return n; });
    } else {
      await supabase.from("favorite_tutors").insert({ student_id: user.id, tutor_id: tutorId });
      setFavorites((p) => new Set(p).add(tutorId));
      toast({ title: "✓ تمت إضافة الأستاذ", description: "ستصلك إشعارات عن دروسه الجديدة." });
    }
  };

  const subjects = subjectsForLevel(levelFilter === "__mine__" ? user?.level : levelFilter);
  const formMeta = getLevelMeta(form.level);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-glow mb-2 flex items-center gap-2"><BookOpenCheck className="w-8 h-8 text-primary" /> الدروس</h1>
          <p className="text-muted-foreground">دروس مخصصة لمستواك من أساتذة معتمدين.</p>
        </div>
        {isTutor && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground font-bold"><Plus className="w-5 h-5 mr-2" /> نشر درس جديد</Button>
            </DialogTrigger>
            <DialogContent className="glass-panel sm:max-w-lg">
              <DialogHeader><DialogTitle className="font-display text-2xl text-primary">نشر درس جديد</DialogTitle></DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4 pt-2">
                <div className="space-y-2"><Label>عنوان الدرس</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-background/40" /></div>
                <div className="space-y-2"><Label>وصف</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-background/40 min-h-[80px]" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>المستوى</Label>
                    <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v, branch: "" })}>
                      <SelectTrigger className="bg-background/40"><SelectValue placeholder="اختر..." /></SelectTrigger>
                      <SelectContent>{LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.icon} {l.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>المادة</Label>
                    <Select value={form.subject} onValueChange={(v) => setForm({ ...form, subject: v })}>
                      <SelectTrigger className="bg-background/40"><SelectValue placeholder="اختر..." /></SelectTrigger>
                      <SelectContent>{subjectsForLevel(form.level).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                {formMeta?.branchRequired && (
                  <div className="space-y-2">
                    <Label>الشعبة</Label>
                    <Select value={form.branch} onValueChange={(v) => setForm({ ...form, branch: v })}>
                      <SelectTrigger className="bg-background/40"><SelectValue placeholder="اختر..." /></SelectTrigger>
                      <SelectContent>{SECONDARY_BRANCHES.filter((b) => b.value !== "common").map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>الملف (PDF, صورة, فيديو, صوت, نص — حتى 50MB)</Label>
                  <input ref={fileRef} type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" accept="image/*,video/*,audio/*,.pdf,.txt,.doc,.docx,.ppt,.pptx" />
                  <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="w-full justify-start"><Upload className="w-4 h-4 mr-2" />{file ? file.name : "اختر ملفاً..."}</Button>
                </div>
                <Button type="submit" disabled={uploading} className="w-full bg-primary font-bold h-11">{uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "نشر"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tabs + filters */}
      <div className="flex flex-wrap gap-2">
        <Button variant={tab === "feed" ? "default" : "outline"} onClick={() => setTab("feed")} className={tab === "feed" ? "bg-primary text-primary-foreground" : ""}><BookOpenCheck className="w-4 h-4 mr-2" />كل الدروس</Button>
        <Button variant={tab === "favorites" ? "default" : "outline"} onClick={() => setTab("favorites")} className={tab === "favorites" ? "bg-primary text-primary-foreground" : ""}><Star className="w-4 h-4 mr-2" />أساتذتي المفضلون</Button>
      </div>

      {tab === "feed" && (
        <div className="flex flex-col md:flex-row gap-3">
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="bg-background/40 h-11 md:w-64"><GraduationCap className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              {user?.level && <SelectItem value="__mine__">مستواي ({levelLabel(user.level, user.branch)})</SelectItem>}
              <SelectItem value="__all__">كل المستويات</SelectItem>
              {LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.icon} {l.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="bg-background/40 h-11 md:w-56"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">كل المواد</SelectItem>
              {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Favorite tutors strip */}
      {tab === "feed" && tutors.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">الأساتذة المتاحون</p>
          <div className="flex flex-wrap gap-2">
            {tutors.map((tutor) => {
              const isFav = favorites.has(tutor.user_id);
              return (
                <button key={tutor.user_id} onClick={() => toggleFavorite(tutor.user_id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-all ${isFav ? "bg-primary/15 border-primary/40 text-primary" : "bg-background/40 border-border text-muted-foreground hover:border-primary/30"}`}>
                  <img src={tutor.photo_url || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${tutor.full_name}`} alt="" className="w-5 h-5 rounded-full" />
                  <span>{tutor.full_name}</span>
                  <Heart className={`w-3.5 h-3.5 ${isFav ? "fill-primary text-primary" : ""}`} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Lessons grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground py-12">لا توجد دروس متاحة لهذا الفلتر.</p>
        ) : filtered.map((l) => {
          const meta = getLevelMeta(l.level);
          const isOwner = l.tutor_id === user?.id;
          return (
            <Card key={l.id} className="glass-panel hover:border-primary/40 transition-colors flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg font-display line-clamp-2">{l.title}</CardTitle>
                  {isOwner && <Button size="icon" variant="ghost" onClick={() => handleDelete(l.id)} className="h-7 w-7 text-destructive"><Trash2 className="w-4 h-4" /></Button>}
                </div>
                <p className="text-xs text-muted-foreground">{l.tutor_name} • {new Date(l.created_at).toLocaleDateString("ar-DZ")}</p>
              </CardHeader>
              <CardContent className="flex-1 space-y-2">
                {l.description && <p className="text-sm text-muted-foreground line-clamp-3">{l.description}</p>}
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="px-2 py-0.5 rounded-full bg-secondary border border-border">{l.subject}</span>
                  <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: `hsl(${meta?.color || "var(--primary)"} / 0.15)`, color: `hsl(${meta?.color || "var(--primary)"})`, border: `1px solid hsl(${meta?.color || "var(--primary)"} / 0.3)` }}>
                    {meta?.icon} {levelLabel(l.level, l.branch)}
                  </span>
                </div>
              </CardContent>
              {l.file_url && (
                <CardFooter>
                  <a href={l.file_url} target="_blank" rel="noopener noreferrer" className="w-full">
                    <Button variant="outline" className="w-full gap-2">{fileIcon(l.file_type)} فتح الملف</Button>
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
