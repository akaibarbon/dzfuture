import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Announcement {
  id: string;
  title: string;
  description: string;
  date: string;
}

export default function AnnouncementsPage() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<Announcement[]>([]);

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

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-4xl font-display font-bold text-glow mb-2">{t("ann.title")}</h1>
        <p className="text-muted-foreground">{t("ann.subtitle")}</p>
      </div>
      <div className="space-y-6">
        {events.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground border border-dashed border-border rounded-2xl glass-panel">
            {t("ann.empty")}
          </div>
        ) : (
          events.map((ev) => (
            <Card key={ev.id} className="glass-panel border-l-4 border-l-primary hover:bg-secondary/20 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-2xl font-display text-primary">{ev.title}</CardTitle>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground bg-background/40 px-3 py-1.5 rounded-full border border-border">
                    <Calendar className="w-3 h-3" /> {ev.date}
                  </span>
                </div>
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