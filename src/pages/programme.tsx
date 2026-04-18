import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { BookOpen, Award, Pencil, Check, X, Sparkles, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useAITools } from "@/hooks/use-ai-tools";
import ReactMarkdown from "react-markdown";

const subjects = [
  { name: "Mathematics", nameAr: "الرياضيات", nameFr: "Mathématiques", coefficient: 7, color: "bg-blue-500", progress: 65, topics: ["Sequences & Series", "Probability", "Integrals", "Complex Numbers", "Differential Equations"] },
  { name: "Physics", nameAr: "الفيزياء", nameFr: "Physique", coefficient: 6, color: "bg-purple-500", progress: 50, topics: ["Mechanics", "Electromagnetism", "Optics", "Nuclear Physics", "Waves"] },
  { name: "Science", nameAr: "العلوم", nameFr: "Sciences", coefficient: 5, color: "bg-green-500", progress: 70, topics: ["Organic Chemistry", "Biochemistry", "Genetics", "Ecology", "Cell Biology"] },
  { name: "Arabic", nameAr: "العربية", nameFr: "Arabe", coefficient: 3, color: "bg-orange-500", progress: 80, topics: ["Literature", "Grammar", "Essay Writing", "Poetry Analysis", "Rhetoric"] },
  { name: "French", nameAr: "الفرنسية", nameFr: "Français", coefficient: 3, color: "bg-pink-500", progress: 55, topics: ["Literature", "Grammar", "Composition", "Comprehension", "Oral Expression"] },
  { name: "English", nameAr: "الإنجليزية", nameFr: "Anglais", coefficient: 2, color: "bg-cyan-500", progress: 75, topics: ["Grammar", "Vocabulary", "Writing", "Reading Comprehension", "Spoken English"] },
  { name: "Philosophy", nameAr: "الفلسفة", nameFr: "Philosophie", coefficient: 2, color: "bg-amber-500", progress: 40, topics: ["Ethics", "Logic", "Metaphysics", "Epistemology", "Political Philosophy"] },
  { name: "Islamic Studies", nameAr: "العلوم الإسلامية", nameFr: "Sciences islamiques", coefficient: 2, color: "bg-emerald-500", progress: 85, topics: ["Quran", "Hadith", "Fiqh", "Seerah", "Islamic History"] },
  { name: "History & Geography", nameAr: "التاريخ والجغرافيا", nameFr: "Histoire & Géographie", coefficient: 2, color: "bg-red-500", progress: 60, topics: ["Modern History", "Algerian History", "World Geography", "Map Reading", "Economic Geography"] },
];

export default function ProgrammePage() {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const { callAI, loading: aiLoading } = useAITools();
  const [subjectList, setSubjectList] = useState(subjects);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editTopics, setEditTopics] = useState("");
  const [editProgress, setEditProgress] = useState(0);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryContent, setSummaryContent] = useState("");
  const [summarySubject, setSummarySubject] = useState("");

  const totalCoef = subjectList.reduce((sum, s) => sum + s.coefficient, 0);

  const getSubjectName = (s: typeof subjects[0]) => {
    if (i18n.language === "ar") return s.nameAr;
    if (i18n.language === "fr") return s.nameFr;
    return s.name;
  };

  const startEdit = (i: number) => {
    setEditingIdx(i);
    setEditTopics(subjectList[i].topics.join(", "));
    setEditProgress(subjectList[i].progress);
  };

  const saveEdit = () => {
    if (editingIdx === null) return;
    setSubjectList(prev => prev.map((s, i) => i === editingIdx ? { ...s, topics: editTopics.split(",").map(t => t.trim()).filter(Boolean), progress: editProgress } : s));
    setEditingIdx(null);
    toast({ title: t("prog.updated"), description: t("prog.updatedDesc") });
  };

  const handleSummarize = async (subject: typeof subjects[0]) => {
    setSummarySubject(getSubjectName(subject));
    setSummaryContent("");
    setSummaryOpen(true);
    const result = await callAI("summarize-subject", {
      subject: subject.name,
      topics: subject.topics.join(", "),
      language: i18n.language,
    });
    if (result) {
      setSummaryContent(result);
    } else {
      setSummaryOpen(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-display font-bold text-glow mb-2">{t("prog.title")}</h1>
        <p className="text-muted-foreground text-lg">{t("prog.subtitle")}</p>
      </div>

      <div className="flex justify-center gap-6 flex-wrap">
        <div className="px-6 py-3 rounded-2xl bg-card border border-border flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="text-sm text-muted-foreground">{t("prog.subjects")}</span>
          <span className="text-xl font-bold text-primary font-mono">{subjects.length}</span>
        </div>
        <div className="px-6 py-3 rounded-2xl bg-card border border-border flex items-center gap-3">
          <Award className="w-5 h-5 text-primary" />
          <span className="text-sm text-muted-foreground">{t("prog.totalCoef")}</span>
          <span className="text-xl font-bold text-primary font-mono">{totalCoef}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjectList.map((subject, i) => (
          <motion.div key={subject.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="glass-panel h-full hover:-translate-y-1 transition-transform duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${subject.color}`} />
                    <CardTitle className="font-display text-xl">{getSubjectName(subject)}</CardTitle>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">×{subject.coefficient}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {editingIdx === i ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground">{t("prog.progressLabel")}</label>
                      <Input type="number" min={0} max={100} value={editProgress} onChange={(e) => setEditProgress(Number(e.target.value))} className="h-9 bg-background/40" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">{t("prog.topicsLabel")}</label>
                      <Input value={editTopics} onChange={(e) => setEditTopics(e.target.value)} className="h-9 bg-background/40" />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEdit} className="gap-1"><Check className="w-3 h-3" /> {t("prog.save")}</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingIdx(null)} className="gap-1"><X className="w-3 h-3" /> {t("prog.cancel")}</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-muted-foreground">{t("prog.progress")}</span>
                        <span className="text-primary font-bold">{subject.progress}%</span>
                      </div>
                      <Progress value={subject.progress} className="h-2" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">{t("prog.topics")}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {subject.topics.map((topic) => (
                          <span key={topic} className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded-md text-xs">{topic}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(i)} className="flex-1 gap-2 text-muted-foreground hover:text-primary">
                        <Pencil className="w-3 h-3" /> {t("prog.edit")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSummarize(subject)}
                        disabled={aiLoading}
                        className="flex-1 gap-2 text-primary hover:bg-primary/10"
                      >
                        {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        {t("prog.summarize")}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="glass-panel sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-primary flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> {summarySubject}
            </DialogTitle>
          </DialogHeader>
          {summaryContent ? (
            <div className="prose prose-sm prose-invert max-w-none pt-4">
              <ReactMarkdown>{summaryContent}</ReactMarkdown>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
