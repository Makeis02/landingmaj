// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const SUPABASE_URL = "https://btnyenoxsjtuydpzbapq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0bnllbm94c2p0dXlkcHpiYXBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc5ODI1ODcsImV4cCI6MjA1MzU1ODU4N30.HWztYhib35nZxoRa_L0aJuqdJ6u8jTPSjbdHroTpRXg";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);