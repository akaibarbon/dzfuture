import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, CalendarClock, Search, BadgeCheck, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScheduleEntry {
  id: string;
  user_id: string | null;
  group_id: string | null;
  day_index: number;
  subject: string;
  start_time: string;
  end_time: string;
}

interface VerifiedGroup {
  id: string;
  name: string;
  is_verified: boolean;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const DAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi"];
const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];

export default function DailySchedulePage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({ dayIndex: 0, subject: "", startTime: "08:00", endTime: "09:00" });
  const [verifiedGroups, setVerifiedGroups] = useState<VerifiedGroup[]>([]);
  const [linkedGroupId, setLinkedGroupId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const getDayName = (idx: number) => {
    if (i18n.language === "ar") return DAYS_AR[idx] || DAYS[idx];
    if (i18n.language === "fr") return DAYS_FR[idx] || DAYS[idx];
    return DAYS[idx];
  };

  const fetchSchedule = async () => {
    if (!user?.id) return;
    setLoading(true);

    // Check if user is linked to a verified group schedule
    const { data: joinReq } = await supabase
      .from("group_join_requests")
      .select("group_id, status")
      .eq("user_id", user.id)
      .eq("status", "approved")
      .limit(1)
      .maybeSingle();

    if (joinReq) {
      // Check if group is verified
      const { data: grp } = await supabase
        .from("groups")
        .select("id, name, is_verified")
        .eq("id", joinReq.group_id)
        .eq("is_verified", true)
        .maybeSingle();

      if (grp) {
        setLinkedGroupId(grp.id);
        // Fetch group schedule
        const { data } = await supabase
          .from("daily_schedules")
          .select("*")
          .eq("group_id", grp.id)
          .order("day_index")
          .order("start_time");
        if (data && data.length > 0) {
          setEntries(data as ScheduleEntry[]);
          setLoading(false);
          return;
        }
      }
    }

    // Fetch personal schedule
    const { data } = await supabase
      .from("daily_schedules")
      .select("*")
      .eq("user_id", user.id)
      .is("group_id", null)
      .order("day_index")
      .order("start_time");
    if (data) setEntries(data as ScheduleEntry[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchSchedule();
  }, [user?.id]);

  useEffect(() => {
    const fetchVerified = async () => {
      const { data } = await supabase.from("groups").select("id, name, is_verified").eq("is_verified", true);
      if (data) setVerifiedGroups(data as VerifiedGroup[]);
    };
    fetchVerified();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !newEntry.subject) return;
    const { error } = await supabase.from("daily_schedules").insert({
      user_id: user.id,
      day_index: newEntry.dayIndex,
      subject: newEntry.subject,
      start_time: newEntry.startTime,
      end_time: newEntry.endTime,
    });
    if (!error) {
      setOpen(false);
      setNewEntry({ dayIndex: 0, subject: "", startTime: "08:00", endTime: "09:00" });
      fetchSchedule();
      toast({ title: t("sched.added") });
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("daily_schedules").delete().eq("id", id);
    fetchSchedule();
  };

  const groupedByDay = DAYS.map((_, idx) => entries.filter(e => e.day_index === idx));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-glow mb-1">{t("sched.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("sched.subtitle")}</p>
          {linkedGroupId && (
            <p className="text-xs text-primary mt-1 flex items-center gap-1">
              <BadgeCheck className="w-3 h-3" /> {t("sched.linkedGroup")}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSearchOpen(true)} className="border-primary/30 text-primary text-sm gap-1">
            <Search className="w-4 h-4" /> {t("sched.findClass")}
          </Button>
          {!linkedGroupId && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground font-bold text-sm gap-1">
                  <Plus className="w-4 h-4" /> {t("sched.add")}
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-panel sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle className="font-display text-xl text-primary">{t("sched.addEntry")}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAdd} className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>{t("sched.day")}</Label>
                    <Select value={String(newEntry.dayIndex)} onValueChange={v => setNewEntry({ ...newEntry, dayIndex: Number(v) })}>
                      <SelectTrigger className="bg-background/40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DAYS.map((_, i) => (
                          <SelectItem key={i} value={String(i)}>{getDayName(i)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("sched.subject")}</Label>
                    <Input required value={newEntry.subject} onChange={e => setNewEntry({ ...newEntry, subject: e.target.value })} className="bg-background/40" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>{t("sched.start")}</Label>
                      <Input type="time" value={newEntry.startTime} onChange={e => setNewEntry({ ...newEntry, startTime: e.target.value })} className="bg-background/40" />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("sched.end")}</Label>
                      <Input type="time" value={newEntry.endTime} onChange={e => setNewEntry({ ...newEntry, endTime: e.target.value })} className="bg-background/40" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-primary font-bold">{t("sched.save")}</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl glass-panel">
          <CalendarClock className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground text-sm">{t("sched.empty")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDay.map((dayEntries, dayIdx) => {
            if (dayEntries.length === 0) return null;
            return (
              <Card key={dayIdx} className="glass-panel overflow-hidden">
                <CardHeader className="py-3 px-4 bg-primary/5 border-b border-border">
                  <CardTitle className="font-display text-lg text-primary">{getDayName(dayIdx)}</CardTitle>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-border/50">
                  {dayEntries.map(entry => (
                    <div key={entry.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors">
                      <div className="text-xs text-muted-foreground font-mono w-24 flex-shrink-0">
                        {entry.start_time} - {entry.end_time}
                      </div>
                      <p className="flex-1 text-sm font-medium text-foreground">{entry.subject}</p>
                      {!linkedGroupId && (
                        <button onClick={() => handleDelete(entry.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Search verified groups dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="glass-panel sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-primary">{t("sched.findClassTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {verifiedGroups.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-6">{t("sched.noVerified")}</p>
            ) : (
              verifiedGroups.map(g => (
                <Card key={g.id} className="glass-panel p-3 flex items-center gap-3">
                  <BadgeCheck className="w-5 h-5 text-primary flex-shrink-0" />
                  <p className="flex-1 text-sm font-medium">{g.name}</p>
                  <Button size="sm" variant="outline" className="text-xs border-primary/30 text-primary" onClick={() => {
                    window.location.href = `/group/${g.id}`;
                  }}>
                    {t("sched.joinClass")}
                  </Button>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
