import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const ALLOWED_EMAIL = (import.meta.env.VITE_ALLOWED_EMAIL as string | undefined)?.trim().toLowerCase() || null;

/** null = chế độ local (dữ liệu nằm trong trình duyệt). */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;
