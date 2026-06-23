import { createFileRoute } from "@tanstack/react-router";
import { ensureAdminAccount } from "@/lib/ensure-admin.functions";

export const Route = createFileRoute("/api/public/setup-admin")({
  server: {
    handlers: {
      POST: async () => {
        const result = await ensureAdminAccount();
        return new Response(JSON.stringify(result), {
          headers: { "content-type": "application/json" },
        });
      },
      GET: async () => {
        const result = await ensureAdminAccount();
        return new Response(JSON.stringify(result), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
