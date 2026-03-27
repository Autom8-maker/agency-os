import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client-side Supabase client (uses anon key — safe for browser)
export const createClientSupabase = (): SupabaseClient => {
  return createClient(supabaseUrl, supabaseAnonKey);
};

// Server-side Supabase client (uses service role key — server only)
export const createServerSupabase = (): SupabaseClient => {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// Singleton for server-side usage in API routes
let serverClient: SupabaseClient | null = null;

export const getServerSupabase = (): SupabaseClient => {
  if (!serverClient) {
    serverClient = createServerSupabase();
  }
  return serverClient;
};
