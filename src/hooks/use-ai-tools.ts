import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { aiTool } from "@/server/ai.functions";

export function useAITools() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const callAI = async (type: string, payload: Record<string, any>) => {
    setLoading(true);
    try {
      const data = await aiTool({ data: { type, payload } });
      if ("error" in data && data.error) {
        toast({ title: "AI Error", description: data.error, variant: "destructive" });
        return null;
      }
      return (data as any).result;
    } catch (e: any) {
      toast({ title: "AI Error", description: e?.message || "Failed to connect to AI", variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { callAI, loading };
}
