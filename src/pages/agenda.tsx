import { useState } from "react";
import { useLocalData, AgendaItem } from "@/hooks/use-local-data";
import { useAITools } from "@/hooks/use-ai-tools";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarDays, Plus, Check, Trash2, Clock, Sparkles, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";

const typeColors: Record<string, string> = {
  exam: "bg-red-500/20 text-red-400 border-red-500/30",
  homework: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  revision: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  meeting: "bg-green-500/20 text-green-400 border-green-500/30",
  other: "bg-muted text-muted-foreground border-border",
};

export default function AgendaPage() {
  const { agendaItems, addAgendaItem, toggleAgendaItem, removeAgendaItem } = useLocalData();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { callAI, loading: aiLoading } = useAITools();
  const [newItem, setNewItem] = useState({ title: "", date: "", time: "", type: "other" as AgendaItem['type'] });
  const [open, setOpen] = useState(false);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.title || !newItem.date) return;
    addAgendaItem({ ...newItem, completed: false });
    setNewItem({ title: "", date: "", time: "", type: "other" });
    setOpen(false);
  };

  const handleAISuggest = async () => {
    const subjects = "Mathematics, Physics, Science, Arabic, French, English, Philosophy, Islamic Studies, History & Geography";
    const existingTasks = agendaItems.filter(i => !i.completed).map(i => i.title).join(", ");
    const result = await callAI("suggest-tasks", { subjects, existingTasks });
    if (!result) return;

    try {
      // Extract JSON array from the response
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON found");
      const tasks = JSON.parse(jsonMatch[0]);
      let added = 0;
      for (const task of tasks) {
        if (task.title && task.date) {
          addAgendaItem({
            title: task.title,
            date: task.date,
            time: task.time || "",
            type: (["exam", "homework", "revision", "meeting", "other"].includes(task.type) ? task.type : "other") as AgendaItem['type'],
            completed: false,
          });
          added++;
        }
      }
      toast({ title: t("agenda.aiAdded"), description: t("agenda.aiAddedDesc", { count: added }) });
    } catch {
      toast({ title: t("ai.error"), description: "Failed to parse AI suggestions", variant: "destructive" });
    }
  };

  const sortedItems = [...agendaItems].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const upcoming = sortedItems.filter(i => !i.completed);
  const completed = sortedItems.filter(i => i.completed);

  const typeLabel = (type: string) => t(`agenda.${type}`);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-4xl font-display font-bold text-glow mb-2">{t("agenda.title")}</h1>
          <p className="text-muted-foreground">{t("agenda.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleAISuggest}
            disabled={aiLoading}
            variant="outline"
            className="border-primary/30 text-primary hover:bg-primary/10 font-bold gap-2"
          >
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {t("agenda.aiSuggest")}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground font-bold shadow-[0_0_15px_hsla(43,74%,49%,0.3)]">
                <Plus className="w-5 h-5 mr-2" /> {t("agenda.addTask")}
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-panel sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl text-primary">{t("agenda.newTask")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>{t("agenda.taskTitle")}</Label>
                  <Input required value={newItem.title} onChange={(e) => setNewItem({...newItem, title: e.target.value})} className="bg-background/40" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("agenda.date")}</Label>
                    <Input required type="date" value={newItem.date} onChange={(e) => setNewItem({...newItem, date: e.target.value})} className="bg-background/40" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("agenda.time")}</Label>
                    <Input type="time" value={newItem.time} onChange={(e) => setNewItem({...newItem, time: e.target.value})} className="bg-background/40" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("agenda.type")}</Label>
                  <Select value={newItem.type} onValueChange={(v: any) => setNewItem({...newItem, type: v})}>
                    <SelectTrigger className="bg-background/40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exam">{t("agenda.exam")}</SelectItem>
                      <SelectItem value="homework">{t("agenda.homework")}</SelectItem>
                      <SelectItem value="revision">{t("agenda.revision")}</SelectItem>
                      <SelectItem value="meeting">{t("agenda.meeting")}</SelectItem>
                      <SelectItem value="other">{t("agenda.other")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full bg-primary font-bold">{t("agenda.addToAgenda")}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {upcoming.length === 0 && completed.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border border-dashed border-border rounded-2xl glass-panel">
          <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{t("agenda.empty")}</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-display font-bold text-foreground">{t("agenda.upcoming")}</h2>
              {upcoming.map((item, i) => (
                <motion.div key={item.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="glass-panel hover:border-primary/30 transition-colors">
                    <CardContent className="flex items-center gap-4 py-4">
                      <button onClick={() => toggleAgendaItem(item.id)} className="w-6 h-6 rounded-full border-2 border-primary/50 flex items-center justify-center hover:bg-primary/20 transition-colors flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{item.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {item.date}</span>
                          {item.time && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {item.time}</span>}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${typeColors[item.type]}`}>{typeLabel(item.type)}</span>
                      <button onClick={() => removeAgendaItem(item.id)} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
          {completed.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-display font-bold text-muted-foreground">{t("agenda.completed")}</h2>
              {completed.map((item) => (
                <Card key={item.id} className="glass-panel opacity-50">
                  <CardContent className="flex items-center gap-4 py-4">
                    <button onClick={() => toggleAgendaItem(item.id)} className="w-6 h-6 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center flex-shrink-0"><Check className="w-3 h-3 text-primary" /></button>
                    <p className="font-medium text-muted-foreground line-through flex-1">{item.title}</p>
                    <button onClick={() => removeAgendaItem(item.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
