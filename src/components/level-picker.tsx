import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LEVELS, LEVEL_GROUPS, SECONDARY_BRANCHES, getLevelMeta } from "@/lib/levels";
import { Label } from "@/components/ui/label";

interface Props {
  level: string | null;
  branch: string | null;
  onLevelChange: (v: string) => void;
  onBranchChange: (v: string) => void;
  required?: boolean;
  allowAny?: boolean; // adds "all levels" option
}

export function LevelPicker({ level, branch, onLevelChange, onBranchChange, allowAny }: Props) {
  const meta = getLevelMeta(level);
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>المستوى الدراسي</Label>
        <Select value={level || ""} onValueChange={onLevelChange}>
          <SelectTrigger className="bg-background/40 h-11"><SelectValue placeholder="اختر مستواك..." /></SelectTrigger>
          <SelectContent>
            {allowAny && <SelectItem value="__any__">كل المستويات</SelectItem>}
            {LEVEL_GROUPS.map((g) => (
              <SelectGroup key={g.key}>
                <SelectLabel className="text-primary">{g.title}</SelectLabel>
                {LEVELS.filter((l) => l.group === g.key).map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    <span className="mr-1">{l.icon}</span> {l.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>
      {meta?.branchRequired && (
        <div className="space-y-2">
          <Label>الشعبة</Label>
          <Select value={branch || ""} onValueChange={onBranchChange}>
            <SelectTrigger className="bg-background/40 h-11"><SelectValue placeholder="اختر الشعبة..." /></SelectTrigger>
            <SelectContent>
              {SECONDARY_BRANCHES.filter((b) => b.value !== "common").map((b) => (
                <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
