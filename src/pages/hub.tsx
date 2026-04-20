import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { BrainCircuit, BookMarked, Users, Globe2, Sparkles, CalendarDays, BookOpen, MessageSquare, CalendarClock, Calculator, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { XPDisplay } from "@/components/xp-display";

export default function HubPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [visits, setVisits] = useState(0);

  useEffect(() => {
    const fetchVisits = async () => {
      const { count } = await supabase.from("site_visits").select("*", { count: "exact", head: true });
      if (count !== null) setVisits(count);
    };
    fetchVisits();
  }, []);

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const item = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

  const cards = [
    { href: "/groups", icon: Users, title: t("hub.groupup"), desc: t("hub.groupupDesc") },
    { href: "/messages", icon: MessageSquare, title: t("hub.messages"), desc: t("hub.messagesDesc") },
    { href: "/ai-chat", icon: BrainCircuit, title: t("hub.oracle"), desc: t("hub.oracleDesc") },
    { href: "/agenda", icon: CalendarDays, title: t("hub.agenda"), desc: t("hub.agendaDesc") },
    { href: "/daily-schedule", icon: CalendarClock, title: t("hub.schedule"), desc: t("hub.scheduleDesc") },
    { href: "/programme", icon: BookOpen, title: t("hub.programme"), desc: t("hub.programmeDesc") },
    { href: "/gpa-calculator", icon: Calculator, title: t("hub.gpa"), desc: t("hub.gpaDesc") },
    { href: "/knowledge-radar", icon: Target, title: t("hub.radar"), desc: t("hub.radarDesc") },
    { href: "/study-helps", icon: BookMarked, title: t("hub.studylore"), desc: t("hub.studyloreDesc") },
    { href: "/announcements", icon: Sparkles, title: t("hub.announcements"), desc: t("hub.announcementsDesc") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-glow mb-1">{t("hub.welcome", { name: user?.fullName || t("hub.traveler") })}</h1>
          <p className="text-muted-foreground text-sm md:text-base">{t("hub.subtitle")}</p>
        </div>
        <div className="px-4 py-2 rounded-xl bg-card border border-border shadow-lg flex items-center gap-2">
          <Globe2 className="w-4 h-4 text-primary" />
          <span className="font-medium text-xs text-muted-foreground">{t("hub.visitors")}</span>
          <span className="text-lg font-bold font-mono text-primary">{visits}</span>
        </div>
      </div>

      <XPDisplay />

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {cards.map((card) => (
          <motion.div key={card.href} variants={item}>
            <Link to={card.href}>
              <Card className="h-full overflow-hidden relative group cursor-pointer bg-[hsl(var(--card))] hover:bg-[hsl(var(--card-elevated,var(--card)))] border-border hover:border-primary/40 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="p-3 md:p-4 pb-1 md:pb-2">
                  <card.icon className="w-7 h-7 md:w-8 md:h-8 text-primary mb-1.5 drop-shadow-md" />
                  <CardTitle className="font-display text-sm md:text-base lg:text-lg leading-tight">{card.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-3 md:p-4 pt-0">
                  <p className="text-muted-foreground text-xs md:text-sm leading-snug line-clamp-2">{card.desc}</p>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
