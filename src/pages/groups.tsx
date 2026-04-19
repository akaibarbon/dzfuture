import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Unlock, Users, Plus, BadgeCheck, Search, Hash, GraduationCap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { LEVELS, levelLabel, getLevelMeta } from "@/lib/levels";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Group {
  id: string;
  name: string;
  is_private: boolean;
  password?: string;
  created_by: string | null;
  is_verified: boolean;
  created_at: string;
  serial_number?: string | null;
  background_url?: string | null;
  description?: string | null;
  level?: string | null;
}

const PASSWORD_CACHE_KEY = "group_pwd_cache_v1";

function getCachedGroups(): Set<string> {
  try {
    const raw = sessionStorage.getItem(PASSWORD_CACHE_KEY);
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function cacheGroupAccess(id: string) {
  const set = getCachedGroups();
  set.add(id);
  sessionStorage.setItem(PASSWORD_CACHE_KEY, JSON.stringify([...set]));
}

export default function GroupsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState("");
  const [newGroup, setNewGroup] = useState({ name: "", isPrivate: false, password: "", description: "", level: "" });
  const [levelFilter, setLevelFilter] = useState<string>(user?.level || "__mine__");
  const [joinPassword, setJoinPassword] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [open, setOpen] = useState(false);

  const fetchGroups = async () => {
    const { data } = await supabase.from("groups").select("*").order("created_at", { ascending: false });
    if (data) setGroups(data as Group[]);
  };

  useEffect(() => {
    fetchGroups();
    const channel = supabase
      .channel("groups-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "groups" }, () => fetchGroups())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredGroups = useMemo(() => {
    let list = groups;
    // Level filter: "__all__" = all, "__mine__" = user's level + groups with no level, else specific level
    if (levelFilter === "__mine__" && user?.level) {
      list = list.filter((g) => !g.level || g.level === user.level);
    } else if (levelFilter !== "__all__" && levelFilter !== "__mine__") {
      list = list.filter((g) => g.level === levelFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          (g.serial_number || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [groups, search, levelFilter, user?.level]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroup.name.trim()) return;
    const { error } = await supabase.from("groups").insert({
      name: newGroup.name,
      is_private: newGroup.isPrivate,
      password: newGroup.isPrivate ? newGroup.password : null,
      description: newGroup.description || null,
      level: newGroup.level || null,
      created_by: user?.id || null,
    });
    if (error) {
      toast({ title: t("ai.error"), description: error.message, variant: "destructive" });
    } else {
      setNewGroup({ name: "", isPrivate: false, password: "", description: "", level: "" });
      setOpen(false);
      toast({ title: t("grp.forged"), description: t("grp.forgedDesc") });
    }
  };

  const handleJoin = (group: Group) => {
    if (!group.is_private || group.created_by === user?.id || getCachedGroups().has(group.id)) {
      navigate(`/group/${group.id}`);
      return;
    }
    setSelectedGroup(group);
  };

  const submitJoinPassword = () => {
    if (!selectedGroup) return;
    if (joinPassword === selectedGroup.password) {
      cacheGroupAccess(selectedGroup.id);
      navigate(`/group/${selectedGroup.id}`);
      setSelectedGroup(null);
      setJoinPassword("");
    } else {
      toast({ title: t("grp.accessDenied"), description: t("grp.wrongPassword"), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-glow mb-2">{t("grp.title")}</h1>
          <p className="text-muted-foreground">{t("grp.subtitle")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground font-bold shadow-[0_0_15px_hsla(43,74%,49%,0.3)]">
              <Plus className="w-5 h-5 mr-2" /> {t("grp.forge")}
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-panel sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl text-primary">{t("grp.createTitle")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>{t("grp.name")}</Label>
                <Input required value={newGroup.name} onChange={(e) => setNewGroup({...newGroup, name: e.target.value})} className="bg-background/40" />
              </div>
              <div className="space-y-2">
                <Label>{t("grp.descLabel") || "وصف (اختياري)"}</Label>
                <Input value={newGroup.description} onChange={(e) => setNewGroup({...newGroup, description: e.target.value})} className="bg-background/40" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="private" checked={newGroup.isPrivate} onChange={(e) => setNewGroup({...newGroup, isPrivate: e.target.checked})} className="accent-primary w-4 h-4" />
                <Label htmlFor="private">{t("grp.private")}</Label>
              </div>
              {newGroup.isPrivate && (
                <div className="space-y-2">
                  <Label>{t("grp.password")}</Label>
                  <Input required type="password" value={newGroup.password} onChange={(e) => setNewGroup({...newGroup, password: e.target.value})} className="bg-background/40" />
                </div>
              )}
              <Button type="submit" className="w-full bg-primary font-bold">{t("grp.create")}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search bar */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("grp.searchPlaceholder") || "ابحث بالاسم أو الرقم التسلسلي..."}
          className="pl-10 bg-background/40 border-border h-11"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGroups.length === 0 && (
          <p className="text-muted-foreground col-span-full text-center py-8">
            {t("grp.noResults") || "لا توجد نتائج."}
          </p>
        )}
        {filteredGroups.map((g) => {
          const isOwner = g.created_by === user?.id;
          return (
            <Card key={g.id} className="glass-panel hover:border-primary/40 transition-colors flex flex-col overflow-hidden">
              {g.background_url && (
                <div className="h-20 w-full bg-cover bg-center" style={{ backgroundImage: `url(${g.background_url})` }} />
              )}
              <CardHeader>
                <CardTitle className="flex justify-between items-start font-display">
                  <span className="text-xl line-clamp-1 flex items-center gap-2">
                    {g.name}
                    {g.is_verified && <BadgeCheck className="w-4 h-4 text-primary" />}
                  </span>
                  {g.is_private ? <Lock className="w-5 h-5 text-destructive" /> : <Unlock className="w-5 h-5 text-green-500" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-2">
                {g.description && <p className="text-xs text-muted-foreground line-clamp-2">{g.description}</p>}
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" /> {t("grp.guild")}
                  {isOwner && <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full">{t("grp.owner") || "مالك"}</span>}
                </p>
                {g.serial_number && (
                  <p className="text-[11px] text-muted-foreground/80 font-mono flex items-center gap-1">
                    <Hash className="w-3 h-3" />{g.serial_number}
                  </p>
                )}
              </CardContent>
              <CardFooter>
                <Button onClick={() => handleJoin(g)} variant={g.is_private && !isOwner ? "outline" : "default"} className={`w-full ${(!g.is_private || isOwner) && 'bg-primary/20 text-primary hover:bg-primary/30 border-none'}`}>
                  {g.is_private && !isOwner && !getCachedGroups().has(g.id) ? t("grp.requestEntry") : t("grp.enterChamber")}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!selectedGroup} onOpenChange={(v) => !v && setSelectedGroup(null)}>
        <DialogContent className="glass-panel sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-primary flex items-center gap-2">
              <Lock className="w-6 h-6" /> {t("grp.unlockTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-muted-foreground text-sm">{t("grp.unlockDesc")}</p>
            <Input type="password" placeholder={t("grp.password")} value={joinPassword} onChange={(e) => setJoinPassword(e.target.value)} className="bg-background/40" />
            <Button onClick={submitJoinPassword} className="w-full bg-primary font-bold">{t("grp.unlock")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
