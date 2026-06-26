import { useParams, useNavigate, Link } from "react-router-dom";
import { useMemo, useEffect, useState } from "react";
import {
  TEACHERS,
  getTeacher,
  sectionsForTeacher,
  ALL_SECTIONS,
  type TeacherSectionKey,
  type Teacher,
} from "@/lib/teachers";
import {
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Video,
  Box,
  Link as LinkIcon,
  Maximize2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/* ============================================================
 * Special embedded sites for specific teachers.
 * Mahmoudi Labiba → science-easy.lovable.app
 * ============================================================ */
const TEACHER_EMBED: Record<string, { url: string; label: string }> = {
  "mahmoudi-labiba": {
    url: "https://science-easy.lovable.app/",
    label: "Science Easy — موقع الأستاذة محمودي لبيبة",
  },
};

/* ============================== Page ============================== */

export default function MyClassPage() {
  const params = useParams<{ teacherId?: string; section?: string }>();
  const navigate = useNavigate();
  const teacher = useMemo(() => getTeacher(params.teacherId), [params.teacherId]);

  if (!teacher) return <TeacherPicker />;

  const embed = TEACHER_EMBED[teacher.id];
  const sections = sectionsForTeacher(teacher);
  const activeKey = (params.section as TeacherSectionKey) || sections[0]?.key;

  return (
    <div className="space-y-5 md:space-y-6">
      {/* top bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate("/my-class")}
          className="rounded-full border border-border bg-card hover:bg-secondary px-3.5 py-1.5 text-sm font-medium flex items-center gap-2 transition"
        >
          <ArrowRight className="w-4 h-4" />
          كل الأساتذة
        </button>
        <span className="inline-block rounded-full bg-foreground/90 text-background px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]">
          قسم أستاذي
        </span>
      </div>

      {/* compact hero */}
      <div className="rounded-2xl border border-border bg-card p-5 md:p-6 flex items-center gap-4 md:gap-5 flex-wrap">
        <div className="rounded-2xl bg-secondary text-foreground w-14 h-14 md:w-16 md:h-16 flex items-center justify-center text-base md:text-lg font-display border border-border shrink-0">
          {teacher.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {teacher.subject}
          </div>
          <h1 className="font-display text-2xl md:text-3xl mt-0.5 truncate">{teacher.name}</h1>
        </div>
        <GraduationCap className="w-6 h-6 text-foreground/50 hidden sm:block" />
      </div>

      {/* embed mode (Labiba Mahmoudi) */}
      {embed ? (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border bg-secondary/40">
            <div className="text-xs md:text-sm font-medium truncate">{embed.label}</div>
            <a
              href={embed.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs flex items-center gap-1 text-primary hover:underline shrink-0"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              فتح في نافذة جديدة
            </a>
          </div>
          <iframe
            src={embed.url}
            title={embed.label}
            className="w-full h-[70vh] md:h-[78vh] bg-background"
            allow="fullscreen; clipboard-read; clipboard-write"
          />
        </div>
      ) : (
        <>
          {/* section tabs */}
          <div className="flex gap-2 flex-wrap">
            {sections.map((s) => {
              const isActive = s.key === activeKey;
              return (
                <Link
                  key={s.key}
                  to={`/my-class/${teacher.id}/${s.key}`}
                  className={`rounded-full px-3.5 py-1.5 text-sm border transition flex items-center gap-2 ${
                    isActive
                      ? "bg-foreground text-background border-foreground"
                      : "bg-card text-foreground border-border hover:bg-secondary"
                  }`}
                >
                  <span>{s.emoji}</span>
                  <span className="font-medium">{s.label}</span>
                </Link>
              );
            })}
          </div>
          <SectionContent teacher={teacher} sectionKey={activeKey} />
        </>
      )}
    </div>
  );
}

/* ============================== Teacher Picker ============================== */

function TeacherPicker() {
  return (
    <div className="space-y-7">
      <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
        <span className="inline-block rounded-full bg-foreground/90 text-background px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]">
          اختر أستاذك
        </span>
        <h1 className="font-display text-3xl md:text-5xl mt-3 leading-tight">قسم أستاذي</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
          لكل أستاذ صفحاته الخاصة بمادته. اختر الأستاذ الذي تريد الدخول إلى قسمه.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEACHERS.map((t) => (
          <TeacherCard key={t.id} teacher={t} />
        ))}
      </div>
    </div>
  );
}

function TeacherCard({ teacher }: { teacher: Teacher }) {
  const sections = sectionsForTeacher(teacher);
  const hasEmbed = !!TEACHER_EMBED[teacher.id];
  return (
    <Link to={`/my-class/${teacher.id}`} className="block group">
      <div className="rounded-2xl border border-border bg-card p-5 h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_30px_-16px_hsl(24_25%_16%/0.25)]">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-secondary text-foreground w-12 h-12 flex items-center justify-center text-sm font-display border border-border shrink-0">
            {teacher.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {teacher.subject}
            </div>
            <div className="font-display text-xl leading-tight mt-0.5 truncate">{teacher.name}</div>
          </div>
          {hasEmbed && (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-primary/15 text-primary px-2 py-0.5 rounded-full shrink-0">
              موقع
            </span>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {sections.slice(0, 4).map((s) => (
            <span
              key={s.key}
              className="text-[11px] font-medium bg-secondary text-foreground/80 rounded-full px-2 py-0.5"
            >
              {s.emoji} {s.label}
            </span>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm font-medium text-primary">
          <span>ادخل القسم</span>
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        </div>
      </div>
    </Link>
  );
}

/* ============================== Section content ============================== */

interface ContentItem {
  id: string;
  kind: "model3d" | "image" | "video" | "link" | "file" | "text";
  title: string;
  description: string | null;
  url: string | null;
}

function SectionContent({ teacher, sectionKey }: { teacher: Teacher; sectionKey: TeacherSectionKey }) {
  const section = ALL_SECTIONS[sectionKey];
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase
      .from("teacher_content")
      .select("id, kind, title, description, url")
      .eq("teacher_id", teacher.id)
      .eq("section_key", sectionKey)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (active) {
          setItems((data as ContentItem[]) || []);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [teacher.id, sectionKey]);

  if (!section) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border">
        <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center text-lg shrink-0">
          {section.emoji}
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-2xl truncate">{section.label}</h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5 truncate">{section.description}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-sm text-muted-foreground">جاري التحميل…</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl bg-secondary/60 p-8 text-center">
          <div className="font-display text-xl">لا يوجد محتوى بعد</div>
          <div className="text-sm text-muted-foreground mt-1">سيقوم الأستاذ بإضافة المحتوى قريباً.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((it) => (
            <ContentCard key={it.id} item={it} />
          ))}
        </div>
      )}
    </div>
  );
}

function ContentCard({ item }: { item: ContentItem }) {
  const Icon =
    item.kind === "model3d" ? Box :
    item.kind === "image"   ? ImageIcon :
    item.kind === "video"   ? Video :
    item.kind === "file"    ? FileText :
    LinkIcon;

  if ((item.kind === "image" || item.kind === "video" || item.kind === "model3d") && item.url) {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="aspect-video w-full bg-secondary">
          {item.kind === "image" ? (
            <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
          ) : item.kind === "video" ? (
            <video src={item.url} controls className="w-full h-full object-cover" />
          ) : (
            <iframe src={item.url} title={item.title} className="w-full h-full" allow="autoplay; fullscreen; xr-spatial-tracking" allowFullScreen />
          )}
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Icon className="w-3.5 h-3.5" /> {item.kind}
          </div>
          <div className="font-display text-lg">{item.title}</div>
          {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
        </div>
      </div>
    );
  }

  return (
    <a
      href={item.url || "#"}
      target={item.url ? "_blank" : undefined}
      rel="noopener noreferrer"
      className="rounded-xl border border-border bg-card p-4 hover:bg-secondary/50 transition flex items-start gap-3"
    >
      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-foreground/70" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display text-lg leading-tight truncate">{item.title}</div>
        {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
      </div>
      {item.url && <ExternalLink className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />}
    </a>
  );
}
