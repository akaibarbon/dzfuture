import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const LegacyApp = lazy(() => import("@/App"));

export const Route = createFileRoute("/$")({
  ssr: false,
  component: LegacyAppRoute,
});

function LegacyAppRoute() {
  return (
    <ClientOnly fallback={<div className="min-h-screen bg-background" />}>
      <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-foreground">Loading…</div>}>
        <LegacyApp />
      </Suspense>
    </ClientOnly>
  );
}
