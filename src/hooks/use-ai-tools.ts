import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const AI_TOOLS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tools`;

export function useAITools() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const callAI = async (type: string, payload: Record<string, any>) => {
    setLoading(true);
    try {
      const resp = await fetch(AI_TOOLS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ type, payload }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        toast({ title: "AI Error", description: err.error || `Error ${resp.status}`, variant: "destructive" });
        return null;
      }

      const data = await resp.json();
      return data.result;
    } catch (e) {
      toast({ title: "AI Error", description: "Failed to connect to AI", variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { callAI, loading };
}
