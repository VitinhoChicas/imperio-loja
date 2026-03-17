// ========================================
// CONFIGURAÇÃO DO SUPABASE - IMPERIO
// ========================================
//
// Siga o tutorial para obter essas informações
//
// ========================================

const SUPABASE_URL = 'https://uaaecubrpbkshtgozefb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_8xY63ytLFgJiLiRXkhNMNA_G4D1uUM6';

// Inicializar Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
