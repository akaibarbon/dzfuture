import { useAuth } from "@/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { GraduationCap, Globe2, Lightbulb, BookOpen } from "lucide-react";
import { Navigate } from "react-router-dom";

const TIPS = [
  {
    culture: "🇫🇮 فنلندا",
    title: "التعلم باللعب وقلة الواجبات",
    body: "ركّز على نشاطات قصيرة (15-20د) متبوعة باستراحة. قلّل الواجبات المنزلية وعوّض بمشاريع جماعية في القسم.",
  },
  {
    culture: "🇯🇵 اليابان",
    title: "Kaizen — التحسين المستمر",
    body: "اطلب من التلاميذ تقييم درس اليوم في 3 أسطر: ما تعلّمته، ما لم أفهمه، ما أريد تحسينه. اقرأ الملاحظات قبل الدرس القادم.",
  },
  {
    culture: "🇸🇬 سنغافورة",
    title: "نموذج CPA: Concrete → Pictorial → Abstract",
    body: "ابدأ كل مفهوم بأشياء ملموسة (حجارة، أعواد)، ثم انتقل للرسومات، ثم للرموز المجرّدة. مثالي للرياضيات.",
  },
  {
    culture: "🇮🇹 إيطاليا",
    title: "نهج Reggio Emilia",
    body: "اعتبر التلميذ باحثاً. اطرح أسئلة مفتوحة بدل الأجوبة الجاهزة، ووثّق تفكيره برسومات أو تسجيلات.",
  },
  {
    culture: "🇰🇷 كوريا الجنوبية",
    title: "التكرار المتباعد (Spaced Repetition)",
    body: "راجع المفهوم بعد يوم، ثم بعد 3 أيام، ثم بعد أسبوع. استعمل بطاقات Anki أو Quizlet مع التلاميذ.",
  },
  {
    culture: "🇨🇦 كندا",
    title: "الفصل المقلوب (Flipped Classroom)",
    body: "أرسل فيديو شرح قصير قبل الدرس. خصّص وقت القسم للتمارين والنقاش بدل المحاضرة.",
  },
  {
    culture: "🌍 عام",
    title: "قاعدة 1-2-4-كلّ الجميع",
    body: "فكّر فردياً (1د) → ناقش مع زميل (2د) → جمّعوا 4 → شاركوا مع القسم. يضمن مشاركة الجميع لا الأذكى فقط.",
  },
  {
    culture: "🇩🇪 ألمانيا",
    title: "التقييم التكويني لا النهائي",
    body: "بدل الاختبار الواحد الكبير، أعط 5 اختبارات صغيرة (5د) موزّعة. التلميذ يتعلّم من الخطأ بدل أن يُعاقب عليه.",
  },
];

export default function AdvancedTeachingPage() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role !== "tutor") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <GraduationCap className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold">صفحة خاصة بالأساتذة</h1>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto" dir="rtl">
      <header className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
          <GraduationCap className="w-7 h-7 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-glow">التعليم المتقدم</h1>
          <p className="text-muted-foreground text-sm">نصائح وأساليب تربوية من مختلف الثقافات لتطوير ممارستك التعليمية.</p>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        {TIPS.map((tip, i) => (
          <Card key={i} className="glass-panel hover:border-primary/40 transition">
            <CardHeader className="pb-2">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Globe2 className="w-3 h-3" />{tip.culture}</div>
              <CardTitle className="text-lg flex items-center gap-2 mt-1">
                <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0" />
                {tip.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/80 leading-relaxed">{tip.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-panel border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /> مصادر للتعمّق</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <a href="https://www.edutopia.org" target="_blank" rel="noreferrer" className="block text-primary hover:underline">📚 Edutopia — أساليب تدريس مبتكرة</a>
          <a href="https://www.teachthought.com" target="_blank" rel="noreferrer" className="block text-primary hover:underline">🎓 TeachThought — تطوير التفكير النقدي</a>
          <a href="https://www.coursera.org/browse/personal-development/teaching-learning" target="_blank" rel="noreferrer" className="block text-primary hover:underline">🎯 Coursera — دورات في علم التدريس</a>
        </CardContent>
      </Card>
    </div>
  );
}
