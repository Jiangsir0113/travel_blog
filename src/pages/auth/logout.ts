import type { APIContext } from "astro";

import { createSupabaseServerClient } from "../../lib/supabase/server";

export const prerender = false;

export async function GET(context: APIContext) {
  const supabase = createSupabaseServerClient(context);

  const { error } = await supabase.auth.signOut();

  if (error) {
    return new Response("退出登录失败，请稍后重试。", {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  return context.redirect("/", 302);
}

export const POST = GET;
