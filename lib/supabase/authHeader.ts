import { supabase } from './client';

// 현재 세션의 JWT를 Authorization 헤더로. 비로그인이면 빈 객체.
export async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
