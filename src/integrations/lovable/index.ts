// Stub for legacy Lovable cloud auth — OAuth (Google/Apple) is not configured by default.
// To enable OAuth, configure providers in Lovable Cloud → Auth Settings.
import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: "google" | "apple", opts?: SignInOptions) => {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: opts?.redirect_uri ?? (typeof window !== "undefined" ? window.location.origin : undefined),
          queryParams: opts?.extraParams,
        },
      });
      if (error) return { error };
      return { redirected: true, data };
    },
  },
};
