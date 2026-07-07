import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackToTop({ threshold = 400 }: { threshold?: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  if (!visible) return null;
  return (
    <Button
      aria-label="العودة إلى الأعلى"
      size="icon"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-24 left-4 z-40 rounded-full shadow-lg h-11 w-11 bg-primary text-primary-foreground hover:bg-primary/90"
    >
      <ArrowUp className="w-5 h-5" />
    </Button>
  );
}
