/// <reference types="astro/client" />

interface CloudflareEnv {
  PUBLIC_SUPABASE_URL: string;
  PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
}

type Runtime = import("@astrojs/cloudflare").Runtime<CloudflareEnv>;
type SupabaseUser = import("@supabase/supabase-js").User;
type ProfileRole = "admin" | "author" | "reader";

interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  role: ProfileRole;
  map_color: string;
}

declare namespace App {
  interface Locals extends Runtime {
    user?: SupabaseUser | null;
    profile?: Profile | null;
  }
}
