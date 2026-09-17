// Supabase Edge Function "gemini": proxy gọi Gemini bằng key bí mật của chủ web, để mọi người dùng
// (web + extension) dùng AI mà không cần key riêng. Key đặt trong Secrets: GEMINI_API_KEY.
//
// Triển khai (Dashboard): Edge Functions → Deploy a new function → Via Editor → tên "gemini" → dán file này → Deploy.
// Secrets: Edge Functions → Secrets (hoặc Project Settings → Edge Functions) → thêm GEMINI_API_KEY = <key của bạn>.
// Hoặc CLI: supabase functions deploy gemini && supabase secrets set GEMINI_API_KEY=...

const ALLOWED_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-pro'];
const MAX_PROMPT = 40000; // ký tự – đủ cho một bài báo dài

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) return json({ error: 'Chưa đặt secret GEMINI_API_KEY cho function' }, 500);

  let body: { model?: string; prompt?: string; temperature?: number };
  try { body = await req.json(); } catch { return json({ error: 'Body phải là JSON' }, 400); }
  const model = ALLOWED_MODELS.includes(body.model || '') ? body.model! : ALLOWED_MODELS[0];
  const prompt = String(body.prompt || '').slice(0, MAX_PROMPT);
  if (prompt.length < 10) return json({ error: 'Thiếu prompt' }, 400);

  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: body.temperature ?? 0.3 } }),
  });
  // Trả nguyên kết quả của Google (kể cả lỗi) để client xử lý như gọi trực tiếp
  return new Response(await r.text(), { status: r.status, headers: { ...cors, 'Content-Type': 'application/json' } });
});
