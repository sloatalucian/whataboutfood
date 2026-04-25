import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://dsqkqqaojwxouimcacgy.supabase.co";
const SUPABASE_KEY = "sb_publishable_LsYrhnU25_JfoeqrWvQNJg_ZZ49KdXx";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
