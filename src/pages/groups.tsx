import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Unlock, Users, Plus, BadgeCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface Group {
  id: string;
  name: string;
  is_private: boolean;
  password?: string;
  created_by: string | null;
  is_verified: boolean;
  created_at: string;
}

export default function GroupsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [groups, setGroups] = useState<Group[]>([]);
  const [newGroup, setNewGroup] = useState({ name: "", isPrivate: false, password: "" });
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroup.name.trim()) return;
    const { error } = await supabase.from("groups").insert({
      name: newGroup.name,
      is_private: newGroup.isPrivate,
      password: newGroup.isPrivate ? newGroup.password : null,
      created_by: user?.id || null,
    });
    if (error) {
      toast({ title: t("ai.error"), description: error.message, variant: "destructive" });
    } else {
      setNewGroup({ name: "", isPrivate: false, password: "" });
      setOpen(false);
      toast({ title: t("grp.forged"), description: t("grp.forgedDesc") });
    }
  };

  const handleJoin = (group: Group) => {
    if (!group.is_private) {
      navigate(`/group/${group.id}`);
      return;
    }
    setSelectedGroup(group);
  };

  const submitJoinPassword = () => {
    if (!selectedGroup) return;
    if (joinPassword === selectedGroup.password) {
      navigate(`/group/${selectedGroup.id}`);
      setSelectedGroup(null);
      setJoinPassword("");
    } else {
      toast({ title: t("grp.accessDenied"), description: t("grp.wrongPassword"), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((g) => (
          <Card key={g.id} className="glass-panel hover:border-primary/40 transition-colors flex flex-col">
            <CardHeader>
              <CardTitle className="flex justify-between items-start font-display">
                <span className="text-xl line-clamp-1 flex items-center gap-2">
                  {g.name}
                  {g.is_verified && <BadgeCheck className="w-4 h-4 text-primary" />}
                </span>
                {g.is_private ? <Lock className="w-5 h-5 text-destructive" /> : <Unlock className="w-5 h-5 text-green-500" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" /> {t("grp.guild")}
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleJoin(g)} variant={g.is_private ? "outline" : "default"} className={`w-full ${!g.is_private && 'bg-primary/20 text-primary hover:bg-primary/30 border-none'}`}>
                {g.is_private ? t("grp.requestEntry") : t("grp.enterChamber")}
              </Button>
            </CardFooter>
          </Card>
        ))}
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
