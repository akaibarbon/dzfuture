import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Radar, Sparkles, Loader2, AlertTriangle, BookOpen, ArrowRight, Target, Brain } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAITools } from "@/hooks/use-ai-tools";
import ReactMarkdown from "react-markdown";

const subjects = [
  "Mathematics", "Physics", "Science", "Arabic", "French", "English",
  "Philosophy", "Islamic Studies", "History & Geography", "Chemistry",
];

const levels = ["1AS", "2AS", "3AS"];

export default function KnowledgeRadarPage() {
  const { t, i18n } = useTranslation();
  const { callAI, loading } = useAITools();
  const [subject, setSubject] = useState("Mathematics");
  const [level, setLevel] = useState("3AS");
  const [studentAnswer, setStudentAnswer] = useState("");
  const [question, setQuestion] = useState("");
  const [diagnosis, setDiagnosis] = useState<null | {
    mainError: string;
    rootCause: string;
    rootLevel: string;
    capsule: string;
    correctedSolution: string;
  }>(null);
  const [rawResult, setRawResult] = useState("");

  const handleDiagnose = async () => {
    if (!question.trim() || !studentAnswer.trim()) return;
    setDiagnosis(null);
    setRawResult("");

    const result = await callAI("knowledge-radar", {
      subject,
      level,
      question: question.trim(),
      studentAnswer: studentAnswer.trim(),
      language: i18n.language,
    });

    if (result) {
      try {
        const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleaned);
        setDiagnosis(parsed);
      } catch {
        setRawResult(result);
      }
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-primary uppercase tracking-wider">{t("radar.badge")}</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-glow text-primary mb-2">{t("radar.title")}</h1>
        <p className="text-muted-foreground text-sm max-w-xl mx-auto">{t("radar.subtitle")}</p>
      </div>

      <Card className="glass-panel border-primary/20">
        <CardHeader>
          <CardTitle className="font-display text-xl flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            {t("radar.inputTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("radar.subject")}</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="bg-background/40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("radar.level")}</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger className="bg-background/40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {levels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("radar.question")}</Label>
            <Textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder={t("radar.questionPlaceholder")}
              className="bg-background/40 min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label>{t("radar.answer")}</Label>
            <Textarea
              value={studentAnswer}
              onChange={e => setStudentAnswer(e.target.value)}
              placeholder={t("radar.answerPlaceholder")}
              className="bg-background/40 min-h-[100px]"
            />
          </div>

          <Button
            onClick={handleDiagnose}
            disabled={loading || !question.trim() || !studentAnswer.trim()}
            className="w-full bg-primary font-bold gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {t("radar.diagnose")}
          </Button>
        </CardContent>
      </Card>

      <AnimatePresence>
        {diagnosis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Main Error */}
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-sm text-destructive mb-1">{t("radar.mainError")}</p>
                    <p className="text-sm text-foreground">{diagnosis.mainError}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Root Cause */}
            <Card className="border-orange-500/30 bg-orange-500/5">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-sm text-orange-500 mb-1">
                      {t("radar.rootCause")} <span className="text-xs bg-orange-500/20 px-2 py-0.5 rounded-full">{diagnosis.rootLevel}</span>
                    </p>
                    <p className="text-sm text-foreground">{diagnosis.rootCause}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Review Capsule */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <BookOpen className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-primary mb-2 flex items-center gap-2">
                      {t("radar.capsule")}
                      <ArrowRight className="w-3 h-3" />
                    </p>
                    <div className="prose prose-sm prose-invert max-w-none text-foreground">
                      <ReactMarkdown>{diagnosis.capsule}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Corrected Solution */}
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-green-500 mb-2">{t("radar.corrected")}</p>
                    <div className="prose prose-sm prose-invert max-w-none text-foreground">
                      <ReactMarkdown>{diagnosis.correctedSolution}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {rawResult && !diagnosis && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="prose prose-sm prose-invert max-w-none p-6 rounded-2xl bg-secondary/30 border border-border">
            <ReactMarkdown>{rawResult}</ReactMarkdown>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
