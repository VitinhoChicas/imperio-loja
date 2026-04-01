
// ========================================
// CONFIGURAÇÃO DO SUPABASE - IMPERIO
// ========================================

const SUPABASE_URL = 'https://uaaecubrpbkshtgozefb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhYWVjdWJycGJrc2h0Z296ZWZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MTcyODAsImV4cCI6MjA4OTI5MzI4MH0.c7mGFniboCKJ_pHkeV-0qeiULityMsABH5-w4ubMriI';

// Inicializar Supabase - guardar referência do SDK e criar cliente
const _supabaseSDK = window.supabase;
const supabase = _supabaseSDK.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
