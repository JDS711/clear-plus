import { createClient } from '@supabase/supabase-js';

// Publishable keys are designed for browser use. Row-level security on user_state is the
// access boundary: a signed-in user can only read and write their own row.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rilzzutvllilfhsfpprn.supabase.co';
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_6ib4_okba37vP6TmN8dQ3Q_jzzYhqaw';

export const supabase = createClient(supabaseUrl, supabasePublishableKey);