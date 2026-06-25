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
import { ArrowRight, ArrowLeft, GraduationCap, ExternalLink, FileText, Image as ImageIcon, Video, Box, Link as LinkIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/* ============================== Elegant atoms ============================== */

function Panel({
  children,
  className = "",
  tone,
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "accent" | "muted";
}) {
  const bg =
    tone === "accent" ? "bg-[hsl(28_45%_88%)]" :
    tone === "muted"  ? "bg-[hsl(34_22%_92%)]" :
    "bg-card";
  return (
    <div className={`rounded-2xl border border-border ${bg} shadow-[0_8px_28px_-16px_hsl(24_25%_16%/0.18)] ${className}`}>
      {children}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-foreground/90 text-background px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]">
      {children}
    </span>
  );
}

/* ============================== Main page ============================== */

export default function MyClassPage() {
  const params = useParams<{ teacherId?: string; section?: string }>();
  const navigate = useNavigate();
  const teacher = useMemo(() => getTeacher(params.teacherId), [params.teacherId]);

  if (!teacher) {
    return <TeacherPicker />;
  }

  const sections = sectionsForTeacher(teacher);
  const activeKey = (params.section as TeacherSectionKey) || sections[0].key;

  return (
    <div className="space-y-7 pb-12">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate("/my-class")}
          className="rounded-full border border-border bg-card hover:bg-secondary px-4 py-2 text-sm font-medium flex items-center gap-2 transition"
        >
          <ArrowRight className="w-4 h-4" />
          كل الأساتذة
        </button>
        <Tag>قسم أستاذي</Tag>
      </div>

      <Panel tone="accent" className="p-7 md:p-10">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="rounded-full bg-background text-foreground w-20 h-20 flex items-center justify-center text-xl font-display border border-border">
            {teacher.initials}
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {teacher.subject}
            </div>
            <h1 className="font-display text-4xl md:text-5xl mt-1.5">{teacher.name}</h1>
          </div>
          <GraduationCap className="w-9 h-9 text-foreground/60" />
        </div>
      </Panel>

      <div className="flex gap-2 flex-wrap">
        {sections.map((s) => {
          const isActive = s.key === activeKey;
          return (
            <Link
              key={s.key}
              to={`/my-class/${teacher.id}/${s.key}`}
              className={`rounded-full px-4 py-2 text-sm border transition flex items-center gap-2 ${
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
    </div>
  );
}

/* ============================== Teacher Picker ============================== */

function TeacherPicker() {
  return (
    <div className="space-y-10 pb-12">
      <Panel tone="accent" className="p-8 md:p-12">
        <Tag>اختر أستاذك</Tag>
        <h1 className="font-display text-5xl md:text-6xl mt-4 leading-tight">قسم أستاذي</h1>
        <p className="text-sm text-muted-foreground mt-3 max-w-xl leading-relaxed">
          لكل أستاذ صفحاته الخاصة بمادته. اختر الأستاذ الذي تريد الدخول إلى قسمه لتصفّح المصادر،
          التجارب التفاعلية، والنماذج التعليمية.
        </p>
      </Panel>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {TEACHERS.map((t) => (
          <TeacherCard key={t.id} teacher={t} />
        ))}
      </div>
    </div>
  );
}

function TeacherCard({ teacher }: { teacher: Teacher }) {
  const sections = sectionsForTeacher(teacher);
  return (
    <Link to={`/my-class/${teacher.id}`} className="block group">
      <Panel className="p-6 h-full transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_16px_40px_-18px_hsl(24_25%_16%/0.28)]">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-secondary text-foreground w-14 h-14 flex items-center justify-center text-base font-display border border-border flex-shrink-0">
            {teacher.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {teacher.subject}
            </div>
            <div className="font-display text-2xl leading-tight mt-1">{teacher.name}</div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-1.5">
          {sections.map((s) => (
            <span
              key={s.key}
              className="text-[11px] font-medium bg-secondary text-foreground/80 rounded-full px-2.5 py-1"
            >
              {s.emoji} {s.label}
            </span>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-2 text-sm font-medium text-primary">
          <span>ادخل القسم</span>
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        </div>
      </Panel>
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
    return () => { active = false; };
  }, [teacher.id, sectionKey]);

  if (!section) return null;

  return (
    <Panel className="p-6 md:p-8">
      <div className="flex items-center gap-4 mb-6 pb-5 border-b border-border">
        <div className="w-11 h-11 rounded-xl bg-secondary border border-border flex items-center justify-center text-xl">
          {section.emoji}
        </div>
        <div>
          <h2 className="font-display text-3xl">{section.label}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{section.description}</p>
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
          {items.map((it) => <ContentCard key={it.id} item={it} />)}
        </div>
      )}
    </Panel>
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
      className="rounded-xl border border-border bg-card p-5 hover:bg-secondary/50 transition flex items-start gap-4"
    >
      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-foreground/70" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display text-lg leading-tight">{item.title}</div>
        {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
      </div>
      {item.url && <ExternalLink className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />}
    </a>
  );
}
