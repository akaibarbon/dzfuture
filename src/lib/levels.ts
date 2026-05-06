// Système éducatif algérien — niveaux scolaires + branches du secondaire
// Used across the app for filtering content by user level.

export type LevelGroup = "primary" | "middle" | "secondary";

export interface LevelOption {
  value: string;          // canonical key, e.g. "p1", "m4", "s3-math"
  label: string;          // arabic display label
  group: LevelGroup;
  branchRequired?: boolean;
  // Per-level visual identity
  color: string;          // hsl primary tone
  icon: string;           // emoji
}

// Branches du 2e/3e année secondaire
export const SECONDARY_BRANCHES = [
  { value: "common", label: "جذع مشترك" },
  { value: "sciences", label: "علوم تجريبية" },
  { value: "math", label: "رياضيات" },
  { value: "tech-math", label: "تقني رياضي" },
  { value: "economy", label: "تسيير واقتصاد" },
  { value: "literature", label: "آداب وفلسفة" },
  { value: "languages", label: "لغات أجنبية" },
];

export const LEVELS: LevelOption[] = [
  // متوسطة حسان بورغود — المتوسط فقط
  { value: "m1", label: "السنة 1 متوسط", group: "middle", color: "30 95% 55%", icon: "📘" },
  { value: "m2", label: "السنة 2 متوسط", group: "middle", color: "25 92% 53%", icon: "📗" },
  { value: "m3", label: "السنة 3 متوسط", group: "middle", color: "20 90% 50%", icon: "📙" },
  { value: "m4", label: "السنة 4 متوسط (BEM)", group: "middle", color: "15 88% 48%", icon: "🎓" },
];

export function levelLabel(value?: string | null, branch?: string | null): string {
  if (!value) return "غير محدد";
  const lvl = LEVELS.find((l) => l.value === value);
  if (!lvl) return value;
  if (lvl.branchRequired && branch) {
    const b = SECONDARY_BRANCHES.find((br) => br.value === branch);
    return `${lvl.label}${b ? " — " + b.label : ""}`;
  }
  return lvl.label;
}

export function getLevelMeta(value?: string | null): LevelOption | null {
  if (!value) return null;
  return LEVELS.find((l) => l.value === value) || null;
}

// Grouped for select rendering
export const LEVEL_GROUPS: { key: LevelGroup; title: string }[] = [
  { key: "middle", title: "المتوسط" },
];

// Subjects per level group (used for lessons / radar / programme etc.)
export const SUBJECTS_BY_GROUP: Record<LevelGroup, string[]> = {
  primary: ["الرياضيات", "اللغة العربية", "الفرنسية", "التربية العلمية", "التربية الإسلامية"],
  middle: ["الرياضيات", "العلوم الطبيعية", "الفيزياء", "اللغة العربية", "الفرنسية", "الإنجليزية", "التاريخ والجغرافيا", "التربية الإسلامية", "الإعلام الآلي"],
  secondary: ["الرياضيات", "الفيزياء", "العلوم الطبيعية", "اللغة العربية", "الفرنسية", "الإنجليزية", "الفلسفة", "التاريخ والجغرافيا", "التربية الإسلامية", "علوم اقتصادية", "هندسة"],
};

export function subjectsForLevel(level?: string | null): string[] {
  const meta = getLevelMeta(level);
  if (!meta) return SUBJECTS_BY_GROUP.secondary;
  return SUBJECTS_BY_GROUP[meta.group];
}
