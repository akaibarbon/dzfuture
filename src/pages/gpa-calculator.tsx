import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { Calculator, GraduationCap, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";

type Branch = {
  id: string;
  labelAr: string;
  labelFr: string;
  labelEn: string;
  subjects: { nameAr: string; nameFr: string; nameEn: string; coef: number }[];
};

const branches: Record<string, Branch[]> = {
  "1as": [
    {
      id: "1as-sciences", labelAr: "أولى ثانوي - جذع مشترك علوم", labelFr: "1AS - Tronc Commun Sciences", labelEn: "1AS - Common Core Sciences",
      subjects: [
        { nameAr: "الرياضيات", nameFr: "Mathématiques", nameEn: "Mathematics", coef: 5 },
        { nameAr: "الفيزياء", nameFr: "Physique", nameEn: "Physics", coef: 4 },
        { nameAr: "علوم الطبيعة", nameFr: "Sciences naturelles", nameEn: "Natural Sciences", coef: 4 },
        { nameAr: "اللغة العربية", nameFr: "Langue arabe", nameEn: "Arabic", coef: 3 },
        { nameAr: "اللغة الفرنسية", nameFr: "Français", nameEn: "French", coef: 2 },
        { nameAr: "اللغة الإنجليزية", nameFr: "Anglais", nameEn: "English", coef: 2 },
        { nameAr: "التاريخ والجغرافيا", nameFr: "Histoire-Géographie", nameEn: "History & Geography", coef: 2 },
        { nameAr: "العلوم الإسلامية", nameFr: "Sciences islamiques", nameEn: "Islamic Sciences", coef: 2 },
        { nameAr: "الإعلام الآلي", nameFr: "Informatique", nameEn: "IT", coef: 1 },
        { nameAr: "التربية البدنية", nameFr: "Éducation physique", nameEn: "PE", coef: 1 },
      ],
    },
    {
      id: "1as-lettres", labelAr: "أولى ثانوي - جذع مشترك آداب", labelFr: "1AS - Tronc Commun Lettres", labelEn: "1AS - Common Core Letters",
      subjects: [
        { nameAr: "اللغة العربية", nameFr: "Langue arabe", nameEn: "Arabic", coef: 5 },
        { nameAr: "اللغة الفرنسية", nameFr: "Français", nameEn: "French", coef: 3 },
        { nameAr: "اللغة الإنجليزية", nameFr: "Anglais", nameEn: "English", coef: 3 },
        { nameAr: "التاريخ والجغرافيا", nameFr: "Histoire-Géographie", nameEn: "History & Geography", coef: 4 },
        { nameAr: "العلوم الإسلامية", nameFr: "Sciences islamiques", nameEn: "Islamic Sciences", coef: 3 },
        { nameAr: "الفلسفة", nameFr: "Philosophie", nameEn: "Philosophy", coef: 2 },
        { nameAr: "الرياضيات", nameFr: "Mathématiques", nameEn: "Mathematics", coef: 2 },
        { nameAr: "الإعلام الآلي", nameFr: "Informatique", nameEn: "IT", coef: 1 },
        { nameAr: "التربية البدنية", nameFr: "Éducation physique", nameEn: "PE", coef: 1 },
      ],
    },
  ],
  "2as": [
    {
      id: "2as-sciences-exp", labelAr: "ثانية ثانوي - علوم تجريبية", labelFr: "2AS - Sciences Expérimentales", labelEn: "2AS - Experimental Sciences",
      subjects: [
        { nameAr: "علوم الطبيعة", nameFr: "Sciences naturelles", nameEn: "Natural Sciences", coef: 5 },
        { nameAr: "الفيزياء", nameFr: "Physique", nameEn: "Physics", coef: 4 },
        { nameAr: "الرياضيات", nameFr: "Mathématiques", nameEn: "Mathematics", coef: 4 },
        { nameAr: "اللغة العربية", nameFr: "Langue arabe", nameEn: "Arabic", coef: 3 },
        { nameAr: "اللغة الفرنسية", nameFr: "Français", nameEn: "French", coef: 2 },
        { nameAr: "اللغة الإنجليزية", nameFr: "Anglais", nameEn: "English", coef: 2 },
        { nameAr: "التاريخ والجغرافيا", nameFr: "Histoire-Géographie", nameEn: "History & Geography", coef: 2 },
        { nameAr: "العلوم الإسلامية", nameFr: "Sciences islamiques", nameEn: "Islamic Sciences", coef: 2 },
        { nameAr: "الفلسفة", nameFr: "Philosophie", nameEn: "Philosophy", coef: 2 },
        { nameAr: "الإعلام الآلي", nameFr: "Informatique", nameEn: "IT", coef: 1 },
        { nameAr: "التربية البدنية", nameFr: "Éducation physique", nameEn: "PE", coef: 1 },
      ],
    },
    {
      id: "2as-math", labelAr: "ثانية ثانوي - رياضيات", labelFr: "2AS - Mathématiques", labelEn: "2AS - Mathematics",
      subjects: [
        { nameAr: "الرياضيات", nameFr: "Mathématiques", nameEn: "Mathematics", coef: 6 },
        { nameAr: "الفيزياء", nameFr: "Physique", nameEn: "Physics", coef: 4 },
        { nameAr: "علوم الطبيعة", nameFr: "Sciences naturelles", nameEn: "Natural Sciences", coef: 3 },
        { nameAr: "اللغة العربية", nameFr: "Langue arabe", nameEn: "Arabic", coef: 3 },
        { nameAr: "اللغة الفرنسية", nameFr: "Français", nameEn: "French", coef: 2 },
        { nameAr: "اللغة الإنجليزية", nameFr: "Anglais", nameEn: "English", coef: 2 },
        { nameAr: "التاريخ والجغرافيا", nameFr: "Histoire-Géographie", nameEn: "History & Geography", coef: 2 },
        { nameAr: "العلوم الإسلامية", nameFr: "Sciences islamiques", nameEn: "Islamic Sciences", coef: 2 },
        { nameAr: "الفلسفة", nameFr: "Philosophie", nameEn: "Philosophy", coef: 2 },
        { nameAr: "الإعلام الآلي", nameFr: "Informatique", nameEn: "IT", coef: 1 },
        { nameAr: "التربية البدنية", nameFr: "Éducation physique", nameEn: "PE", coef: 1 },
      ],
    },
    {
      id: "2as-tech-math", labelAr: "ثانية ثانوي - تقني رياضي", labelFr: "2AS - Technique Mathématique", labelEn: "2AS - Technical Mathematics",
      subjects: [
        { nameAr: "الرياضيات", nameFr: "Mathématiques", nameEn: "Mathematics", coef: 5 },
        { nameAr: "الهندسة", nameFr: "Génie", nameEn: "Engineering", coef: 5 },
        { nameAr: "الفيزياء", nameFr: "Physique", nameEn: "Physics", coef: 4 },
        { nameAr: "اللغة العربية", nameFr: "Langue arabe", nameEn: "Arabic", coef: 3 },
        { nameAr: "اللغة الفرنسية", nameFr: "Français", nameEn: "French", coef: 2 },
        { nameAr: "اللغة الإنجليزية", nameFr: "Anglais", nameEn: "English", coef: 2 },
        { nameAr: "التاريخ والجغرافيا", nameFr: "Histoire-Géographie", nameEn: "History & Geography", coef: 2 },
        { nameAr: "العلوم الإسلامية", nameFr: "Sciences islamiques", nameEn: "Islamic Sciences", coef: 1 },
        { nameAr: "التربية البدنية", nameFr: "Éducation physique", nameEn: "PE", coef: 1 },
      ],
    },
    {
      id: "2as-lettres-philo", labelAr: "ثانية ثانوي - آداب وفلسفة", labelFr: "2AS - Lettres et Philosophie", labelEn: "2AS - Letters & Philosophy",
      subjects: [
        { nameAr: "اللغة العربية", nameFr: "Langue arabe", nameEn: "Arabic", coef: 5 },
        { nameAr: "الفلسفة", nameFr: "Philosophie", nameEn: "Philosophy", coef: 4 },
        { nameAr: "التاريخ والجغرافيا", nameFr: "Histoire-Géographie", nameEn: "History & Geography", coef: 3 },
        { nameAr: "اللغة الفرنسية", nameFr: "Français", nameEn: "French", coef: 3 },
        { nameAr: "اللغة الإنجليزية", nameFr: "Anglais", nameEn: "English", coef: 3 },
        { nameAr: "العلوم الإسلامية", nameFr: "Sciences islamiques", nameEn: "Islamic Sciences", coef: 3 },
        { nameAr: "الرياضيات", nameFr: "Mathématiques", nameEn: "Mathematics", coef: 2 },
        { nameAr: "التربية البدنية", nameFr: "Éducation physique", nameEn: "PE", coef: 1 },
      ],
    },
    {
      id: "2as-langues", labelAr: "ثانية ثانوي - لغات أجنبية", labelFr: "2AS - Langues Étrangères", labelEn: "2AS - Foreign Languages",
      subjects: [
        { nameAr: "اللغة الفرنسية", nameFr: "Français", nameEn: "French", coef: 5 },
        { nameAr: "اللغة الإنجليزية", nameFr: "Anglais", nameEn: "English", coef: 5 },
        { nameAr: "اللغة العربية", nameFr: "Langue arabe", nameEn: "Arabic", coef: 4 },
        { nameAr: "التاريخ والجغرافيا", nameFr: "Histoire-Géographie", nameEn: "History & Geography", coef: 3 },
        { nameAr: "الفلسفة", nameFr: "Philosophie", nameEn: "Philosophy", coef: 2 },
        { nameAr: "العلوم الإسلامية", nameFr: "Sciences islamiques", nameEn: "Islamic Sciences", coef: 2 },
        { nameAr: "الرياضيات", nameFr: "Mathématiques", nameEn: "Mathematics", coef: 2 },
        { nameAr: "التربية البدنية", nameFr: "Éducation physique", nameEn: "PE", coef: 1 },
      ],
    },
  ],
  "3as": [
    {
      id: "3as-sciences-exp", labelAr: "ثالثة ثانوي - علوم تجريبية", labelFr: "3AS - Sciences Expérimentales", labelEn: "3AS - Experimental Sciences",
      subjects: [
        { nameAr: "علوم الطبيعة", nameFr: "Sciences naturelles", nameEn: "Natural Sciences", coef: 6 },
        { nameAr: "الفيزياء", nameFr: "Physique", nameEn: "Physics", coef: 5 },
        { nameAr: "الرياضيات", nameFr: "Mathématiques", nameEn: "Mathematics", coef: 5 },
        { nameAr: "اللغة العربية", nameFr: "Langue arabe", nameEn: "Arabic", coef: 3 },
        { nameAr: "اللغة الفرنسية", nameFr: "Français", nameEn: "French", coef: 2 },
        { nameAr: "اللغة الإنجليزية", nameFr: "Anglais", nameEn: "English", coef: 2 },
        { nameAr: "الفلسفة", nameFr: "Philosophie", nameEn: "Philosophy", coef: 2 },
        { nameAr: "التاريخ والجغرافيا", nameFr: "Histoire-Géographie", nameEn: "History & Geography", coef: 2 },
        { nameAr: "العلوم الإسلامية", nameFr: "Sciences islamiques", nameEn: "Islamic Sciences", coef: 2 },
        { nameAr: "الأمازيغية", nameFr: "Tamazight", nameEn: "Tamazight", coef: 1 },
        { nameAr: "التربية البدنية", nameFr: "Éducation physique", nameEn: "PE", coef: 1 },
      ],
    },
    {
      id: "3as-math", labelAr: "ثالثة ثانوي - رياضيات", labelFr: "3AS - Mathématiques", labelEn: "3AS - Mathematics",
      subjects: [
        { nameAr: "الرياضيات", nameFr: "Mathématiques", nameEn: "Mathematics", coef: 7 },
        { nameAr: "الفيزياء", nameFr: "Physique", nameEn: "Physics", coef: 6 },
        { nameAr: "علوم الطبيعة", nameFr: "Sciences naturelles", nameEn: "Natural Sciences", coef: 5 },
        { nameAr: "اللغة العربية", nameFr: "Langue arabe", nameEn: "Arabic", coef: 3 },
        { nameAr: "اللغة الفرنسية", nameFr: "Français", nameEn: "French", coef: 2 },
        { nameAr: "اللغة الإنجليزية", nameFr: "Anglais", nameEn: "English", coef: 2 },
        { nameAr: "الفلسفة", nameFr: "Philosophie", nameEn: "Philosophy", coef: 2 },
        { nameAr: "التاريخ والجغرافيا", nameFr: "Histoire-Géographie", nameEn: "History & Geography", coef: 2 },
        { nameAr: "العلوم الإسلامية", nameFr: "Sciences islamiques", nameEn: "Islamic Sciences", coef: 2 },
        { nameAr: "التربية البدنية", nameFr: "Éducation physique", nameEn: "PE", coef: 1 },
      ],
    },
    {
      id: "3as-tech-math", labelAr: "ثالثة ثانوي - تقني رياضي", labelFr: "3AS - Technique Mathématique", labelEn: "3AS - Technical Mathematics",
      subjects: [
        { nameAr: "الهندسة", nameFr: "Génie", nameEn: "Engineering", coef: 6 },
        { nameAr: "الرياضيات", nameFr: "Mathématiques", nameEn: "Mathematics", coef: 5 },
        { nameAr: "الفيزياء", nameFr: "Physique", nameEn: "Physics", coef: 5 },
        { nameAr: "اللغة العربية", nameFr: "Langue arabe", nameEn: "Arabic", coef: 3 },
        { nameAr: "اللغة الفرنسية", nameFr: "Français", nameEn: "French", coef: 2 },
        { nameAr: "اللغة الإنجليزية", nameFr: "Anglais", nameEn: "English", coef: 2 },
        { nameAr: "الفلسفة", nameFr: "Philosophie", nameEn: "Philosophy", coef: 2 },
        { nameAr: "التاريخ والجغرافيا", nameFr: "Histoire-Géographie", nameEn: "History & Geography", coef: 2 },
        { nameAr: "العلوم الإسلامية", nameFr: "Sciences islamiques", nameEn: "Islamic Sciences", coef: 1 },
        { nameAr: "التربية البدنية", nameFr: "Éducation physique", nameEn: "PE", coef: 1 },
      ],
    },
    {
      id: "3as-lettres-philo", labelAr: "ثالثة ثانوي - آداب وفلسفة", labelFr: "3AS - Lettres et Philosophie", labelEn: "3AS - Letters & Philosophy",
      subjects: [
        { nameAr: "اللغة العربية", nameFr: "Langue arabe", nameEn: "Arabic", coef: 5 },
        { nameAr: "الفلسفة", nameFr: "Philosophie", nameEn: "Philosophy", coef: 6 },
        { nameAr: "التاريخ والجغرافيا", nameFr: "Histoire-Géographie", nameEn: "History & Geography", coef: 4 },
        { nameAr: "اللغة الفرنسية", nameFr: "Français", nameEn: "French", coef: 3 },
        { nameAr: "اللغة الإنجليزية", nameFr: "Anglais", nameEn: "English", coef: 3 },
        { nameAr: "العلوم الإسلامية", nameFr: "Sciences islamiques", nameEn: "Islamic Sciences", coef: 3 },
        { nameAr: "الرياضيات", nameFr: "Mathématiques", nameEn: "Mathematics", coef: 2 },
        { nameAr: "التربية البدنية", nameFr: "Éducation physique", nameEn: "PE", coef: 1 },
      ],
    },
    {
      id: "3as-langues", labelAr: "ثالثة ثانوي - لغات أجنبية", labelFr: "3AS - Langues Étrangères", labelEn: "3AS - Foreign Languages",
      subjects: [
        { nameAr: "اللغة الفرنسية", nameFr: "Français", nameEn: "French", coef: 5 },
        { nameAr: "اللغة الإنجليزية", nameFr: "Anglais", nameEn: "English", coef: 5 },
        { nameAr: "اللغة العربية", nameFr: "Langue arabe", nameEn: "Arabic", coef: 5 },
        { nameAr: "الفلسفة", nameFr: "Philosophie", nameEn: "Philosophy", coef: 3 },
        { nameAr: "التاريخ والجغرافيا", nameFr: "Histoire-Géographie", nameEn: "History & Geography", coef: 3 },
        { nameAr: "العلوم الإسلامية", nameFr: "Sciences islamiques", nameEn: "Islamic Sciences", coef: 2 },
        { nameAr: "الرياضيات", nameFr: "Mathématiques", nameEn: "Mathematics", coef: 2 },
        { nameAr: "التربية البدنية", nameFr: "Éducation physique", nameEn: "PE", coef: 1 },
      ],
    },
  ],
};

const yearOptions = [
  { value: "1as", labelAr: "أولى ثانوي", labelFr: "1ère AS", labelEn: "1st Year" },
  { value: "2as", labelAr: "ثانية ثانوي", labelFr: "2ème AS", labelEn: "2nd Year" },
  { value: "3as", labelAr: "ثالثة ثانوي", labelFr: "3ème AS", labelEn: "3rd Year" },
];

export default function GPACalculatorPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [year, setYear] = useState("");
  const [branchId, setBranchId] = useState("");
  const [grades, setGrades] = useState<Record<number, string>>({});
  const [result, setResult] = useState<{ avg: number; total: number; coefSum: number } | null>(null);

  const availableBranches = year ? branches[year] || [] : [];
  const selectedBranch = availableBranches.find((b) => b.id === branchId);

  const getLabel = (item: { labelAr: string; labelFr: string; labelEn: string }) =>
    lang === "ar" ? item.labelAr : lang === "fr" ? item.labelFr : item.labelEn;

  const getSubjectName = (s: { nameAr: string; nameFr: string; nameEn: string }) =>
    lang === "ar" ? s.nameAr : lang === "fr" ? s.nameFr : s.nameEn;

  const handleYearChange = (v: string) => {
    setYear(v);
    setBranchId("");
    setGrades({});
    setResult(null);
  };

  const handleBranchChange = (v: string) => {
    setBranchId(v);
    setGrades({});
    setResult(null);
  };

  const calculate = () => {
    if (!selectedBranch) return;
    let total = 0;
    let coefSum = 0;
    selectedBranch.subjects.forEach((s, i) => {
      const grade = parseFloat(grades[i] || "0");
      const clamped = Math.min(20, Math.max(0, isNaN(grade) ? 0 : grade));
      total += clamped * s.coef;
      coefSum += s.coef;
    });
    setResult({ avg: coefSum > 0 ? total / coefSum : 0, total, coefSum });
  };

  const reset = () => {
    setGrades({});
    setResult(null);
  };

  const getAvgColor = (avg: number) => {
    if (avg >= 16) return "text-green-400";
    if (avg >= 12) return "text-primary";
    if (avg >= 10) return "text-yellow-400";
    return "text-destructive";
  };

  const getAvgLabel = (avg: number) => {
    if (avg >= 16) return lang === "ar" ? "ممتاز" : lang === "fr" ? "Excellent" : "Excellent";
    if (avg >= 14) return lang === "ar" ? "جيد جداً" : lang === "fr" ? "Très bien" : "Very Good";
    if (avg >= 12) return lang === "ar" ? "جيد" : lang === "fr" ? "Bien" : "Good";
    if (avg >= 10) return lang === "ar" ? "مقبول" : lang === "fr" ? "Passable" : "Acceptable";
    return lang === "ar" ? "ضعيف" : lang === "fr" ? "Insuffisant" : "Fail";
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-glow mb-1">
          {t("gpa.title")}
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">{t("gpa.subtitle")}</p>
      </div>

      <Card className="glass-panel">
        <CardContent className="p-4 md:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("gpa.year")}</Label>
              <Select value={year} onValueChange={handleYearChange}>
                <SelectTrigger className="bg-background/40"><SelectValue placeholder={t("gpa.selectYear")} /></SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y.value} value={y.value}>{getLabel(y)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("gpa.branch")}</Label>
              <Select value={branchId} onValueChange={handleBranchChange} disabled={!year}>
                <SelectTrigger className="bg-background/40"><SelectValue placeholder={t("gpa.selectBranch")} /></SelectTrigger>
                <SelectContent>
                  {availableBranches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{getLabel(b)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedBranch && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass-panel">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                {getLabel(selectedBranch)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 md:p-6 pt-0">
              {selectedBranch.subjects.map((subject, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{getSubjectName(subject)}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold border border-primary/20 flex-shrink-0">
                        ×{subject.coef}
                      </span>
                    </div>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    step={0.25}
                    value={grades[i] || ""}
                    onChange={(e) => setGrades({ ...grades, [i]: e.target.value })}
                    placeholder="/20"
                    className="w-20 h-9 text-center bg-background/40 text-sm"
                  />
                </div>
              ))}

              <div className="flex gap-2 pt-4">
                <Button onClick={calculate} className="flex-1 bg-primary text-primary-foreground font-bold gap-2">
                  <Calculator className="w-4 h-4" />
                  {t("gpa.calculate")}
                </Button>
                <Button onClick={reset} variant="outline" className="gap-2">
                  <RotateCcw className="w-4 h-4" />
                  {t("gpa.reset")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {result && (
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Card className="glass-panel border-primary/30">
            <CardContent className="p-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground uppercase tracking-wider font-medium">{t("gpa.yourAverage")}</p>
              <p className={`text-5xl font-display font-bold ${getAvgColor(result.avg)}`}>
                {result.avg.toFixed(2)}
                <span className="text-lg text-muted-foreground font-normal"> /20</span>
              </p>
              <p className={`text-lg font-semibold ${getAvgColor(result.avg)}`}>
                {getAvgLabel(result.avg)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("gpa.totalPoints")}: {result.total.toFixed(2)} / {result.coefSum * 20} ({t("gpa.coefSum")}: {result.coefSum})
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}