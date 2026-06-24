import { useParams, useNavigate, Link } from "react-router-dom";
import { useMemo } from "react";
import {
  TEACHERS,
  getTeacher,
  sectionsForTeacher,
  ALL_SECTIONS,
  type TeacherSectionKey,
  type Teacher,
} from "@/lib/teachers";
import { ArrowRight, ArrowLeft, GraduationCap } from "lucide-react";

/* ============================== Brutalist atoms ============================== */

function BrutalCard({
  children,
  className = "",
  accent,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: string;
}) {
  return (
    <div
      className={`brutal brutal-hover relative ${accent || "bg-card"} ${className}`}
    >
      {children}
    </div>
  );
}

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block brutal-sm bg-foreground text-background px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest">
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
    <div className="space-y-6 pb-10">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate("/my-class")}
          className="brutal-sm brutal-hover bg-card px-3 py-2 text-sm font-bold flex items-center gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          كل الأساتذة
        </button>
        <SectionTag>قسم أستاذي</SectionTag>
      </div>

      {/* Teacher hero */}
      <BrutalCard accent={teacher.accent} className="p-6">
        <div className="flex items-center gap-5 flex-wrap">
          <div className="brutal-sm bg-background text-foreground w-20 h-20 flex items-center justify-center text-2xl font-black">
            {teacher.initials}
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="text-xs font-bold uppercase tracking-widest opacity-70">
              {teacher.subject}
            </div>
            <h1 className="font-display text-4xl md:text-5xl mt-1"><em>{teacher.name}</em></h1>
          </div>
          <GraduationCap className="w-10 h-10 opacity-80" />
        </div>
      </BrutalCard>

      {/* Section tabs */}
      <div className="flex gap-3 flex-wrap">
        {sections.map((s) => {
          const isActive = s.key === activeKey;
          return (
            <Link
              key={s.key}
              to={`/my-class/${teacher.id}/${s.key}`}
              className={`brutal-sm brutal-hover px-4 py-2 font-bold text-sm flex items-center gap-2 ${
                isActive ? "bg-foreground text-background" : "bg-card"
              }`}
            >
              <span>{s.emoji}</span>
              <span>{s.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Active section content */}
      <SectionContent teacher={teacher} sectionKey={activeKey} />
    </div>
  );
}

/* ============================== Teacher Picker ============================== */

function TeacherPicker() {
  return (
    <div className="space-y-8 pb-10">
      <BrutalCard accent="bg-primary" className="p-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-5xl">🎓</div>
          <div className="flex-1 min-w-[200px]">
            <SectionTag>اختر أستاذك</SectionTag>
            <h1 className="font-display text-5xl md:text-6xl mt-2"><em>قسم أستاذي</em></h1>
            <p className="text-sm font-bold mt-1 opacity-80">
              لكل أستاذ صفحاته الخاصة بمادته — اختر الأستاذ الذي تريد الدخول إلى قسمه.
            </p>
          </div>
        </div>
      </BrutalCard>

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
    <Link to={`/my-class/${teacher.id}`} className="block">
      <BrutalCard accent={teacher.accent} className="p-5 h-full">
        <div className="flex items-start gap-4">
          <div className="brutal-sm bg-background text-foreground w-14 h-14 flex items-center justify-center text-lg font-black flex-shrink-0">
            {teacher.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-widest opacity-70">
              {teacher.subject}
            </div>
            <div className="text-lg font-black leading-tight mt-0.5">
              {teacher.name}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {sections.map((s) => (
            <span
              key={s.key}
              className="text-[11px] font-bold bg-background text-foreground border-2 border-foreground px-2 py-0.5"
            >
              {s.emoji} {s.label}
            </span>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm font-black">
          <span>ادخل القسم</span>
          <ArrowLeft className="w-4 h-4" />
        </div>
      </BrutalCard>
    </Link>
  );
}

/* ============================== Section content ============================== */

function SectionContent({
  teacher,
  sectionKey,
}: {
  teacher: Teacher;
  sectionKey: TeacherSectionKey;
}) {
  const section = ALL_SECTIONS[sectionKey];
  if (!section) return null;

  return (
    <BrutalCard className="p-6">
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <div className={`brutal-sm w-12 h-12 flex items-center justify-center text-2xl ${section.accent}`}>
          {section.emoji}
        </div>
        <div>
          <h2 className="text-2xl font-black">{section.label}</h2>
          <p className="text-sm font-bold opacity-70">{section.description}</p>
        </div>
      </div>

      {sectionKey === "lab" && <LabSection teacher={teacher} />}
      {sectionKey === "resources" && <ResourcesSection teacher={teacher} />}
      {sectionKey === "models3d" && <Models3DSection teacher={teacher} />}
      {sectionKey === "exercises" && <ExercisesSection teacher={teacher} />}
    </BrutalCard>
  );
}

/* ============================== Per-section bodies ============================== */

function EmptyBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="brutal-sm bg-muted p-5 text-center">
      <div className="text-lg font-black">{title}</div>
      <div className="text-sm font-bold opacity-70 mt-1">{body}</div>
    </div>
  );
}

function LabSection({ teacher }: { teacher: Teacher }) {
  // Curated PhET / interactive lab links per subject.
  const labs: { title: string; url: string }[] =
    teacher.subjectKey === "science"
      ? [
          { title: "الخلية وأجزاؤها — محاكاة", url: "https://phet.colorado.edu/sims/html/membrane-channels/latest/membrane-channels_ar.html" },
          { title: "الجهاز الهضمي — تفاعلي", url: "https://www.biodigital.com/" },
          { title: "النباتات والتركيب الضوئي", url: "https://phet.colorado.edu/ar/simulations/category/biology" },
        ]
      : teacher.subjectKey === "physics"
      ? [
          { title: "الدارات الكهربائية", url: "https://phet.colorado.edu/sims/html/circuit-construction-kit-dc/latest/circuit-construction-kit-dc_ar.html" },
          { title: "الجاذبية والمدارات", url: "https://phet.colorado.edu/sims/html/gravity-and-orbits/latest/gravity-and-orbits_ar.html" },
          { title: "الكثافة", url: "https://phet.colorado.edu/sims/html/density/latest/density_ar.html" },
        ]
      : [];

  if (labs.length === 0) {
    return <EmptyBlock title="لا توجد تجارب حالياً" body="ستُضاف تجارب قريباً." />;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {labs.map((lab) => (
        <a
          key={lab.url}
          href={lab.url}
          target="_blank"
          rel="noopener noreferrer"
          className="brutal-sm brutal-hover bg-card p-4 flex items-center justify-between gap-3"
        >
          <span className="font-black">{lab.title}</span>
          <span className="text-xs font-bold bg-foreground text-background px-2 py-1">فتح</span>
        </a>
      ))}
    </div>
  );
}

function ResourcesSection({ teacher }: { teacher: Teacher }) {
  return (
    <EmptyBlock
      title={`مصادر ${teacher.subject}`}
      body="سيتم نشر الدروس والملفّات والروابط هنا قريباً من قِبَل الأستاذ."
    />
  );
}

function Models3DSection({ teacher }: { teacher: Teacher }) {
  const models =
    teacher.subjectKey === "science"
      ? [
          { title: "القلب البشري", url: "https://sketchfab.com/3d-models/human-heart-9f9cfff48b3c4d3a8a6f1f3b1c1f6f8a/embed" },
          { title: "جسم الإنسان", url: "https://human.biodigital.com/widget/?be=2L0w&background.colors=255,255,255" },
        ]
      : teacher.subjectKey === "physics"
      ? [{ title: "النظام الشمسي", url: "https://eyes.nasa.gov/apps/solar-system/" }]
      : teacher.subjectKey === "math"
      ? [{ title: "GeoGebra 3D", url: "https://www.geogebra.org/3d?lang=ar" }]
      : teacher.subjectKey === "social"
      ? [{ title: "خرائط Google Earth", url: "https://earth.google.com/web/" }]
      : [];

  if (models.length === 0) {
    return <EmptyBlock title="لا توجد نماذج حالياً" body="ستُضاف نماذج 3D قريباً." />;
  }
  return (
    <div className="space-y-4">
      {models.map((m) => (
        <div key={m.url} className="brutal-sm bg-card p-3">
          <div className="font-black mb-2">{m.title}</div>
          <div className="aspect-video w-full border-2 border-foreground">
            <iframe
              src={m.url}
              title={m.title}
              className="w-full h-full"
              allow="autoplay; fullscreen; xr-spatial-tracking"
              allowFullScreen
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ExercisesSection({ teacher }: { teacher: Teacher }) {
  return (
    <EmptyBlock
      title={`تمارين ${teacher.subject}`}
      body="بنك التمارين والحلول الخاص بهذا الأستاذ سيتوفّر قريباً."
    />
  );
}
