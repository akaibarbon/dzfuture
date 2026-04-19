import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function useAITools() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const callAI = async (type: string, payload: Record<string, any>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { type, payload },
      });
      if (error) {
        toast({ title: "AI Error", description: error.message, variant: "destructive" });
        return null;
      }
      if (data?.error) {
        toast({ title: "AI Error", description: data.error, variant: "destructive" });
        return null;
      }
      return data?.result || data?.content || "";
    } catch (e: any) {
      toast({ title: "AI Error", description: e?.message || "Failed to connect to AI", variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { callAI, loading };
}
