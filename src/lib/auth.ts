import type { APIContext } from "astro";
import type { User } from "@supabase/supabase-js";

import type { UserRole } from "./roles";
import { createSupabaseServerClient } from "./supabase/server";

type AuthContext = Pick<APIContext, "request" | "cookies">;

export type SessionProfile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  role: UserRole;
  map_color: string;
};

export async function getSessionProfile(context: AuthContext) {
  const supabase = createSupabaseServerClient(context);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return { supabase, user: null, profile: null, error: userError };
  }

  if (!user) {
    return { supabase, user: null, profile: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, role, map_color")
    .eq("id", user.id)
    .single<SessionProfile>();

  if (profileError) {
    if (profileError.code === "PGRST116") {
      return { supabase, user: user as User, profile: null };
    }

    return { supabase, user: user as User, profile: null, error: profileError };
  }

  return { supabase, user: user as User, profile };
}

export function redirectToLogin(request: Request) {
  const url = new URL(request.url);

  return `/auth/login/?next=${encodeURIComponent(url.pathname)}`;
}
