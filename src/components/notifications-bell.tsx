import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslation } from "react-i18next";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

export function NotificationsBell() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNotifications(data as Notification[]);
  };

  useEffect(() => {
    fetchNotifications();
    if (!user?.id) return;
    const channel = supabase
      .channel(`user-notifications-${user.id}-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => fetchNotifications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    if (!user?.id) return;
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    for (const id of unreadIds) {
      await supabase.from("notifications").update({ read: true }).eq("id", id);
    }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const typeIcon: Record<string, string> = {
    join_approved: "✅",
    join_rejected: "❌",
    new_message: "💬",
    new_event: "📢",
    info: "ℹ️",
  };

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) markAllRead(); }}>
      <PopoverTrigger asChild>
        <button className="relative p-2 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-secondary/50">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 glass-panel" align="end">
        <div className="p-3 border-b border-border">
          <h3 className="font-display font-bold text-sm text-primary">{t("notif.title")}</h3>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">{t("notif.empty")}</p>
          ) : (
            notifications.map(n => (
              <div key={n.id} className={`px-3 py-2.5 border-b border-border/50 hover:bg-secondary/30 transition-colors ${!n.read ? "bg-primary/5" : ""}`}>
                <div className="flex items-start gap-2">
                  <span className="text-base mt-0.5">{typeIcon[n.type] || "ℹ️"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
