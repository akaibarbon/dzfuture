import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Calendar, GraduationCap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { LEVELS, levelLabel, getLevelMeta } from "@/lib/levels";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Announcement {
  id: string;
  title: string;
  description: string;
  date: string;
  level?: string | null;
}

export default function AnnouncementsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [events, setEvents] = useState<Announcement[]>([]);
  const [filter, setFilter] = useState<string>(user?.level ? "__mine__" : "__all__");

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
      if (data) setEvents(data as Announcement[]);
    };
    fetchAnnouncements();

    const channel = supabase
      .channel("announcements-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => fetchAnnouncements())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = useMemo(() => {
    if (filter === "__mine__" && user?.level) {
      return events.filter((e) => !e.level || e.level === user.level);
    }
    if (filter === "__all__") return events;
    return events.filter((e) => e.level === filter);
  }, [events, filter, user?.level]);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-4xl font-display font-bold text-glow mb-2">{t("ann.title")}</h1>
        <p className="text-muted-foreground">{t("ann.subtitle")}</p>
      </div>
      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="bg-background/40 h-11 max-w-sm"><GraduationCap className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
        <SelectContent>
          {user?.level && <SelectItem value="__mine__">إعلانات مستواي ({levelLabel(user.level)})</SelectItem>}
          <SelectItem value="__all__">كل الإعلانات</SelectItem>
          {LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.icon} {l.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <div className="space-y-6">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground border border-dashed border-border rounded-2xl glass-panel">
            {t("ann.empty")}
          </div>
        ) : (
          filtered.map((ev) => (
            <Card key={ev.id} className="glass-panel border-l-4 border-l-primary hover:bg-secondary/20 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2 flex-wrap">
                  <CardTitle className="text-2xl font-display text-primary">{ev.title}</CardTitle>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground bg-background/40 px-3 py-1.5 rounded-full border border-border">
                    <Calendar className="w-3 h-3" /> {ev.date}
                  </span>
                </div>
                {ev.level && (
                  <p className="text-xs flex items-center gap-1 mt-1" style={{ color: `hsl(${getLevelMeta(ev.level)?.color || "var(--primary)"})` }}>
                    <GraduationCap className="w-3 h-3" />{levelLabel(ev.level)}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">{ev.description}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
