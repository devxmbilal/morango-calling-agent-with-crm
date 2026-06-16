import { createClient } from '@supabase/supabase-js';

// Get initial environment values
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
let supabaseAnonKey = 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  '';

// On client-side, retrieve local settings override if saved
if (typeof window !== 'undefined') {
  const storedUrl = localStorage.getItem('supabase_client_url') || '';
  const storedKey = localStorage.getItem('supabase_client_anon_key') || '';
  if (storedUrl.trim() !== '' && storedKey.trim() !== '') {
    supabaseUrl = storedUrl;
    supabaseAnonKey = storedKey;
  }
}

export const isSupabaseConfigured = 
  supabaseUrl.trim() !== '' && 
  supabaseAnonKey.trim() !== '' && 
  !supabaseUrl.includes('placeholder-project') &&
  !supabaseUrl.includes('your-supabase-project');

// Export client. If not configured, we create a dummy client to prevent runtime crashes,
// but we will gate database calls behind isSupabaseConfigured.
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder-project.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key'
);
