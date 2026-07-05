import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Navigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldAlert,
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  Eye,
  EyeOff,
  Sparkles,
  Search,
  ExternalLink,
  Clock,
} from "lucide-react";
import {
  TTItem,
  TTKind,
  TTStatus,
  KIND_LABELS,
  STATUS_LABELS,
  fetchAllItems,
  upsertItem,
  deleteItem,
  setItemStatus,
  shiftSortOrder,
} from "@/lib/teach-technics";

const KIND_ORDER: TTKind[] = ["tip", "method", "tool", "research", "video", "site"];

function toLines(arr: string[] | null | undefined) {
  return (arr ?? []).join("\n");
}
function fromLines(s: string): string[] {
  return s
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}
function toTags(s: string): string[] {
  return s
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

interface ItemFormProps {
  kind: TTKind;
  initial?: TTItem | null;
  onSaved: () => void;
  onClose: () => void;
  isAdmin: boolean;
  userId: string;
}

function ItemForm({ kind, initial, onSaved, onClose, isAdmin, userId }: ItemFormProps) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [logoUrl, setLogoUrl] = useState(initial?.logo_url ?? "");
  const [category, setCategory] = useState(initial?.category ?? "writing");
  const [level, setLevel] = useState(initial?.level ?? "مبتدئ");
  const [isFree, setIsFree] = useState<boolean>(initial?.is_free ?? true);
  const [tagsStr, setTagsStr] = useState((initial?.tags ?? []).join(", "));
  const [body, setBody] = useState(initial?.body ?? "");
  const [features, setFeatures] = useState(toLines(initial?.features));
  const [howTo, setHowTo] = useState(toLines(initial?.how_to));
  const [status, setStatus] = useState<TTStatus>(
    initial?.status ?? (isAdmin ? "published" : "pending_review"),
  );
  const [sortOrder, setSortOrder] = useState<number>(initial?.sort_order ?? 0);

  const showUrl = kind !== "tip";
  const showLogo = kind === "tool";
  const showSubtitle = kind !== "tip";
  const showToolFields = kind === "tool";
  const showBody = kind === "tip" || kind === "method" || kind === "site";

  const save = async () => {
    if (!title.trim()) {
      toast({ title: "العنوان مطلوب", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const payload: any = {
        kind,
        title: title.trim(),
        subtitle: showSubtitle ? subtitle.trim() || null : null,
        url: showUrl ? url.trim() || null : null,
        logo_url: showLogo ? logoUrl.trim() || null : null,
        category: showToolFields ? category : null,
        level: showToolFields ? level : null,
        is_free: showToolFields ? isFree : null,
        tags: toTags(tagsStr),
        body: showBody ? body.trim() || null : null,
        features: showToolFields ? fromLines(features) : [],
        how_to: showToolFields ? fromLines(howTo) : [],
        sort_order: Number(sortOrder) || 0,
        status: isAdmin ? status : "pending_review",
      };
      if (initial?.id) payload.id = initial.id;
      else payload.created_by = userId;
      await upsertItem(payload);
      toast({ title: initial?.id ? "تم التحديث" : "تمت الإضافة" });
      onSaved();
      onClose();
    } catch (e: any) {
      toast({ title: "خطأ", description: e?.message ?? "فشل الحفظ", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3" dir="rtl">
      <div>
        <Label>العنوان</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      {showSubtitle && (
        <div>
          <Label>
            {kind === "method"
              ? "الدولة/المصدر"
              : kind === "video"
              ? "القناة"
              : kind === "research"
              ? "المنظمة/السنة"
              : "سطر توضيحي"}
          </Label>
          <Input value={subtitle ?? ""} onChange={(e) => setSubtitle(e.target.value)} />
        </div>
      )}
      {showUrl && (
        <div>
          <Label>الرابط</Label>
          <Input
            type="url"
            placeholder="https://..."
            value={url ?? ""}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
      )}
      {showLogo && (
        <div>
          <Label>رابط الشعار (اختياري)</Label>
          <Input
            placeholder="https://.../logo.png"
            value={logoUrl ?? ""}
            onChange={(e) => setLogoUrl(e.target.value)}
          />
        </div>
      )}
      {showToolFields && (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label>التصنيف</Label>
            <Select value={category ?? "writing"} onValueChange={(v) => setCategory(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="writing">كتابة</SelectItem>
                <SelectItem value="visual">بصري</SelectItem>
                <SelectItem value="audio">صوت</SelectItem>
                <SelectItem value="research">بحث</SelectItem>
                <SelectItem value="classroom">قسم</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>المستوى</Label>
            <Select value={level ?? "مبتدئ"} onValueChange={(v) => setLevel(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="مبتدئ">مبتدئ</SelectItem>
                <SelectItem value="متوسط">متوسط</SelectItem>
                <SelectItem value="متقدم">متقدم</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>السعر</Label>
            <Select value={isFree ? "free" : "paid"} onValueChange={(v) => setIsFree(v === "free")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">مجاني</SelectItem>
                <SelectItem value="paid">مدفوع</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      <div>
        <Label>الوسوم (مفصولة بفاصلة)</Label>
        <Input
          value={tagsStr}
          onChange={(e) => setTagsStr(e.target.value)}
          placeholder="Google, بحث, PDF"
        />
      </div>
      {showBody && (
        <div>
          <Label>الوصف</Label>
          <Textarea rows={3} value={body ?? ""} onChange={(e) => setBody(e.target.value)} />
        </div>
      )}
      {showToolFields && (
        <>
          <div>
            <Label>الميزات (سطر لكل ميزة)</Label>
            <Textarea rows={4} value={features} onChange={(e) => setFeatures(e.target.value)} />
          </div>
          <div>
            <Label>كيف تستعمله (سطر لكل خطوة)</Label>
            <Textarea rows={4} value={howTo} onChange={(e) => setHowTo(e.target.value)} />
          </div>
        </>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>الترتيب</Label>
          <Input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
          />
        </div>
        {isAdmin && (
          <div>
            <Label>الحالة</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TTStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="pending_review">قيد المراجعة</SelectItem>
                <SelectItem value="published">منشور</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={busy}>
          إلغاء
        </Button>
        <Button onClick={save} disabled={busy}>
          {busy ? "..." : "حفظ"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function StatusBadge({ status }: { status: TTStatus }) {
  const cls =
    status === "published"
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      : status === "pending_review"
      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
      : "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={cls}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

interface KindTabProps {
  kind: TTKind | "pending";
  items: TTItem[];
  isAdmin: boolean;
  userId: string;
  onRefresh: () => void;
}

function KindTab({ kind, items, isAdmin, userId, onRefresh }: KindTabProps) {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<TTItem | null>(null);
  const [creating, setCreating] = useState(false);

  const isPending = kind === "pending";
  const formKind: TTKind = isPending ? "tool" : (kind as TTKind);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let list = isPending ? items.filter((i) => i.status === "pending_review") : items;
    if (s) {
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(s) ||
          (i.subtitle ?? "").toLowerCase().includes(s) ||
          i.tags.some((t) => t.toLowerCase().includes(s)),
      );
    }
    return list;
  }, [items, q, isPending]);

  const doDelete = async (item: TTItem) => {
    if (!confirm(`حذف "${item.title}"؟`)) return;
    try {
      await deleteItem(item.id);
      toast({ title: "تم الحذف" });
      onRefresh();
    } catch (e: any) {
      toast({ title: "خطأ", description: e?.message, variant: "destructive" });
    }
  };

  const doPublish = async (item: TTItem, to: TTStatus) => {
    try {
      await setItemStatus(item.id, to);
      toast({ title: STATUS_LABELS[to] });
      onRefresh();
    } catch (e: any) {
      toast({ title: "خطأ", description: e?.message, variant: "destructive" });
    }
  };

  const doShift = async (item: TTItem, delta: number) => {
    try {
      await shiftSortOrder(item.id, delta);
      onRefresh();
    } catch (e: any) {
      toast({ title: "خطأ", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground pointer-events-none" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="بحث بالعنوان أو الوسم..."
            className="ps-9"
          />
        </div>
        {!isPending && (
          <Dialog open={creating} onOpenChange={setCreating}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="w-4 h-4" /> إضافة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>إضافة {KIND_LABELS[formKind]}</DialogTitle>
              </DialogHeader>
              <ItemForm
                kind={formKind}
                onSaved={onRefresh}
                onClose={() => setCreating(false)}
                isAdmin={isAdmin}
                userId={userId}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Badge variant="outline">{filtered.length} عنصر</Badge>

      {filtered.length === 0 ? (
        <Card className="glass-panel">
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            لا توجد عناصر
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <Card key={item.id} className="glass-panel">
              <CardContent className="p-3 flex items-start gap-3">
                {item.logo_url && (
                  <img
                    src={item.logo_url}
                    alt=""
                    className="w-10 h-10 rounded bg-white/90 p-1 object-contain flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold truncate">{item.title}</p>
                    <StatusBadge status={item.status} />
                    <Badge variant="outline" className="text-[10px]">
                      {KIND_LABELS[item.kind]}
                    </Badge>
                    {item.sort_order !== 0 && (
                      <span className="text-[10px] text-muted-foreground">#{item.sort_order}</span>
                    )}
                  </div>
                  {item.subtitle && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.subtitle}</p>
                  )}
                  {item.body && (
                    <p className="text-xs text-foreground/70 mt-1 line-clamp-2">{item.body}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {item.tags.slice(0, 6).map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-1.5 py-0.5 rounded border border-border/60 text-muted-foreground"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  {item.url && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      asChild
                      title="فتح الرابط"
                    >
                      <a href={item.url} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </Button>
                  )}
                  <Dialog
                    open={editing?.id === item.id}
                    onOpenChange={(o) => setEditing(o ? item : null)}
                  >
                    <DialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="تعديل">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>تعديل {KIND_LABELS[item.kind]}</DialogTitle>
                      </DialogHeader>
                      <ItemForm
                        kind={item.kind}
                        initial={item}
                        onSaved={onRefresh}
                        onClose={() => setEditing(null)}
                        isAdmin={isAdmin}
                        userId={userId}
                      />
                    </DialogContent>
                  </Dialog>
                  {isAdmin && (
                    <>
                      {item.status !== "published" ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-emerald-500"
                          onClick={() => doPublish(item, "published")}
                          title="نشر"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground"
                          onClick={() => doPublish(item, "draft")}
                          title="إلغاء النشر"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {item.status === "pending_review" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-400"
                          onClick={() => doPublish(item, "draft")}
                          title="رفض"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => doShift(item, -1)}
                        title="أعلى"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => doShift(item, 1)}
                        title="أسفل"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => doDelete(item)}
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminTeachTechnicsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<TTItem[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === "admin";
  const isTutor = user?.role === "tutor" && user?.approved !== false;
  const canAccess = isAdmin || isTutor;

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAllItems();
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canAccess) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess]);

  if (!user) return <Navigate to="/auth" replace />;
  if (!canAccess) {
    return (
      <div className="flex items-center justify-center h-[60vh]" dir="rtl">
        <Card className="glass-panel max-w-md w-full text-center p-8">
          <ShieldAlert className="w-16 h-16 mx-auto text-destructive mb-4" />
          <h2 className="text-2xl font-display font-bold mb-2">غير مصرّح</h2>
          <p className="text-muted-foreground">
            هذه الصفحة متاحة للمسؤولين والأساتذة المعتمدين فقط.
          </p>
        </Card>
      </div>
    );
  }

  const pendingCount = items.filter((i) => i.status === "pending_review").length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-28" dir="rtl">
      <header className="rounded-3xl p-5 md:p-8 border border-primary/30 bg-gradient-to-br from-primary/15 via-background to-background">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold font-display">
                إدارة Teach Technics
              </h1>
              {isAdmin ? (
                <Badge className="bg-primary/20 text-primary border-primary/40">مسؤول</Badge>
              ) : (
                <Badge variant="outline">أستاذ — يقترح فقط</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              أضف وعدّل وراجع النصائح والطرق والأدوات والأبحاث والفيديوهات والمواقع.
            </p>
            <div className="mt-3">
              <Button asChild size="sm" variant="outline" className="gap-1">
                <Link to="/teach-technics">
                  <Eye className="w-4 h-4" /> عرض الصفحة العامة
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {loading ? (
        <Card className="glass-panel">
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            جاري التحميل...
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={isAdmin && pendingCount > 0 ? "pending" : "tool"}>
          <TabsList className="flex-wrap h-auto">
            {KIND_ORDER.map((k) => {
              const count = items.filter((i) => i.kind === k).length;
              return (
                <TabsTrigger key={k} value={k} className="gap-1">
                  {KIND_LABELS[k]}
                  <Badge variant="outline" className="text-[10px] ms-1">
                    {count}
                  </Badge>
                </TabsTrigger>
              );
            })}
            {isAdmin && (
              <TabsTrigger value="pending" className="gap-1">
                <Clock className="w-3.5 h-3.5" /> قيد المراجعة
                {pendingCount > 0 && (
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] ms-1">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>
          {KIND_ORDER.map((k) => (
            <TabsContent key={k} value={k} className="mt-4">
              <KindTab
                kind={k}
                items={items.filter((i) => i.kind === k)}
                isAdmin={isAdmin}
                userId={user.id}
                onRefresh={load}
              />
            </TabsContent>
          ))}
          {isAdmin && (
            <TabsContent value="pending" className="mt-4">
              <KindTab
                kind="pending"
                items={items}
                isAdmin={isAdmin}
                userId={user.id}
                onRefresh={load}
              />
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
