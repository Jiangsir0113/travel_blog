import type { AstroCookies } from "astro";
import type { CookieMethodsServer } from "@supabase/ssr";
import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "../env";

type ServerSupabaseClientOptions = {
  request: Request;
  cookies: AstroCookies;
};

type CreateSupabaseServerClient = (
  url: string,
  key: string,
  options: {
    cookies: CookieMethodsServer;
    cookieEncoding?: "raw" | "base64url";
  },
) => SupabaseClient;

const createTypedServerClient: CreateSupabaseServerClient = createServerClient;

export function createSupabaseServerClient({
  request,
  cookies,
}: ServerSupabaseClientOptions) {
  const { url, publishableKey } = getSupabaseEnv();
  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return parseCookieHeader(request.headers.get("Cookie") ?? "").map(
        ({ name, value }) => ({
          name,
          value: value ?? "",
        }),
      );
    },
    setAll(cookieEntries) {
      cookieEntries.forEach(({ name, value, options }) => {
        cookies.set(name, value, options);
      });
    },
  };

  return createTypedServerClient(url, publishableKey, {
    cookies: cookieMethods,
  });
}

export const createServerSupabaseClient = createSupabaseServerClient;
