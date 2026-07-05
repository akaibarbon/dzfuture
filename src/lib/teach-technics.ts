import { supabase } from "@/integrations/supabase/client";

export type TTKind = "tip" | "method" | "tool" | "research" | "video" | "site";
export type TTStatus = "draft" | "pending_review" | "published";
export type TTCategory = "writing" | "visual" | "audio" | "research" | "classroom";
export type TTLevel = "مبتدئ" | "متوسط" | "متقدم";

export interface TTItem {
  id: string;
  kind: TTKind;
  title: string;
  subtitle: string | null;
  url: string | null;
  logo_url: string | null;
  category: string | null;
  level: string | null;
  is_free: boolean | null;
  tags: string[];
  body: string | null;
  features: string[];
  how_to: string[];
  status: TTStatus;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const KIND_LABELS: Record<TTKind, string> = {
  tip: "نصائح سريعة",
  method: "الطرق التعليمية",
  tool: "أدوات AI",
  research: "أبحاث ومراجع",
  video: "فيديوهات",
  site: "مواقع مرجعية",
};

export const STATUS_LABELS: Record<TTStatus, string> = {
  draft: "مسودة",
  pending_review: "قيد المراجعة",
  published: "منشور",
};

const TABLE = "teach_technics_items" as any;

export async function fetchPublicItems(): Promise<TTItem[]> {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .select("*")
    .eq("status", "published")
    .order("kind")
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as TTItem[];
}

export async function fetchAllItems(): Promise<TTItem[]> {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .select("*")
    .order("kind")
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as TTItem[];
}

export async function upsertItem(
  item: Partial<TTItem> & { kind: TTKind; title: string },
) {
  const payload: any = { ...item };
  if (payload.id) {
    const { id, created_at, updated_at, created_by, ...rest } = payload;
    const { error } = await (supabase as any).from(TABLE).update(rest).eq("id", id);
    if (error) throw error;
    return;
  }
  const { error } = await (supabase as any).from(TABLE).insert(payload);
  if (error) throw error;
}

export async function deleteItem(id: string) {
  const { error } = await (supabase as any).from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

export async function setItemStatus(id: string, status: TTStatus) {
  const { error } = await (supabase as any).from(TABLE).update({ status }).eq("id", id);
  if (error) throw error;
}

export async function shiftSortOrder(id: string, delta: number) {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .select("sort_order")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  const cur = (data?.sort_order ?? 0) as number;
  const { error: uerr } = await (supabase as any)
    .from(TABLE)
    .update({ sort_order: cur + delta })
    .eq("id", id);
  if (uerr) throw uerr;
}
