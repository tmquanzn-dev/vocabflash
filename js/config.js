/**
 * Cấu hình ứng dụng.
 *
 * Để bật đăng nhập Google / Apple / OTP email thật và đồng bộ dữ liệu theo tài khoản,
 * tạo project tại https://supabase.com rồi dán URL + anon key vào đây (xem README.md).
 * Nếu để trống, web chạy ở CHẾ ĐỘ LOCAL: tài khoản & dữ liệu chỉ lưu trong trình duyệt.
 */
export const CONFIG = {
  APP_NAME: 'VocabFlash',
  SUPABASE_URL: 'https://rajetvmsgtnnkbyupapy.supabase.co',        // ví dụ: 'https://abcdxyz.supabase.co'
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhamV0dm1zZ3RubmtieXVwYXB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2MzQ2NTQsImV4cCI6MjEwNTIxMDY1NH0.6yNXnVPWFBQssN73TJnRSVMxoqbzou4UGjCnN9rrFNE',   // ví dụ: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....'
  // Gemini API key mặc định cho "AI trích xuất từ vựng": KHÔNG ghi thẳng vào đây (GitHub sẽ chặn push).
  // Điền vào js/secrets.js (file này nằm trong .gitignore); khi deploy, Netlify/Vercel tự sinh secrets.js từ biến môi trường GEMINI_API_KEY.
  // Nên vào Google Cloud Console giới hạn key theo HTTP referrer (domain web) vì key vẫn tới trình duyệt người dùng.
  GEMINI_API_KEY: globalThis.VF_SECRETS?.GEMINI_API_KEY || '', // đọc từ js/secrets.js (không đưa lên git) – xem README
  GEMINI_MODEL: 'gemini-3.5-flash-lite', // nhanh, đủ tốt để trích từ; 'gemini-3.1-pro' chậm hơn nhưng kỹ hơn
};

export const isCloudEnabled = () => !!(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);
