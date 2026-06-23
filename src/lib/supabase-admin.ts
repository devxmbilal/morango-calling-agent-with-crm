import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isServerDbConfigured =
  supabaseUrl.trim() !== '' &&
  serviceRoleKey.trim() !== '' &&
  !supabaseUrl.includes('placeholder-project') &&
  !supabaseUrl.includes('your-supabase-project');

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!isServerDbConfigured) {
    throw new Error('Supabase service role is not configured.');
  }

  if (!adminClient) {
    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return adminClient;
}
