// Supabase project config.
// The anon/public key is safe to expose client-side — access is controlled
// by the Row Level Security policies in supabase/schema.sql, not by keeping
// this key secret. Never put the service_role key here.
window.NIGHTOWL_SUPABASE_CONFIG = {
  url: "https://zhrvrkyajiietxqgmwvm.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpocnZya3lhamlpZXR4cWdtd3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczOTE2MjgsImV4cCI6MjEwMjk2NzYyOH0.eH1_bmCyf936_mEDF408v2-DOoVx62pYbVpTS6eGzYI",
};
