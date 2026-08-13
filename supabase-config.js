// ================================================================
// SUPABASE CONFIGURATION & CONNECTION MANAGER
// ================================================================
const DEFAULT_URL = 'https://imqhvpaemtvscoyqvsku.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltcWh2cGFlbXR2c2NveXF2c2t1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0MzU1MDcsImV4cCI6MjEwMjAxMTUwN30.kKd_P3KdRPbLGZRrRkqgHnULrvONN8C2bDtgje9sU-A';

function getSupabaseUrl() {
  const stored = localStorage.getItem('sb_url');
  return (stored && stored.trim().length > 10) ? stored.trim() : DEFAULT_URL;
}

function getSupabaseKey() {
  const stored = localStorage.getItem('sb_key');
  return (stored && stored.trim().length > 20) ? stored.trim() : DEFAULT_KEY;
}

let SUPABASE_URL = getSupabaseUrl();
let SUPABASE_KEY = getSupabaseKey();
let supabaseClient = null;

function showToast(msg) {
  const toast = document.getElementById('toast');
  if(!toast) return;
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

function initSupabase() {
  SUPABASE_URL = getSupabaseUrl();
  SUPABASE_KEY = getSupabaseKey();

  if (SUPABASE_URL && SUPABASE_KEY && window.supabase) {
    try {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      updateStatusBadge('connected', '🟢 Supabase Connected');
      return true;
    } catch (e) {
      console.error('Supabase Init Error:', e);
      updateStatusBadge('offline', '🔴 Supabase Config Error');
      return false;
    }
  } else {
    updateStatusBadge('offline', '🟡 Local Mode (Click to Connect)');
    return false;
  }
}

function updateStatusBadge(statusClass, label) {
  const badge = document.getElementById('status-badge');
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  if(!badge || !dot || !text) return;
  badge.className = 'status-badge ' + statusClass;
  dot.className = 'dot ' + (statusClass === 'connected' ? 'green' : 'yellow');
  text.textContent = label;
}

function openSupabaseModal() {
  const overlay = document.getElementById('supabase-overlay');
  if(!overlay) return;
  document.getElementById('cfg-url').value = SUPABASE_URL;
  document.getElementById('cfg-key').value = SUPABASE_KEY;
  overlay.style.display = 'flex';
}

function closeSupabaseModal() {
  const overlay = document.getElementById('supabase-overlay');
  if(overlay) overlay.style.display = 'none';
}

function copySQL() {
  const sql = document.getElementById('sql-code').textContent;
  navigator.clipboard.writeText(sql);
  showToast('SQL script copied to clipboard!');
}

async function saveSupabaseConfig() {
  const url = document.getElementById('cfg-url').value.trim();
  const key = document.getElementById('cfg-key').value.trim();

  localStorage.setItem('sb_url', url);
  localStorage.setItem('sb_key', key);
  SUPABASE_URL = getSupabaseUrl();
  SUPABASE_KEY = getSupabaseKey();

  closeSupabaseModal();

  if (initSupabase()) {
    showToast('Connecting to Supabase...');
    if (typeof loadData === 'function') await loadData();
  } else {
    showToast('Saved credentials locally.');
  }
}
