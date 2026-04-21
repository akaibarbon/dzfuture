import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { useLevelTheme, useLevelBadge } from "@/hooks/use-level-theme";
import { supabase } from "@/integrations/supabase/client";
import {
  Home, Bell, CalendarDays, Users, Bot,
  BookOpen, Settings, LogOut, BookMarked, Menu, X, Shield, Sun, Moon, MessageSquare, CalendarClock, Calculator, Target, ScanLine, Globe
} from "lucide-react";
import { useState } from "react";
import logoImg from "@/assets/logo.png";
import { NotificationsBell } from "@/components/notifications-bell";
import { LevelGate } from "@/components/level-gate";
import { BookOpenCheck } from "lucide-react";
import { VoiceAssistant } from "@/components/voice-assistant";
import { AccessibilityPanel } from "@/components/accessibility-panel";
import { useAppSettings, applyAppSettings } from "@/hooks/use-app-settings";
import { updateStreak, awardBadge } from "@/lib/gamification";

export function Layout({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { currentTheme } = useTheme();
  const { isDark, toggle: toggleDark } = useDarkMode();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useLevelTheme();
  const levelBadge = useLevelBadge();

  // Apply accessibility settings on mount
  useEffect(() => {
    applyAppSettings(useAppSettings.getState());
  }, []);

  useEffect(() => {
    const trackVisit = async () => {
      const visitorHash = localStorage.getItem("uno-visitor-id") || crypto.randomUUID();
      localStorage.setItem("uno-visitor-id", visitorHash);
      await supabase.from("site_visits").insert({ visitor_hash: visitorHash });
    };
    trackVisit();
    // Update daily streak + first_login badge
    if (user?.id) {
      updateStreak(user.id);
      awardBadge(user.id, "first_login");
    }
  }, [user?.id]);

  useEffect(() => {
    if (currentTheme) {
      document.documentElement.style.setProperty("--primary", currentTheme);
      document.documentElement.style.setProperty("--accent", currentTheme);
      document.documentElement.style.setProperty("--ring", currentTheme);
    }
  }, [currentTheme]);

  useEffect(() => {
    const savedFont = localStorage.getItem("uno-font");
    if (savedFont) {
      const fonts: Record<string, string> = {
        default: "'DM Sans', sans-serif",
        cinzel: "'Cinzel', serif",
        mono: "'Courier New', monospace",
        serif: "Georgia, serif",
        comic: "'Comic Sans MS', cursive",
      };
      if (fonts[savedFont]) document.body.style.fontFamily = fonts[savedFont];
    }
  }, []);

  const cycleLang = () => {
    const langs = ["fr", "en", "ar"];
    const next = langs[(langs.indexOf(i18n.language) + 1) % langs.length];
    i18n.changeLanguage(next);
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
  };

  const isAdmin = user?.serialNumber?.toUpperCase() === "EJ76" || user?.email?.toLowerCase() === "boukaachey@gmail.com";

  const navItems = [
    { href: "/hub", label: t("Hub"), icon: Home },
    { href: "/announcements", label: t("Announcements"), icon: Bell },
    { href: "/agenda", label: t("Agenda"), icon: CalendarDays },
    { href: "/daily-schedule", label: t("DailySchedule"), icon: CalendarClock },
    { href: "/groups", label: t("Groups"), icon: Users },
    { href: "/messages", label: t("Messages"), icon: MessageSquare },
    { href: "/ai-chat", label: t("AIChat"), icon: Bot },
    { href: "/lessons", label: "الدروس", icon: BookOpenCheck },
    ...(user?.role === "tutor" && user?.approved !== false ? [{ href: "/auto-grader", label: "المصحّح الآلي", icon: ScanLine }] : []),
    { href: "/programme", label: t("Programme"), icon: BookOpen },
    { href: "/gpa-calculator", label: t("GPACalculator"), icon: Calculator },
    { href: "/knowledge-radar", label: t("KnowledgeRadar"), icon: Target },
    { href: "/study-helps", label: t("StudyHelps"), icon: BookMarked },
    { href: "/account", label: t("Account"), icon: Settings },
    ...(isAdmin ? [{ href: "/control-panel", label: t("ControlPanel"), icon: Shield }] : []),
  ];

  const handleLogout = () => {
    logout();
    window.location.href = "/auth";
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="w-64 hidden md:flex flex-col border-r border-border/50 bg-card/30 backdrop-blur-xl relative z-10">
        <div className="p-6 pb-3">
          <Link to="/hub" className="flex items-center gap-3 group cursor-pointer">
            <img src={logoImg} alt="Future DZ" className="w-9 h-9 drop-shadow-[0_0_10px_hsl(var(--primary)/0.4)]" />
            <span className="font-display font-bold text-xl tracking-widest text-glow">Future DZ</span>
          </Link>
          {levelBadge && (
            <div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-xs">
              <span className="text-base">{levelBadge.icon}</span>
              <span className="font-medium truncate">{levelBadge.label}</span>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link key={item.href} to={item.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 relative overflow-hidden group text-sm ${isActive ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}>
                {isActive && <motion.div layoutId="activeNav" className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-xl z-0" />}
                <item.icon className={`w-4 h-4 relative z-10 flex-shrink-0 ${isActive ? "drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]" : ""}`} />
                <span className="relative z-10 truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border/50">
          <div className="flex items-center justify-between gap-1 px-1 py-1.5">
            <button onClick={cycleLang} title="Language" className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-primary hover:bg-secondary/50 transition-colors">
              <Globe className="w-4 h-4" />
              <span>{i18n.language}</span>
            </button>
            <NotificationsBell />
            <button onClick={toggleDark} title="Theme" className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-secondary/50">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={handleLogout} title="Logout" className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded-lg hover:bg-destructive/10">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="md:hidden h-14 border-b border-border/50 flex items-center justify-between px-3 bg-card/50 backdrop-blur-md z-20">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="Future DZ" className="w-7 h-7" />
            <span className="font-display font-bold text-lg tracking-widest text-primary">Future DZ</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={cycleLang} title="Language" className="flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground hover:text-primary px-1.5 py-1 rounded">
              <Globe className="w-3.5 h-3.5" />
              <span>{i18n.language}</span>
            </button>
            <NotificationsBell />
            <button onClick={toggleDark} className="p-1.5 text-muted-foreground hover:text-primary">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-1.5 text-foreground">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="md:hidden absolute top-14 left-0 right-0 bg-card/95 backdrop-blur-xl border-b border-border z-30 p-3 space-y-1 max-h-[70vh] overflow-y-auto">
              {navItems.map((item) => (
                <Link key={item.href} to={item.href} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors text-sm">
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
              <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-destructive hover:bg-destructive/10 w-full text-sm">
                <LogOut className="w-4 h-4" />
                <span>{t("Logout")}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 overflow-y-auto p-3 md:p-6 relative z-0">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
      <LevelGate />
      <VoiceAssistant />
      <AccessibilityPanel />
    </div>
  );
}
