import { createClient } from '@supabase/supabase-js';

// Browser-side singleton (anon key, localStorage session)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { flowType: 'pkce' } }
);
