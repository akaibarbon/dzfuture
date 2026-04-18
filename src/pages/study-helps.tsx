import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { MapPin, Sparkles, Loader2, GraduationCap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { useAITools } from "@/hooks/use-ai-tools";
import ReactMarkdown from "react-markdown";

const japanTechniques = [
  { title: "Kaizen (改善)", desc: "Study just 1% better every day. Consistency over intensity. Over a year, this compounds into mastery." },
  { title: "Hansei (反省)", desc: "Daily self-evaluation of mistakes to avoid repeating them." },
  { title: "Kanban (看板)", desc: "Visual board to divide tasks: In Progress, Done, Awaiting Review." },
  { title: "Zazen (座禅)", desc: "5 minutes of breathing meditation before studying to clear the mind." },
  { title: "Ikigai (生き甲斐)", desc: "Connect your study subject to a deep life purpose to increase passion." },
  { title: "Seiza (正座)", desc: "Upright sitting posture to increase focus and blood flow." },
  { title: "Hara Hachi Bu", desc: "Stop studying when your head feels 80% full. Rest before overflow." },
  { title: "Senpai Method", desc: "Explain the lesson to someone younger to strengthen understanding." },
];

const chinaTechniques = [
  { title: "100 Repetitions", desc: "Write complex formulas/symbols 100 times until they become automatic." },
  { title: "Memory Palace", desc: "Link information to rooms in a house you know well for easier recall." },
  { title: "Yin & Yang Study", desc: "Balance scientific and literary subjects in the same day." },
  { title: "5-Step Method", desc: "Read → Highlight → Summarize → Recite → Review." },
  { title: "Daily Self-Test", desc: "Create a quiz for yourself every night before sleep." },
  { title: "Spaced Repetition", desc: "Review after 1 hour, 1 day, 1 week, 1 month." },
  { title: "Chess Strategy", desc: "Predict exam questions as if they were opponent moves." },
  { title: "Mountain Patience", desc: "Study for long periods (3 hours continuous) then take a long break." },
];

const britainTechniques = [
  { title: "Cornell Notes", desc: "Divide the page into three sections: notes, questions, and summary." },
  { title: "SQ3R Method", desc: "Survey, Question, Read, Recite, Review." },
  { title: "Feynman Technique", desc: "Explain the material in simple words as if to an 8-year-old." },
  { title: "Active Recall", desc: "Close the book and write everything you remember." },
  { title: "Pomodoro+", desc: "50 minutes work + 10 minutes rest (longer focus intervals)." },
  { title: "Bloom's Pyramid", desc: "Progress from Remembering → Understanding → Analyzing → Creating." },
  { title: "Six Thinking Hats", desc: "View problems from emotional, logical, optimistic, and critical angles." },
  { title: "Practice Exams", desc: "Solve past exams under the same time pressure." },
];

const examSubjects = [
  "Mathematics", "Physics", "Science", "Arabic", "French", "English",
  "Philosophy", "Islamic Studies", "History & Geography",
];

export default function StudyHelpsPage() {
  const { t, i18n } = useTranslation();
  const { callAI, loading: aiLoading } = useAITools();
  const [examSubject, setExamSubject] = useState("Mathematics");
  const [examDifficulty, setExamDifficulty] = useState("medium");
  const [examCount, setExamCount] = useState(5);
  const [examResult, setExamResult] = useState("");

  const handleGenerateExam = async () => {
    setExamResult("");
    const result = await callAI("generate-exam", {
      subject: examSubject,
      difficulty: examDifficulty,
      questionCount: examCount,
      language: i18n.language,
    });
    if (result) setExamResult(result);
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-display font-bold text-glow text-primary mb-4">{t("study.title")}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t("study.subtitle")}</p>
      </div>

      <Tabs defaultValue="japan" className="w-full">
        <TabsList className="w-full flex justify-center bg-card border border-border rounded-xl p-1 flex-wrap">
          <TabsTrigger value="japan" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg font-bold">{t("study.japan")}</TabsTrigger>
          <TabsTrigger value="china" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg font-bold">{t("study.china")}</TabsTrigger>
          <TabsTrigger value="britain" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg font-bold">{t("study.britain")}</TabsTrigger>
          <TabsTrigger value="exam-gen" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg font-bold gap-1">
            <Sparkles className="w-3 h-3" /> {t("study.examGen")}
          </TabsTrigger>
        </TabsList>

        {[
          { value: "japan", techniques: japanTechniques, country: "Japan" },
          { value: "china", techniques: chinaTechniques, country: "China" },
          { value: "britain", techniques: britainTechniques, country: "Britain" },
        ].map(({ value, techniques, country }) => (
          <TabsContent key={value} value={value} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {techniques.map((tech, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <Card className="glass-panel h-full border-t border-primary/20 hover:-translate-y-1 transition-transform duration-300">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2 text-primary mb-1">
                        <MapPin className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">{country}</span>
                      </div>
                      <CardTitle className="font-display text-xl">{tech.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed text-sm">{tech.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        ))}

        <TabsContent value="exam-gen" className="mt-6">
          <Card className="glass-panel border-primary/20">
            <CardHeader>
              <CardTitle className="font-display text-2xl flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-primary" />
                {t("study.examGenTitle")}
              </CardTitle>
              <p className="text-muted-foreground text-sm">{t("study.examGenDesc")}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t("study.subject")}</Label>
                  <Select value={examSubject} onValueChange={setExamSubject}>
                    <SelectTrigger className="bg-background/40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {examSubjects.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("study.difficulty")}</Label>
                  <Select value={examDifficulty} onValueChange={setExamDifficulty}>
                    <SelectTrigger className="bg-background/40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">{t("study.easy")}</SelectItem>
                      <SelectItem value="medium">{t("study.medium")}</SelectItem>
                      <SelectItem value="hard">{t("study.hard")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("study.questionCount")}</Label>
                  <Input type="number" min={3} max={20} value={examCount} onChange={(e) => setExamCount(Number(e.target.value))} className="bg-background/40" />
                </div>
              </div>
              <Button onClick={handleGenerateExam} disabled={aiLoading} className="w-full bg-primary font-bold gap-2">
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {t("study.generate")}
              </Button>

              {examResult && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="prose prose-sm prose-invert max-w-none p-6 rounded-2xl bg-secondary/30 border border-border">
                  <ReactMarkdown>{examResult}</ReactMarkdown>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="space-y-4">
        <h2 className="text-2xl font-display font-bold text-center text-primary">{t("study.platforms")}</h2>
        <p className="text-center text-muted-foreground text-sm">{t("study.platformsDesc")}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: "DzExams", url: "https://www.dzexams.com", desc: "Past exams & corrections", emoji: "📝" },
            { name: "Ency Education", url: "https://www.ency-education.com", desc: "Lessons & exercises", emoji: "📚" },
            { name: "Khan Academy", url: "https://www.khanacademy.org", desc: "Free world-class education", emoji: "🌍" },
            { name: "Quizlet", url: "https://www.quizlet.com", desc: "Flashcards & study games", emoji: "🃏" },
            { name: "Wolfram Alpha", url: "https://www.wolframalpha.com", desc: "Math engine", emoji: "🔢" },
            { name: "Google Scholar", url: "https://scholar.google.com", desc: "Academic papers", emoji: "🔬" },
          ].map((site, i) => (
            <motion.a key={i} href={site.url} target="_blank" rel="noopener noreferrer" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="glass-panel border border-primary/10 rounded-xl p-4 text-center hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 group">
              <div className="text-3xl mb-2">{site.emoji}</div>
              <div className="font-display font-bold text-sm group-hover:text-primary transition-colors">{site.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{site.desc}</div>
            </motion.a>
          ))}
        </div>
      </div>

      <div className="flex justify-center items-center gap-4 py-8 opacity-50">
        <div className="h-px w-24 bg-gradient-to-r from-transparent to-primary" />
        <div className="w-3 h-3 rotate-45 border border-primary" />
        <div className="h-px w-24 bg-gradient-to-l from-transparent to-primary" />
      </div>
    </div>
  );
}
