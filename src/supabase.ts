import { createClient } from '@supabase/supabase-js';
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_PUBLISHABLE_KEY } from '../lib/supabase-config.js';

// Publishable keys are designed for browser use. Row-level security on user_state is the
// access boundary: a signed-in user can only read and write their own row.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  DEFAULT_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabasePublishableKey);