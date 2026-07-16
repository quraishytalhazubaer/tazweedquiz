// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Replace these placeholders with your actual keys from Supabase Project Settings -> API
const SUPABASE_URL = 'https://kuocyojxgbfxxdfjqtrz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_4yOpthJRDfQqt7rYDtC-Ng_GOBBBdlA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);