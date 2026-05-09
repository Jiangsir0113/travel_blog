export function getSupabaseEnv() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const publishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url) {
    throw new Error("缺少 Supabase 项目 URL：请设置 PUBLIC_SUPABASE_URL。");
  }

  if (!publishableKey) {
    throw new Error("缺少 Supabase publishable key：请设置 PUBLIC_SUPABASE_PUBLISHABLE_KEY。");
  }

  return { url, publishableKey };
}
