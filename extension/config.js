/* Cấu hình extension – phải trùng với js/config.js của web (anon key được phép công khai, dữ liệu bảo vệ bằng RLS) */
export const CONFIG = {
  SUPABASE_URL: 'https://rajetvmsgtnnkbyupapy.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhamV0dm1zZ3RubmtieXVwYXB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2MzQ2NTQsImV4cCI6MjEwNTIxMDY1NH0.6yNXnVPWFBQssN73TJnRSVMxoqbzou4UGjCnN9rrFNE',
  GEMINI_MODEL: 'gemini-3.5-flash-lite', // model dùng khi dịch nghĩa qua Edge Function
  APP_URL: 'https://tmquanzn-dev.github.io/vocabflash/', // đổi thành địa chỉ web đã deploy, vd 'https://vocabflash.netlify.app/'
};
