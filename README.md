# 🎴 VocabFlash – Web học từ vựng tiếng Anh

Web tĩnh (HTML / CSS / JavaScript ES modules), không cần build. Có trang giới thiệu, đăng nhập / đăng ký (Google, Apple, OTP email, mật khẩu), dữ liệu học lưu riêng theo từng tài khoản và đồng bộ đám mây qua Supabase (tuỳ chọn).

## Chạy

Vì dùng ES modules nên **phải mở qua một server** (không nháy đúp `index.html`):

- Windows: nháy đúp **`start.bat`** (chạy `serve.py`, tự mở http://localhost:8080)
- Hoặc: `python serve.py` – server này gửi header *no-store* nên trình duyệt luôn lấy code mới nhất
- Hoặc dùng extension *Live Server* của VS Code

> Nếu dùng server khác (vd `python -m http.server`) mà vừa sửa code, hãy **Ctrl+F5** để bỏ cache – nếu không trình duyệt có thể chạy file JS cũ (ví dụ vẫn báo "chế độ local" dù đã điền đúng Supabase).

Nên dùng Chrome / Edge để có giọng đọc tự nhiên nhất.

## Hai chế độ chạy

| | Chế độ **local** (mặc định) | Chế độ **cloud** (đã cấu hình Supabase) |
|---|---|---|
| Đăng ký / đăng nhập | Email + mật khẩu; mã xác nhận đăng ký *giả lập* (hiện trên màn hình) | Google, Apple, email + mật khẩu; đăng ký gửi **mã xác nhận** về email; quên mật khẩu |
| Dữ liệu | localStorage của trình duyệt, tách theo tài khoản | Bảng `user_data` trên Supabase + cache local, đồng bộ mọi thiết bị |
| Khách | ✔ Dùng thử không cần tài khoản; khi tạo tài khoản dữ liệu khách được chuyển sang | ✔ |

## Bật đăng nhập Google / Apple / OTP thật (Supabase)

1. Tạo project miễn phí tại https://supabase.com → **Project Settings → API**, copy `Project URL` và `anon public` key.
2. Dán vào `js/config.js`:
   ```js
   SUPABASE_URL: 'https://xxxx.supabase.co',
   SUPABASE_ANON_KEY: 'eyJ...',
   ```
3. **SQL Editor** → dán & chạy nội dung file `supabase/schema.sql` (tạo bảng `user_data`, `leaderboard`, `public_topics` (Chợ chủ đề), `inbox_words` (extension) + hàm `increment_clones` + Row Level Security + Realtime). Chạy lại file này mỗi khi cập nhật web – an toàn, không mất dữ liệu.
4. **Authentication → URL Configuration**:
   - *Site URL*: địa chỉ bạn đang chạy web, vd `http://localhost:8080` (Live Server của VS Code là `http://127.0.0.1:5500`)
   - *Redirect URLs*: thêm `http://localhost:8080/**`, `http://127.0.0.1:5500/**` và domain thật khi deploy (`https://ten-mien.com/**`). Link trong email và Google chỉ quay về được các địa chỉ trong danh sách này.
5. **Authentication → Providers**:
   - **Email**: bật, giữ *Confirm email* = ON (đăng ký xong phải nhập mã). Gói Free chỉ sửa được email template khi đã cấu hình **SMTP riêng** (Authentication → Emails → SMTP Settings; dùng Gmail App Password hoặc Resend). Sau đó vào *Email Templates → Confirm signup* thay nội dung để gửi **mã** thay vì link:
     ```html
     <h2>Mã xác nhận đăng ký VocabFlash</h2>
     <p>Mã của bạn là: <strong>{{ .Token }}</strong> (hiệu lực 1 giờ)</p>
     ```
     Độ dài mã chỉnh ở *Sign In / Providers → Email → Email OTP Length* (6–10 số, web nhận mọi độ dài).
   - **Google**: tạo OAuth Client ID tại Google Cloud Console (loại Web), Authorized redirect URI = `https://xxxx.supabase.co/auth/v1/callback`, rồi dán Client ID / Secret vào Supabase.
   - **Apple**: cần tài khoản Apple Developer (trả phí). Làm theo hướng dẫn *Supabase → Login with Apple*.
6. Tải lại web → footer trang chủ hiện "☁️ Đồng bộ đám mây đang bật".

> Supabase có gói miễn phí giới hạn ~3–4 email/giờ cho OTP. Khi dùng thật nên cấu hình SMTP riêng (Authentication → SMTP Settings).

## Nhiều người dùng & đồng bộ – cách hoạt động

Web là **tĩnh** (không có server riêng): mỗi người dùng chạy toàn bộ logic trong trình duyệt của họ, nên số người dùng đồng thời không làm web chậm đi. Thứ duy nhất dùng chung là Supabase (Postgres + Auth + Realtime, tự scale; gói miễn phí ~50.000 người dùng/tháng, 200 kết nối realtime đồng thời – đủ cho hàng nghìn người).

Những gì đã làm ở phía client để trải nghiệm mượt:

- **Local-first**: mọi thao tác ghi vào bộ nhớ + localStorage ngay lập tức; đẩy lên cloud sau 1,5 s (gộp nhiều thay đổi thành 1 request, chỉ gửi khi thực sự có thay đổi).
- **Không mất dữ liệu khi đóng tab**: khi tab bị ẩn/đóng, thay đổi cuối được gửi bằng `fetch keepalive`. Mất mạng → tự đẩy lại khi có mạng (`online`).
- **Cùng tài khoản trên nhiều thiết bị**: Supabase Realtime báo thay đổi → thiết bị kia cập nhật màn hình ngay (cần chạy `schema.sql` mới để bật publication). Mở nhiều **tab** cùng trình duyệt cũng đồng bộ qua sự kiện `storage`.
- **Màn hình chờ** khi khôi phục phiên đăng nhập; nếu Supabase không truy cập được, web tự chuyển sang chế độ local và thông báo.

Khi deploy, đặt web lên CDN tĩnh (Netlify / Vercel / Cloudflare Pages / GitHub Pages) – miễn phí, tải nhanh toàn cầu. Nhớ thêm domain vào *Authentication → URL Configuration* của Supabase.

## Deploy lên internet (cho nhiều người dùng)

Web là tĩnh nên chỉ cần **upload thư mục này** lên một dịch vụ hosting tĩnh miễn phí. Không cần server, không cần build. `js/config.js` chứa anon key – key này **được phép public** (Supabase bảo vệ dữ liệu bằng Row Level Security), không phải bí mật.

### Cách 1 – Netlify Drop (nhanh nhất, không cần Git)
1. Vào https://app.netlify.com/drop (đăng nhập bằng GitHub/Google/email).
2. Kéo **cả thư mục `webAV`** thả vào trang → 10 giây sau có link dạng `https://ten-ngau-nhien.netlify.app`.
3. *Site settings → Change site name* để đổi tên đẹp hơn, hoặc gắn domain riêng.
4. Muốn cập nhật: vào *Deploys* → kéo thả thư mục lần nữa.

### Cách 2 – Vercel / Cloudflare Pages / GitHub Pages (qua Git, tự deploy mỗi lần push)
```bash
git init && git add . && git commit -m "VocabFlash"
# tạo repo trên GitHub rồi:
git remote add origin https://github.com/<user>/vocabflash.git && git push -u origin main
```
- **Vercel**: https://vercel.com/new → Import repo → Framework *Other* → Deploy.
- **Cloudflare Pages**: Workers & Pages → Create → Connect to Git → build command để trống, output `/`.
- **GitHub Pages**: Settings → Pages → Source: *Deploy from branch* `main` / root → link `https://<user>.github.io/vocabflash/`.

### Sau khi có link – cập nhật Supabase (bắt buộc)
**Authentication → URL Configuration**:
- *Site URL*: `https://ten-cua-ban.netlify.app`
- *Redirect URLs*: thêm `https://ten-cua-ban.netlify.app/**`

Không làm bước này thì Google login và link trong email sẽ quay về `localhost` và thất bại. Với Google OAuth không cần sửa gì thêm (redirect URI là của Supabase, không đổi).

### Lưu ý khi có đông người dùng
- Gói Free Supabase: 50.000 người dùng/tháng, 500 MB database, 200 kết nối realtime đồng thời. Mỗi người dùng chiếm ~vài chục KB, nên thoải mái cho hàng nghìn người.
- Email: dùng SMTP riêng (Gmail ~500 email/ngày; Resend 3.000/tháng free; cần nhiều hơn thì Brevo/SES).
- Hosting tĩnh (Netlify/Vercel/Cloudflare) có CDN toàn cầu, băng thông free 100 GB/tháng – thừa cho web này.
- Khi sửa code, tăng số phiên bản để người dùng nhận bản mới: tìm & thay toàn bộ `?v=9` → `?v=10` trong `index.html` và thư mục `js/` (mọi import nội bộ đều có `?v=`, nếu chỉ đổi ở `index.html` thì các file con vẫn bị trình duyệt cache).

## Cấu trúc mã nguồn

```
index.html            khung trang (public + app)
start.bat / serve.py  chạy server local (no-cache) trên Windows / mọi HĐH
css/
  base.css            token màu (sáng/tối), nút, form, card, modal, toast
  layout.css          sidebar, topbar, responsive
  views.css           trang chủ, bảng từ, flashcard, quiz, hồ sơ
  landing.css         trang giới thiệu, đăng nhập/đăng ký
js/
  config.js           ⚙️ khoá Supabase (bạn điền)
  main.js             khởi động, gắn sự kiện khung, xử lý đăng nhập/đăng xuất
  router.js           điều hướng hash, chặn trang cần đăng nhập
  auth.js             xác thực (local / Supabase)
  supabase.js         tải supabase-js từ CDN khi cần
  store.js            dữ liệu theo tài khoản, SRS, thống kê, đồng bộ cloud
  tts.js              phát âm (Web Speech API + audio từ điển)
  dictionary.js       tra phiên âm/định nghĩa (dictionaryapi.dev + Datamuse, ARPABET→IPA)
  modal.js  forms.js  hộp thoại; form chủ đề / từ / nhập nhanh / chia sẻ (+ đăng lên chợ) / thư viện
  library.js          8 bộ chủ đề mẫu
  community.js        Chợ chủ đề: đăng / gỡ / tìm / clone bộ từ (bảng public_topics)
  ai.js               AI trích xuất từ vựng / điền nghĩa (Gemini API) + đọc link qua r.jina.ai
  inbox.js            Hộp thư từ: tải + realtime bảng inbox_words (từ do extension gửi)
  grammar/
    tenses.js         lý thuyết 13 thì: công thức, cách dùng, dấu hiệu, ví dụ, lưu ý
    bank.js           ~240 câu bài tập soạn tay, 3 mức, kèm giải thích
    gen.js            bộ sinh câu hỏi tự động (chia động từ đúng cho 13 thì, đáp án nhiễu từ thì lân cận)
  speech.js           luyện nói (Web Speech Recognition)
  shell.js            sidebar, tiêu đề, theme, trạng thái đồng bộ, thẻ người dùng
  utils.js            tiện ích + hằng số
  views/              mỗi màn hình một file: landing, auth, home, topic, flashcards,
                      review, quiz, match (nối từ), audio (audition), leaderboard, search, settings, profile,
                      grammar (13 thì), explore (chợ chủ đề), ai (AI trích xuất), spell (gõ chính tả), inbox (hộp thư từ)
extension/            extension Chrome (Manifest V3): manifest, background (menu chuột phải), popup (đăng nhập, thêm nhanh), api (REST Supabase)
netlify.toml / vercel.json   cấu hình header khi deploy (tuỳ chọn)
supabase/schema.sql   bảng + policy RLS
supabase/functions/gemini/index.ts   Edge Function proxy Gemini (key bí mật ở server)
```

## Chức năng

- **Trang giới thiệu** + đăng nhập / đăng ký / khách; hồ sơ người dùng (đổi tên, thống kê, đăng xuất)
- **Chủ đề tự tạo** với icon, mô tả · **Từ vựng & cụm từ** (`look forward to`, `I like the beach`…): IPA, loại từ, nghĩa, ví dụ EN/VI, ghi chú – cụm từ dùng được mọi chức năng như từ đơn (tra phiên âm ghép từng từ, flashcard, quiz, chính tả không phân biệt hoa/thường & dấu câu)
- **🔎 Tra tự động** phiên âm / loại từ / định nghĩa / ví dụ / audio người thật · **📋 Nhập nhanh** nhiều dòng
- **🎴 Flashcard** lật 3D, Anh↔Việt, xáo trộn, tự phát âm, phím tắt, **⭐ đánh dấu từ**, **🎤 luyện nói** (nhận dạng giọng nói, chấm % giống)
- **Học tất cả chủ đề / từ đã đánh dấu**, **🎮 trò chơi nối từ – nghĩa** (tính giờ, kỷ lục), **📚 thư viện 8 chủ đề mẫu** (80 từ có IPA + ví dụ), **📤 chia sẻ chủ đề** (copy/tải .txt → bạn bè dán vào Nhập nhanh)
- **Tách từ đơn / cụm từ** trong mỗi chủ đề (bộ lọc 3 nút; Flashcard / Quiz / Nối từ chạy theo bộ đang chọn: `#/flash/<id>/words|phrases`)
- **🏆 Bảng xếp hạng** top 20 theo ngày / tuần / tổng lượt ôn (bảng `leaderboard` trên Supabase, chỉ chia sẻ tên + số lượt; tắt được trong Cài đặt)
- **🔊 Phát âm**: chọn giọng, tốc độ; đọc cả danh sách
- **🎧 Audition** – nghe cả chủ đề như một bản audio: đọc lần lượt từng từ, mỗi từ 1–5 lần có ngắt quãng, chỉnh khoảng nghỉ/tốc độ, lặp lại, xáo trộn, tuỳ chọn đọc kèm nghĩa tiếng Việt; play/pause/prev/next, chạy nền khi chuyển tab
- **📝 Quiz** 5 dạng (chọn nghĩa, chọn từ, nghe chọn từ, nghe & viết, **điền vào chỗ trống** trong câu ví dụ) + tổng hợp, ưu tiên từ chưa thuộc, ôn lại từ sai, phím `1–4` / `Enter`
- **⏰ Ôn tập theo lịch** (Leitner 7 mức: 1 → 3 → 7 → 14 → 30 → 60 ngày)
- **🔥 Mục tiêu ngày, streak, biểu đồ 7 ngày**, từ hay sai nhất
- **Tìm kiếm** theo từ tiếng Anh và/hoặc nghĩa tiếng Việt (`Ctrl+K`), báo "chưa có từ" và cho thêm ngay; **dark mode**, **xuất / nhập JSON**, responsive mobile
- **Xoá nhiều**: trong chủ đề bấm **☑️ Chọn** để tick nhiều từ (hoặc chọn tất cả) rồi xoá, hoặc **🗑️ Xoá tất cả** từ; trang chủ bấm **☑️ Quản lý** để chọn / xoá nhiều chủ đề hoặc xoá tất cả chủ đề
- **🎧 Audition – chế độ chỉ nghe (nghe – chép)**: tick "🙈 Chỉ nghe" để ẩn từ / phiên âm / nghĩa; có ô **gõ từ nghe được** → đúng ✅ hiện đáp án rồi tự sang từ tiếp, sai ❌ cho gõ lại (sai 2 lần có gợi ý chữ cái đầu); điểm đúng/sai cả phiên; lần gõ đầu tính vào lịch ôn; 👁 Xem = tính là chưa nhớ

### 📐 Ngữ pháp – 13 thì cơ bản (`#/grammar`)
- Hiện tại đơn / tiếp diễn / hoàn thành / hoàn thành tiếp diễn · Quá khứ (4 thì) · Tương lai (4 thì) · Tương lai gần (be going to)
- Mỗi thì: **công thức** (khẳng định / phủ định / nghi vấn), **cách dùng** kèm ví dụ, **dấu hiệu nhận biết**, ví dụ thêm có 🔊, **lưu ý & lỗi thường gặp**
- **Bài tập 3 mức**: 🌱 Cơ bản · 🔥 Khó · 💀 Siêu khó; dạng trắc nghiệm / tự gõ / trộn; 10–50 câu mỗi lượt
- Ngân hàng câu = **~240 câu soạn tay** (câu phức, phân biệt thì, "chọn câu đúng", có giải thích) + **bộ sinh tự động** (chủ ngữ × ~60 động từ × dấu hiệu → hàng nghìn tổ hợp, đáp án nhiễu là cùng động từ ở các thì lân cận / chia sai ngôi) → mỗi lượt làm được xáo trộn và sinh mới, không lần nào giống lần nào
- **🎲 Luyện tổng hợp** trộn cả 13 thì, kết quả thống kê theo từng thì; tiến độ (tốt nhất / lần cuối / số lượt) lưu theo tài khoản và đồng bộ cloud; mỗi câu trả lời tính là 1 lượt ôn cho mục tiêu ngày & bảng xếp hạng

### 🌍 Chợ chủ đề (`#/explore`)
- Trong chủ đề → **📤 Chia sẻ** → **🌍 Đăng lên chợ**: bộ từ (không kèm tiến độ cá nhân) được lưu vào bảng `public_topics`; bấm lại để cập nhật, hoặc **Gỡ**
- Trang **Khám phá**: tìm theo tên / mô tả / người đăng, sắp xếp theo lượt clone hoặc mới nhất, **👁 Xem** trước danh sách từ, **⬇️ Clone** về tài khoản (1 bấm) – số lượt clone tăng qua hàm SQL `increment_clones`
- Cần tài khoản (chế độ cloud); khách chỉ xem được thông báo

### ⌨️ Gõ chính tả (`#/spell/<id>`)
- 3 kiểu đề: **🔊 chỉ nghe** (phát âm → gõ lại từ), **🇻🇳 chỉ nghĩa** (nghĩa tiếng Việt → gõ từ tiếng Anh), **cả hai**
- Gõ sai → hiện đáp án + phiên âm + nghĩa + ví dụ và tự hỏi lại từ đó ở cuối; tuỳ chọn phân biệt hoa/thường; gợi ý chữ cái đầu; `Ctrl+Space` nghe lại
- Mỗi lần gõ tính vào Leitner như flashcard/quiz; có trong từng chủ đề (nút ⌨️) và trang chủ ("Gõ chính tả" cho tất cả từ)

### 🧩 Extension Chrome (`extension/`)
- Bôi đen **cả đoạn** → chuột phải → **Dịch đoạn này (VocabFlash)**: thẻ nổi hiện ngay trên trang với bản dịch tiếng Việt + tối đa 6 từ khó trong đoạn, bấm ＋ để thêm từng từ vào Hộp thư từ (popup cũng có ô dán đoạn để dịch)
- Bôi đen từ trên trang web → chuột phải → **Thêm "…" vào VocabFlash**; extension lấy câu chứa từ + link bài, **dịch nghĩa ngay** qua Edge Function `gemini` (phiên âm, loại từ, nghĩa theo ngữ cảnh, dịch câu – hiện trong thông báo), rồi gửi vào bảng `inbox_words` của tài khoản (REST Supabase, không cần thư viện). Popup có ô thêm nhanh (cũng dịch) và số từ đang chờ. Chưa deploy function thì vẫn thêm được, chỉ thiếu nghĩa.
- Trên web, mục **📥 Hộp thư từ** (badge ở sidebar, cập nhật realtime) hiện các từ đó: **✨ AI điền nghĩa** theo ngữ cảnh (Gemini), **🔎 Tra từ điển** lấy IPA/audio, chọn chủ đề → thêm. Lý do dùng hộp thư thay vì ghi thẳng vào dữ liệu: dữ liệu học lưu dạng 1 khối JSON, extension ghi đè sẽ đụng với web đang mở.
- **Bookmarklet** (không cần cài, mọi trình duyệt kể cả điện thoại): Cài đặt → kéo nút **➕ VocabFlash** lên thanh dấu trang; bôi đen từ trên trang bất kỳ → bấm nút → web mở `#/add?w=…&c=…` với từ + câu chứa từ điền sẵn, AI điền nghĩa, chọn chủ đề → lưu (chạy được cả chế độ khách / local vì lưu thẳng vào dữ liệu đang đăng nhập)
- Cài extension: người dùng tải `extension/vocabflash-extension.zip` từ trang Cài đặt (hoặc lấy thư mục `extension/`) → `chrome://extensions` → Developer mode → **Load unpacked**. Trước khi deploy, sửa `extension/config.js` (`APP_URL` = địa chỉ web thật) rồi chạy `python extension/build-zip.py` để cập nhật file zip. Đăng nhập bằng email + mật khẩu; tài khoản Google thì vào **Cài đặt → Đặt mật khẩu** trước.
- Muốn người dùng cài 1 bấm ("Add to Chrome"): đăng lên **Chrome Web Store** – tạo tài khoản developer tại https://chrome.google.com/webstore/devconsole (phí 5 USD một lần) → *New item* → tải zip lên → điền mô tả, ảnh chụp màn hình, chính sách quyền riêng tư (extension chỉ gửi từ + câu + link tới Supabase của bạn) → gửi duyệt (thường 1–3 ngày). Sau đó thay link tải zip trong Cài đặt bằng link store.

### ✨ AI trích xuất từ vựng (`#/ai`)
- Dán **đoạn văn** hoặc **link bài báo** tiếng Anh → AI (Gemini) lọc ra từ khó theo mức chọn (B1–B2 / B2–C1 / C1–C2), trả về phiên âm IPA, loại từ, **nghĩa tiếng Việt theo đúng ngữ cảnh bài**, câu ví dụ trích từ bài + bản dịch, định nghĩa EN, mức CEFR
- Tick chọn từ muốn giữ → **tạo chủ đề mới** (AI gợi ý tên) hoặc **thêm vào chủ đề có sẵn**; tuỳ chọn tra thêm audio người thật từ từ điển
- Cần **Gemini API key** (miễn phí tại https://aistudio.google.com/apikey). Có 2 nguồn: key mặc định của web (người dùng không phải làm gì) hoặc key riêng người dùng dán vào ô trên trang (lưu `localStorage`, ưu tiên hơn). Lời gọi đi thẳng từ trình duyệt tới Google (web tĩnh không có server trung gian). Link bài báo được đọc qua dịch vụ công khai `r.jina.ai`; trang chặn bot thì dán văn bản trực tiếp
- **Cách khuyên dùng – Edge Function `gemini`** (key nằm ở server Supabase, mọi người dùng chung, extension cũng dịch được): Supabase Dashboard → **Edge Functions → Deploy a new function → Via Editor**, tên `gemini`, dán nội dung `supabase/functions/gemini/index.ts` → Deploy. Rồi **Edge Functions → Secrets** thêm `GEMINI_API_KEY` = key của bạn. Web tự dùng function này khi trình duyệt không có key (chip "✔ Dùng AI của VocabFlash"). Function chỉ nhận 2 model cho phép và giới hạn độ dài prompt; muốn chặn khách (chỉ người đăng nhập) thì kiểm tra JWT trong function.
- Cách khác – key trong trình duyệt, **không nằm trong git** (GitHub Push Protection chặn): chạy local → copy `js/secrets.example.js` thành `js/secrets.js` và điền key (file đã trong `.gitignore`). Khi deploy → đặt biến môi trường **`GEMINI_API_KEY`** trong Netlify (*Site configuration → Environment variables*) hoặc Vercel (*Settings → Environment Variables*); `netlify.toml` / `vercel.json` đã có lệnh build sinh `js/secrets.js` từ biến đó. Deploy bằng kéo thả thư mục thì `secrets.js` trên máy được đưa lên cùng, không cần làm gì. Vì key vẫn tới trình duyệt người dùng, nên vào Google Cloud Console giới hạn key theo **HTTP referrer** (domain web)
