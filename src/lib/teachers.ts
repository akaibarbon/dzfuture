// Static directory of teachers at the school, used by the "قسم أستاذي" page.
// Each teacher has a subject and a set of subject-specific sub-pages.

export type TeacherSectionKey =
  | "lab"
  | "resources"
  | "models3d"
  | "exercises";

export interface TeacherSection {
  key: TeacherSectionKey;
  label: string;
  description: string;
  emoji: string;
  accent: string; // tailwind bg class
}

export interface Teacher {
  id: string;
  name: string;
  subject: string;
  subjectKey:
    | "science"
    | "physics"
    | "english"
    | "french"
    | "social"
    | "math"
    | "arabic";
  accent: string; // tailwind bg- class for hero block
  initials: string;
}

// All sections we know how to render. Specific teachers opt-in via `sections`.
export const ALL_SECTIONS: Record<TeacherSectionKey, TeacherSection> = {
  lab: {
    key: "lab",
    label: "المختبر الافتراضي",
    description: "تجارب تفاعلية وحياكاة",
    emoji: "🧪",
    accent: "bg-[#E6FF00]",
  },
  resources: {
    key: "resources",
    label: "المصادر والملفّات",
    description: "دروس، ملخصات، روابط",
    emoji: "📚",
    accent: "bg-[#FFD600]",
  },
  models3d: {
    key: "models3d",
    label: "نماذج 3D",
    description: "مجسمات ثلاثية الأبعاد",
    emoji: "🧊",
    accent: "bg-[#2D4EF5] text-white",
  },
  exercises: {
    key: "exercises",
    label: "تمارين وحلول",
    description: "بنك تمارين مع التصحيح",
    emoji: "✍️",
    accent: "bg-[#FF3B00] text-white",
  },
};

export const TEACHERS: Teacher[] = [
  { id: "mahmoudi-labiba",   name: "الأستاذة محمودي لبيبة",        subject: "العلوم الطبيعية",   subjectKey: "science",  accent: "bg-[#7CFFCB]", initials: "م.ل" },
  { id: "bahloul",           name: "الأستاذة بهلول",                subject: "العلوم الفيزيائية", subjectKey: "physics",  accent: "bg-[#E6FF00]", initials: "ب" },
  { id: "boulagroun-wahiba", name: "الأستاذة بولقرون وهيبة",        subject: "الإنجليزية",        subjectKey: "english",  accent: "bg-[#FF8FB2]", initials: "ب.و" },
  { id: "tnibar",            name: "الأستاذة طنيبر",                subject: "الفرنسية",          subjectKey: "french",   accent: "bg-[#2D4EF5] text-white", initials: "ط" },
  { id: "benghanem",         name: "الأستاذة بن غانم",              subject: "الاجتماعيات",       subjectKey: "social",   accent: "bg-[#FFD600]", initials: "ب.غ" },
  { id: "boutata",           name: "الأستاذة بوطاطا",               subject: "الرياضيات",         subjectKey: "math",     accent: "bg-[#FF3B00] text-white", initials: "ب" },
  { id: "cherfia-hicham",    name: "الأستاذ شرفية أحمد هشام",       subject: "الرياضيات",         subjectKey: "math",     accent: "bg-[#FF3B00] text-white", initials: "ش.ه" },
  { id: "meziane",           name: "الأستاذة مزيان",                subject: "اللغة العربية",     subjectKey: "arabic",   accent: "bg-[#A78BFA]", initials: "م" },
  { id: "derouiche",         name: "الأستاذة درويش",                subject: "اللغة العربية",     subjectKey: "arabic",   accent: "bg-[#A78BFA]", initials: "د" },
  { id: "lemouness",         name: "الأستاذة لمونس",                subject: "اللغة العربية",     subjectKey: "arabic",   accent: "bg-[#A78BFA]", initials: "ل" },
  { id: "zaatri",            name: "الأستاذة زعتري",                subject: "الفرنسية",          subjectKey: "french",   accent: "bg-[#2D4EF5] text-white", initials: "ز" },
];

// Default section ordering per subject. For language/social teachers we drop
// the lab and 3D pages since they don't apply.
const SECTIONS_BY_SUBJECT: Record<Teacher["subjectKey"], TeacherSectionKey[]> = {
  science:  ["lab", "models3d", "resources", "exercises"],
  physics:  ["lab", "models3d", "resources", "exercises"],
  math:     ["models3d", "resources", "exercises"],
  english:  ["resources", "exercises"],
  french:   ["resources", "exercises"],
  arabic:   ["resources", "exercises"],
  social:   ["models3d", "resources", "exercises"],
};

export function getTeacher(id?: string | null): Teacher | null {
  if (!id) return null;
  return TEACHERS.find((t) => t.id === id) || null;
}

export function sectionsForTeacher(t: Teacher): TeacherSection[] {
  return SECTIONS_BY_SUBJECT[t.subjectKey].map((k) => ALL_SECTIONS[k]);
}
