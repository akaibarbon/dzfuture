import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, Send, CheckCircle2, Clock, Loader2, FileText, Award, MessageCircle, Pencil } from "lucide-react";
import { awardXP } from "@/lib/gamification";

interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  student_name: string | null;
  content: string | null;
  file_url: string | null;
  file_type: string | null;
  status: string;
  grade: number | null;
  feedback: string | null;
  submitted_at: string;
  graded_at: string | null;
}

export function StudentSubmission({ assignmentId, dueAt }: { assignmentId: string; dueAt: string | null }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const overdue = dueAt ? new Date(dueAt).getTime() < Date.now() : false;
  const graded = submission?.grade != null || submission?.feedback;

  const load = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("assignment_submissions")
      .select("*")
      .eq("assignment_id", assignmentId)
      .eq("student_id", user.id)
      .maybeSingle();
    if (data) {
      setSubmission(data as Submission);
      setContent(data.content || "");
    }
  };

  useEffect(() => { load(); }, [assignmentId, user?.id]);

  const submit = async () => {
    if (!user?.id) return;
    if (!content.trim() && !file && !submission?.file_url) {
      toast({ title: "اكتب نصاً أو أرفق ملفاً", variant: "destructive" });
      return;
    }
    setLoading(true);
    let fileUrl = submission?.file_url || null;
    let fileType = submission?.file_type || null;
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast({ title: "الملف كبير جداً", description: "الحد 50MB", variant: "destructive" });
        setLoading(false); return;
      }
      const path = `submissions/${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("lessons").upload(path, file);
      if (upErr) { toast({ title: "فشل الرفع", description: upErr.message, variant: "destructive" }); setLoading(false); return; }
      const { data: signed } = await supabase.storage.from("lessons").createSignedUrl(path, 60 * 60 * 24 * 365);
      fileUrl = signed?.signedUrl ?? null;
      fileType = file.type;
    }
    const payload = {
      assignment_id: assignmentId,
      student_id: user.id,
      student_name: user.fullName || user.nickname || null,
      content: content.trim() || null,
      file_url: fileUrl,
      file_type: fileType,
      status: overdue ? "late" : "submitted",
    };
    const wasNew = !submission;
    const { error } = submission
      ? await supabase.from("assignment_submissions").update(payload).eq("id", submission.id)
      : await supabase.from("assignment_submissions").insert(payload);
    setLoading(false);
    if (error) { toast({ title: "فشل التسليم", description: error.message, variant: "destructive" }); return; }
    if (wasNew) {
      const xp = overdue ? 10 : 25;
      awardXP(user.id, xp, overdue ? "late_submission" : "on_time_submission").catch(() => {});
      toast({ title: "✓ تم التسليم", description: `+${xp} XP` });
    } else {
      toast({ title: "✓ تم تحديث التسليم" });
    }
    setFile(null);
    setOpen(false);
    load();
  };

  if (!user || user.role === "tutor") return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={submission ? "outline" : "default"}
          className={`w-full gap-2 ${submission && !graded ? "border-emerald-500/40 text-emerald-500" : ""} ${graded ? "border-primary/40" : ""}`}
        >
          {graded ? (
            <><Award className="w-4 h-4" /> {submission?.grade != null ? `العلامة: ${submission.grade}` : "تم التصحيح"}</>
          ) : submission ? (
            <><CheckCircle2 className="w-4 h-4" /> تم التسليم — تعديل</>
          ) : (
            <><Send className="w-4 h-4" /> {overdue ? "تسليم متأخر" : "سلّم الواجب"}</>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {graded ? "نتيجة التصحيح" : submission ? "تعديل التسليم" : "تسليم الواجب"}
          </DialogTitle>
        </DialogHeader>

        {graded && (
          <div className="space-y-3 p-4 rounded-xl bg-primary/10 border border-primary/30">
            {submission?.grade != null && (
              <div className="flex items-center gap-2 text-2xl font-bold text-primary">
                <Award className="w-6 h-6" /> {submission.grade} / 20
              </div>
            )}
            {submission?.feedback && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-bold"><MessageCircle className="w-4 h-4" /> ملاحظات الأستاذ</div>
                <p className="text-sm whitespace-pre-wrap">{submission.feedback}</p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Pencil className="w-3 h-3" /> نص الإجابة
            </Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="اكتب إجابتك هنا..."
              className="bg-background/40 min-h-[120px]"
              disabled={!!graded}
            />
          </div>
          {!graded && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1">إرفاق ملف (اختياري)</Label>
              <input ref={fileRef} type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" accept="image/*,.pdf,.txt,.doc,.docx" />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="w-full justify-start text-xs">
                <Upload className="w-3.5 h-3.5 mr-2" />
                {file ? file.name : submission?.file_url ? "تغيير الملف الحالي" : "اختر ملفاً..."}
              </Button>
              {submission?.file_url && !file && (
                <a href={submission.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary mt-1 inline-flex items-center gap-1">
                  <FileText className="w-3 h-3" /> الملف الحالي
                </a>
              )}
            </div>
          )}
          {submission && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {submission.status === "late" ? "تسليم متأخر • " : ""}
              {new Date(submission.submitted_at).toLocaleString("ar-DZ")}
            </div>
          )}
          {!graded && (
            <Button onClick={submit} disabled={loading} className="w-full bg-primary font-bold">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : submission ? "حفظ التعديل" : "إرسال التسليم"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TutorSubmissionsPanel({ assignmentId, totalGrade = 20 }: { assignmentId: string; totalGrade?: number }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [grading, setGrading] = useState<string | null>(null);
  const [gradeInput, setGradeInput] = useState("");
  const [feedbackInput, setFeedbackInput] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("assignment_submissions")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("submitted_at", { ascending: false });
    if (data) setSubs(data as Submission[]);
  };

  useEffect(() => { if (open) load(); }, [open, assignmentId]);

  const startGrade = (s: Submission) => {
    setGrading(s.id);
    setGradeInput(s.grade?.toString() || "");
    setFeedbackInput(s.feedback || "");
  };

  const saveGrade = async (id: string) => {
    const grade = gradeInput ? parseFloat(gradeInput) : null;
    if (grade != null && (isNaN(grade) || grade < 0 || grade > totalGrade)) {
      toast({ title: `العلامة بين 0 و ${totalGrade}`, variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("assignment_submissions")
      .update({ grade, feedback: feedbackInput || null, status: "graded" })
      .eq("id", id);
    if (error) { toast({ title: "فشل الحفظ", description: error.message, variant: "destructive" }); return; }
    toast({ title: "✓ تم التصحيح" });
    setGrading(null);
    load();
  };

  const graded = subs.filter((s) => s.grade != null || s.feedback).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <CheckCircle2 className="w-4 h-4" /> التسليمات ({subs.length || "—"})
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center justify-between gap-2">
            <span>تسليمات التلاميذ</span>
            <span className="text-sm font-normal text-muted-foreground">{graded} / {subs.length} مصححة</span>
          </DialogTitle>
        </DialogHeader>
        {subs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">لا توجد تسليمات بعد.</p>
        ) : (
          <div className="space-y-2">
            {subs.map((s) => (
              <div key={s.id} className="p-3 rounded-xl border border-border bg-background/40 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-sm truncate">{s.student_name || "تلميذ"}</span>
                    {s.status === "late" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">متأخر</span>}
                    {s.grade != null && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">{s.grade}/{totalGrade}</span>}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{new Date(s.submitted_at).toLocaleString("ar-DZ", { dateStyle: "short", timeStyle: "short" })}</span>
                </div>
                {s.content && <p className="text-xs whitespace-pre-wrap text-muted-foreground bg-background/30 p-2 rounded">{s.content}</p>}
                {s.file_url && (
                  <a href={s.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary inline-flex items-center gap-1">
                    <FileText className="w-3 h-3" /> فتح الملف
                  </a>
                )}
                {grading === s.id ? (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Input type="number" min={0} max={totalGrade} step="0.25" value={gradeInput} onChange={(e) => setGradeInput(e.target.value)} placeholder={`علامة /${totalGrade}`} className="bg-background/40 h-8 text-sm w-28" />
                      <span className="text-xs text-muted-foreground">/ {totalGrade}</span>
                    </div>
                    <Textarea value={feedbackInput} onChange={(e) => setFeedbackInput(e.target.value)} placeholder="ملاحظات للتلميذ..." className="bg-background/40 min-h-[60px] text-sm" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveGrade(s.id)} className="bg-primary">حفظ</Button>
                      <Button size="sm" variant="ghost" onClick={() => setGrading(null)}>إلغاء</Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => startGrade(s)} className="w-full text-xs h-8">
                    {s.grade != null ? "تعديل العلامة" : "تصحيح"}
                  </Button>
                )}
                {s.feedback && grading !== s.id && (
                  <p className="text-xs italic text-muted-foreground border-r-2 border-primary/40 pr-2">{s.feedback}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
