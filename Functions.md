# DubbingStation — Bảng chức năng và trạng thái triển khai

> **Tài liệu kỹ thuật sống** · Cập nhật: **16/09/2026**  
> Mục đích: đối chiếu giữa chức năng mong muốn, chức năng đã có trong mã nguồn và các hạng mục cần hoàn thiện. Trạng thái trong tài liệu này được xác định từ cấu trúc `src/app`, `src/components`, `src/lib`, `src/data`, `prisma/schema.prisma` và các script trong `scripts/`.

## Quy ước trạng thái

- ✅ **Đã triển khai:** Có màn hình/API/logic tương ứng trong repository và có thể sử dụng trong điều kiện đã cấu hình.
- 🟡 **Đã triển khai một phần:** Có luồng chính nhưng còn giới hạn, phụ thuộc môi trường hoặc thiếu một phần yêu cầu.
- 🔧 **Cần hoàn thiện:** Có nền tảng hoặc dữ liệu ban đầu nhưng chưa đủ để gọi là production-ready.
- ⏳ **Chưa triển khai:** Chưa có implementation tương ứng trong repository.

> Các con số như “3.000+ voices”, “100+ ngôn ngữ” và độ chính xác AI là mục tiêu/dữ liệu sản phẩm; khả năng thực tế phụ thuộc provider, model và biến môi trường đang bật.

---

## Mục lục

1. [Tổng quan hiện trạng](#1-tổng-quan-hiện-trạng)
2. [Các đường dẫn người dùng](#2-các-đường-dẫn-người-dùng)
3. [Module 1 — Tài khoản và điều hướng](#3-module-1--tài-khoản-và-điều-hướng)
4. [Module 2 — Studio và TTS](#4-module-2--studio-và-tts)
5. [Module 3 — Dubbing và VietSub](#5-module-3--dubbing-và-vietsub)
6. [Module 4 — STT và dịch phụ đề](#6-module-4--stt-và-dịch-phụ-đề)
7. [Module 5 — Voice cloning](#7-module-5--voice-cloning)
8. [Module 6 — Voice library](#8-module-6--voice-library)
9. [Module 7 — 22 audio tools](#9-module-7--22-audio-tools)
10. [Module 8 — Credits, billing và thanh toán](#10-module-8--credits-billing-và-thanh-toán)
11. [Module 9 — Project, settings và admin](#11-module-9--project-settings-và-admin)
12. [Module 10 — API và tích hợp](#12-module-10--api-và-tích-hợp)
13. [Module 11 — Bảo mật, dữ liệu và vận hành](#13-module-11--bảo-mật-dữ-liệu-và-vận-hành)
14. [Khoảng cách so với đặc tả ban đầu](#14-khoảng-cách-so-với-đặc-tả-ban-đầu)
15. [Backlog ưu tiên](#15-backlog-ưu-tiên)
16. [Tiêu chí hoàn thành production](#16-tiêu-chí-hoàn-thành-production)

---

## 1. Tổng quan hiện trạng

DubbingStation là ứng dụng Next.js/React cho các quy trình giọng nói AI:

- **Server-side:** TTS qua nhiều provider, lồng tiếng video, dịch phụ đề, billing và quản lý tài khoản.
- **Client-side:** đọc file, ghi âm, xử lý một số audio tool bằng Web Audio API/FFmpeg.wasm và Whisper Transformers.js.
- **Hybrid voice cloning:** XTTS-v2/Piper worker tùy môi trường, kết hợp acoustic profiling và local timbre transfer.
- **Dữ liệu:** Prisma + SQLite mặc định cho phát triển; file output và voice sample được lưu local nếu chưa cấu hình object storage.

### Bảng tóm tắt

| Nhóm | Trạng thái hiện tại | Ghi chú chính |
|---|---|---|
| Landing page, FAQ, pricing | ✅ | Có tại `/`, dữ liệu pricing/FAQ nằm trong `src/data`. |
| Đăng ký, OTP, đăng nhập | ✅ | OTP email cần SMTP; NextAuth quản lý session. |
| TTS | 🟡 | Có nhiều provider/fallback; cần cấu hình provider và kiểm tra output production. |
| Video dubbing | 🟡 | Có pipeline FFmpeg và mapping speaker; phụ thuộc TTS, thời gian xử lý dài. |
| VietSub giữ audio gốc | ✅ | Có parser, dịch, style ASS và render FFmpeg tại `/dashboard/vietsub`. |
| STT | 🟡 | Có browser Whisper và API ghi nhận kết quả; giới hạn phụ thuộc trình duyệt/model. |
| Voice cloning | 🟡 | Có upload/record, profiling, XTTS/local worker và preview; cần hardening lưu trữ, queue và GPU. |
| Voice library | 🟡 | Có dữ liệu/provider/filter/preview; favorites, collections và catalog lớn cần hoàn thiện. |
| 22 audio tools | 🟡 | Có catalog và nhiều UI/processor; mức độ xử lý khác nhau theo từng tool. |
| Credits | ✅/🟡 | Có wallet, transaction, atomic deduction ở các luồng chính; cần chuẩn hóa rate và idempotency. |
| VietQR/Stripe | 🟡 | Có order/webhook/checkout; cần secrets, webhook public và kiểm thử đối soát. |
| REST API | 🟡 | Có v1 TTS/STT/dubbing và API key; chưa có SDK, quota dashboard và webhook job hoàn chỉnh. |
| Admin | 🟡 | Có users, credit adjustment và một số thống kê; chưa phải hệ thống observability đầy đủ. |
| Cloud storage/queue/CDN | ⏳ | Chưa tích hợp S3/R2, Redis hoặc hàng đợi xử lý bền vững. |
| i18n VI/EN hoàn chỉnh | ⏳ | Có trường `language` trong User nhưng chưa có hệ thống locale toàn app. |

---

## 2. Các đường dẫn người dùng

| Đường dẫn | Chức năng | Trạng thái |
|---|---|---|
| `/` | Landing page, Studio Console, services, tools showcase, pricing, FAQ | ✅ |
| `/register` | Đăng ký tài khoản | ✅ |
| `/verify-otp` | Xác minh OTP email | ✅ |
| `/login` | Đăng nhập | ✅ |
| `/dashboard` | Studio TTS chính | ✅ |
| `/dashboard/dubbing` | Lồng tiếng theo phụ đề/video | 🟡 |
| `/dashboard/vietsub` | Dịch và đóng phụ đề tiếng Việt, giữ audio gốc | ✅ |
| `/dashboard/stt` | Speech-to-text | 🟡 |
| `/dashboard/translate` | Dịch SRT/VTT/TXT | ✅ |
| `/dashboard/clone` | Nhân bản và thử giọng | 🟡 |
| `/dashboard/voices` | Voice library | 🟡 |
| `/dashboard/tools` | 22 audio tools | 🟡 |
| `/dashboard/projects` | Lịch sử project | ✅ |
| `/dashboard/billing` | Credits, gói và đơn thanh toán | 🟡 |
| `/dashboard/settings` | API keys và cài đặt | ✅ |
| `/docs` | Tài liệu API | 🟡 |
| `/admin` | Quản trị người dùng/credits | 🟡 |
| `/terms`, `/privacy`, `/refund`, `/status` | Pháp lý và trạng thái hệ thống | ✅ |

---

## 3. Module 1 — Tài khoản và điều hướng

| Mã | Chức năng | Trạng thái | Implementation/ghi chú |
|---|---|---|---|
| AUTH-01 | Đăng ký email + mật khẩu | ✅ | `POST /api/auth/register`, tạo User, wallet và subscription mặc định. |
| AUTH-02 | OTP xác minh email | ✅ | `send-otp`, `verify-otp`; SMTP là dependency môi trường. |
| AUTH-03 | Đăng nhập/session | ✅ | NextAuth tại `/api/auth/[...nextauth]`. |
| AUTH-04 | Bảo vệ dashboard/API | ✅ | Server session ở các API chính. |
| AUTH-05 | Header, menu và CTA | ✅ | `src/components/layout/Header.tsx`. |
| AUTH-06 | Profile menu, logout | 🟡 | Có session/logout; trang profile đầy đủ và đổi mật khẩu cần bổ sung. |
| AUTH-07 | Badge số dư credits | ✅ | Lấy từ `/api/user/credits`; cần polling/revalidation tốt hơn để gọi là realtime. |
| AUTH-08 | VI/EN toàn bộ giao diện | ⏳ | Chưa có locale routing/dictionary; trường `User.language` chưa đủ để bật i18n. |
| AUTH-09 | Rate limit và chống abuse | 🟡 | Có `src/lib/rateLimit.ts`; cần áp dụng đồng nhất cho mọi endpoint upload/generation. |

---

## 4. Module 2 — Studio và TTS

### 4.1 Studio Console

| Mã | Chức năng | Trạng thái |
|---|---|---|
| STU-01 | Chuyển 4 mode TTS/Dubbing/STT/Clone | ✅ | `StudioConsole`, `ModeTabs`, điều hướng theo mode. |
| STU-02 | Nhập văn bản Unicode, đếm ký tự | ✅ | `TextInputArea`; giới hạn tùy gói cần được enforce ở server. |
| STU-03 | Ước tính credits | ✅ | Có ở UI và billing TTS; cần dùng cùng một hàm rate duy nhất. |
| STU-04 | Chèn pause/emphasis/whisper | ✅/🟡 | Có helper tags; mức độ provider hiểu SSML không đồng nhất. |
| STU-05 | Chọn voice/emotion/speed | ✅ | `VoiceModal`, `ControlDeck`; provider thực tế quyết định khả năng emotion. |
| STU-06 | Generate, player, waveform | ✅ | Có `AudioPlayerDeck` và endpoint stream. |
| STU-07 | Download output | ✅ | Có route phục vụ generated audio; cần signed URL/object storage cho production. |
| STU-08 | Cloud save/share link | ⏳ | Chưa có storage/share permission hoàn chỉnh; không nên hiển thị như đã sẵn sàng. |

### 4.2 TTS backend

- `POST /api/tts/generate`: kiểm tra session, tính/trừ credits và tạo `AudioProject`.
- `GET /api/tts/stream`: stream TTS với cascade provider/fallback.
- `POST /api/tts/batch`: batch generation.
- `GET/POST /api/v1/tts`: API key cho tích hợp bên ngoài.
- Provider hiện có trong `src/lib/tts/`: Edge, OpenAI, Google, Piper, Hugging Face, CapCut, XTTS và DSP.

**Cần hoàn thiện:**

1. Thống nhất output URL: một số metadata/project path còn dùng URL mẫu hoặc local path.
2. Đưa provider/model/rate vào một registry có kiểm thử thay vì rải fallback trong route.
3. Thêm job queue, progress và retry cho văn bản dài/batch.
4. Enforce giới hạn ký tự theo plan ở server, không chỉ hiển thị ở client.
5. Thêm kiểm thử audio thật: duration, MIME, sample rate, file tồn tại và lỗi provider.

---

## 5. Module 3 — Dubbing và VietSub

### 5.1 Subtitle Video Dubbing — `CORE-DUB`

| Mã | Chức năng | Trạng thái | Ghi chú |
|---|---|---|---|
| DUB-01 | Parse SRT/VTT/TXT và deduplicate cue | ✅ | `src/lib/subtitleParser.ts`. |
| DUB-02 | Upload video/audio hoặc dán subtitle | ✅ | UI tại `/dashboard/dubbing`. |
| DUB-03 | Nhận diện speaker/voice map | 🟡 | Có `speakerDiarizer` và mapping; chất lượng phụ thuộc nhãn/nguồn audio. |
| DUB-04 | Tạo audio theo cue và căn tốc độ | ✅ | FFmpeg + TTS từng cue; cần tối ưu cho file dài. |
| DUB-05 | Mix voice với audio nền | ✅ | Có pipeline dialogue interval/mix trong `dubbingEngine` và route. |
| DUB-06 | Export video | 🟡 | Có output FFmpeg; 4K, codec và giới hạn file chưa được kiểm thử toàn diện. |
| DUB-07 | Resume/progress/background job | ⏳ | Request dài hiện chưa thay thế được queue bền vững. |
| DUB-08 | Preview từng cue và chỉnh timeline | 🔧 | Nên bổ sung để người dùng duyệt trước khi trừ credits/render. |

Endpoint chính: `POST /api/dubbing/generate`, `POST /api/v1/dubbing`.

### 5.2 VietSub giữ audio gốc — `CORE-VIETSUB`

Đây là luồng riêng với dubbing: dịch phụ đề và burn subtitle vào video, không thay thế audio.

- Nhận `.srt`, `.vtt`, `.txt` hoặc trích transcript từ video bằng Whisper.
- Dịch theo cue, có tone tiếng Việt và polisher.
- Style ASS: vị trí, màu, cỡ chữ, cover box/banner để che hardsub.
- Render MP4 bằng FFmpeg và giữ stream audio gốc khi có thể.
- Endpoint: `POST /api/vietsub/generate`.

**Cần hoàn thiện:** kiểm thử codec/subtitle với nhiều container, giới hạn upload, progress cho video dài, cleanup file tạm và lưu output bền vững.

---

## 6. Module 4 — STT và dịch phụ đề

### 6.1 Speech-to-Text — `CORE-STT`

| Mã | Chức năng | Trạng thái |
|---|---|---|
| STT-01 | Browser transcription với Whisper Transformers.js | 🟡 | `browserTranscriber.ts`, cần RAM/WASM và model phù hợp trình duyệt. |
| STT-02 | Auto language detection | 🟡 | Có hỗ trợ auto nhưng kết quả phụ thuộc model/audio. |
| STT-03 | Timestamp segments | ✅ | Kết quả được chuẩn hóa thành segments. |
| STT-04 | Speaker diarization | 🟡 | Có `speakerDiarizer`, chưa bảo đảm chất lượng production cho mọi audio. |
| STT-05 | Export SRT/VTT/TXT | ✅/🟡 | Có trong UI/utility; DOCX và format export đầy đủ cần kiểm tra/bổ sung. |
| STT-06 | Guest demo | ✅ | Guest bị giới hạn tối đa 30 giây ở API ghi nhận kết quả. |
| STT-07 | Trừ credits theo duration | 🟡 | Đã có transaction; rate cần đồng bộ với pricing/spec hiện hành. |

Endpoint: `POST /api/stt/transcribe`, `POST /api/v1/stt`.

### 6.2 Dịch phụ đề

- `/dashboard/translate` hỗ trợ dán SRT/VTT.
- `POST /api/translate` có cascade provider/fallback và xử lý theo cue.
- Có `vietnameseSubtitlePolisher` với tone natural, conversational, dramatic, romantic, period, polite.

**Cần hoàn thiện:** cache theo cue, quota/cost rõ ràng, kiểm soát prompt injection trong subtitle, bảo toàn formatting nâng cao và test regression đa ngôn ngữ.

---

## 7. Module 5 — Voice cloning

### 7.1 Chức năng đã có

| Mã | Chức năng | Trạng thái |
|---|---|---|
| CLONE-01 | Upload một/nhiều audio sample | ✅ | `POST /api/clone`, có kiểm tra consent và metadata. |
| CLONE-02 | Thu âm microphone | ✅ | UI clone dùng MediaRecorder. |
| CLONE-03 | Phân tích chất lượng/acoustic profile | ✅ | F0, register, warmth/brightness/formants và quality metadata. |
| CLONE-04 | Local hybrid timbre transfer | ✅ | `src/lib/voiceCloneEngine.ts`, fallback local khi worker offline. |
| CLONE-05 | XTTS-v2/Piper worker | 🟡 | Có `scripts/voice_worker.py`, FastAPI/Colab flow; cần GPU/service config. |
| CLONE-06 | Latent caching và playback | 🟡 | Có metadata/latent path; cần lifecycle cleanup và storage production. |
| CLONE-07 | Inline synthesis test | ✅/🟡 | Có UI và API synthesize; cần giới hạn abuse và kiểm tra model language. |
| CLONE-08 | Đồng bộ voice vào Studio | ✅ | Custom voices từ API/local store được merge vào selector. |
| CLONE-09 | Xóa voice và toàn bộ sample | 🟡 | Có route audio/delete flow; cần xác minh xóa triệt để metadata, latent và backup. |
| CLONE-10 | Professional fine-tuning 5–30 phút | ⏳ | Có script nghiên cứu/dataset nhưng chưa phải luồng SaaS production hoàn chỉnh. |

### 7.2 Pipeline hybrid

1. Chuẩn hóa và kiểm tra sample.
2. Trích xuất acoustic profile và lưu metadata version 3.
3. Chọn base voice phù hợp hoặc gọi GPU worker qua `VOICE_WORKER_URL`/`XTTS_API_URL`.
4. Synthesize bằng XTTS/Piper/local timbre transfer.
5. DSP: pitch, formant, EQ, tốc độ và loudness.
6. Lưu kết quả và hiển thị trong Studio.

**An toàn bắt buộc:** chỉ clone giọng khi có quyền/consent; không upload sample của người khác khi chưa được phép; giới hạn kích thước/thời lượng; không public sample URL; xóa dữ liệu khi người dùng yêu cầu.

---

## 8. Module 6 — Voice library

| Mã | Chức năng | Trạng thái |
|---|---|---|
| LIB-01 | Catalog voice/provider | ✅/🟡 | Có `src/data/voices.ts`, `voiceProfiles.ts` và `/api/voices`. |
| LIB-02 | Search theo tên/phong cách | ✅ | Có UI tại `/dashboard/voices`. |
| LIB-03 | Filter ngôn ngữ/giới tính/vùng miền/tuổi | 🟡 | Có metadata/filter; cần kiểm tra đầy đủ từng field. |
| LIB-04 | Preview sample | ✅ | `/api/voices/preview` với fallback provider. |
| LIB-05 | Chọn voice cho Studio | ✅ | Voice modal và query/selection hiện có. |
| LIB-06 | Favorites, tags, collections | ⏳ | Chưa có model/database API bền vững. |
| LIB-07 | Catalog 3.000+ quản trị được | 🔧 | Cần nguồn dữ liệu/versioning, health check sample và admin CRUD. |

---

## 9. Module 7 — 22 audio tools

Catalog 22 tool được định nghĩa tại `src/data/audioTools.ts`, UI tại `/dashboard/tools`, dùng Web Audio API/FFmpeg.wasm và một số processor local. Các mã:

| Mã | Tool | Trạng thái định hướng |
|---|---|---|
| TOOL-01 | Audio Trim | ✅ |
| TOOL-02 | Vocal Remover | 🟡 — cần model/worker chuyên dụng để đạt chất lượng cao |
| TOOL-03 | Four-stem splitter | 🟡 — cần model nặng và progress/worker |
| TOOL-04 | Noise Reducer | 🟡 |
| TOOL-05 | Volume Booster | ✅ |
| TOOL-06 | Speed Changer | ✅ |
| TOOL-07 | Silence Remover | 🟡 |
| TOOL-08 | Audio Converter | ✅ |
| TOOL-09 | Voice Recorder | ✅ |
| TOOL-10 | 5-band EQ | ✅ |
| TOOL-11 | Audio Joiner | ✅ |
| TOOL-12 | Video Audio Extractor | ✅ |
| TOOL-13 | Reverse Audio | ✅ |
| TOOL-14 | Pitch Shifter | 🟡 |
| TOOL-15 | Reverb/Echo | ✅ |
| TOOL-16 | Voice Changer | 🟡 |
| TOOL-17 | Audio Compressor | ✅ |
| TOOL-18 | Audio Mixer | ✅/🟡 — UI/track count cần mở rộng |
| TOOL-19 | Ringtone Maker | ✅ |
| TOOL-20 | Audio Normalizer | 🟡 — cần đo LUFS chuẩn hơn |
| TOOL-21 | ID3 Editor | 🔧 |
| TOOL-22 | Audiogram Generator | 🔧 |

Tất cả tool được định vị là **không trừ credits**. Không nên mô tả là “không giới hạn dung lượng” nếu chưa có giới hạn trình duyệt, RAM và worker được kiểm thử; cần hiển thị giới hạn thực tế/thông báo lỗi rõ ràng.

**Cải thiện chung:** Web Worker để không block UI, cancel job, file-size guard, progress, cleanup object URL, export MIME nhất quán, test trên Chrome/Firefox/Safari và accessibility cho waveform/slider.

---

## 10. Module 8 — Credits, billing và thanh toán

### 10.1 Dữ liệu và luồng hiện có

- `CreditWallet` lưu `balance`, `totalEarned`, `totalConsumed`.
- `CreditTransaction` lưu lịch sử cộng/trừ.
- `PaymentOrder` lưu gói, chu kỳ, số tiền, mã chuyển khoản và trạng thái.
- `Subscription` lưu tier, thời hạn và trạng thái.
- `GET /api/user/credits`, `/api/billing`, `/api/billing/orders` phục vụ dashboard.
- VietQR: tạo order và xác minh webhook `POST /api/payments/sepay`.
- Stripe: checkout tại `/api/payments/stripe/checkout`, webhook tại `/api/payments/stripe/webhook`.

### 10.2 Rate hiện hành trong code cần chuẩn hóa

| Dịch vụ | Rate đang thấy trong route | Ghi chú |
|---|---:|---|
| TTS provider thường | 1 credit/ký tự | `/api/tts/generate` |
| OpenAI TTS | 3 credits/ký tự | `/api/tts/generate` |
| STT | 50 credits/giây | `/api/stt/transcribe` |
| Audio/video dubbing | Cần đối chiếu route và billing trước khi công bố một rate duy nhất | Không để UI/spec lệch backend |
| Audio tools | 0 credit | Client-side định hướng |

> Đặc tả cũ ghi STT 30 credit/giây và audio/video 50/100 credit/giây, trong khi code hiện tại có nơi dùng STT 50. Đây là **việc cần quyết định và sửa đồng bộ**, không được tiếp tục quảng bá hai mức khác nhau.

### 10.3 Bảng giá dữ liệu hiện tại

`src/data/pricing.ts` có Free/Lite/Starter/Growth/Pro, hỗ trợ monthly/annual và khuyến mại. Cần sửa sai lệch `Free.credits` đang là `10000` nhưng nhãn và wallet mặc định là `50.000`, sau đó thêm test kiểm tra bảng giá với server billing.

### 10.4 Backlog thanh toán

1. Idempotency cho mọi webhook và checkout.
2. Đối soát số tiền, currency, plan, user và transaction provider.
3. Expire order tự động, retry webhook, audit log.
4. Hủy/gia hạn subscription thực sự thay vì chỉ lưu trạng thái.
5. Không commit secrets; validate toàn bộ biến môi trường khi startup.
6. Thêm test sandbox Stripe/SePay và test double-delivery.

---

## 11. Module 9 — Project, settings và admin

### Project/history

- `AudioProject` lưu loại project, input/output, duration, character count, credits và status.
- `/dashboard/projects` hiển thị/tìm kiếm lịch sử.
- Cần bổ sung retry, rename, delete, pagination server-side, ownership check và output retention policy.

### Settings/API keys

- `/dashboard/settings` và `/api/keys` hỗ trợ tạo, liệt kê, vô hiệu hóa/xóa API key.
- Key lưu hash/masked key; không hiển thị secret lại sau khi tạo.
- Cần bổ sung scope theo endpoint, quota, expiry bắt buộc tùy use case, last-used audit và rotation UX.

### Admin

- `/admin` và `/api/admin/users` hỗ trợ xem/tìm user, OTP state, điều chỉnh credits và thao tác quản trị cơ bản.
- Cần bổ sung RBAC rõ ràng, audit log bất biến, pagination/filter server-side, analytics doanh thu, health/GPU metrics, voice catalog CRUD và xác nhận thao tác nguy hiểm.

---

## 12. Module 10 — API và tích hợp

### API route hiện có

| Endpoint | Auth | Mục đích |
|---|---|---|
| `POST /api/tts/generate` | Session | TTS + billing + project |
| `GET /api/tts/stream` | Theo route/provider | Stream audio TTS |
| `POST /api/tts/batch` | Session/API tùy flow | Batch TTS |
| `POST /api/dubbing/generate` | Session | Render dubbing |
| `POST /api/stt/transcribe` | Guest giới hạn / session | Ghi nhận transcript + billing |
| `POST /api/translate` | Theo flow | Dịch subtitle/text |
| `POST /api/vietsub/generate` | Session | Burn VietSub giữ audio |
| `GET/POST /api/v1/tts` | API key | TTS public API |
| `POST /api/v1/dubbing` | API key | Dubbing public API |
| `POST /api/v1/stt` | API key | STT public API |
| `/api/keys` | Session | Quản lý API key |
| `/api/clone/*` | Session | Clone, synthesize, worker status và audio |
| `/api/voices/*` | Theo route | Catalog, preview, analyze |
| `/api/projects` | Session | Lịch sử project |

### API còn thiếu để gọi là hoàn chỉnh

- OpenAPI schema/versioning và ví dụ request/response.
- Error schema thống nhất (`code`, `message`, `requestId`, `details`).
- Idempotency key cho generation/payment.
- Async job endpoint: create/status/cancel/download.
- Webhook đăng ký, ký payload, retry và event catalog.
- Rate limit/quota header, pagination và upload limits.
- SDK TypeScript/Python và Postman collection.

---

## 13. Module 11 — Bảo mật, dữ liệu và vận hành

### Đã có nền tảng

- Session/auth, bcrypt, Prisma relation cascade, API key hash/mask.
- `rateLimit`, input validation cơ bản và consent trong voice cloning.
- Legal pages: `/terms`, `/privacy`, `/refund`.
- Status page: `/status`.

### Cần cải thiện bắt buộc

1. Dùng object storage private + signed URL thay cho `public/generated` và `public/user-voices` khi deploy production.
2. Validate MIME, magic bytes, size, duration, codec và archive bomb cho mọi upload.
3. Quét/normalize filename, không dùng user input làm path.
4. Xóa file tạm trong `finally`, retention job và nút xóa dữ liệu toàn bộ.
5. CSRF/origin policy cho mutation, security headers, CORS rõ ràng.
6. Structured logging, request ID, metrics, tracing và cảnh báo provider failure.
7. Queue cho render/clone/STT dài; giới hạn concurrency và timeout.
8. Backup/restore database và migration thay vì chỉ `db push` production.
9. Test unit/integration/e2e và kiểm tra accessibility.
10. Cập nhật README/Functions cùng một nguồn sự thật về rates, giá, route và biến môi trường.

---

## 14. Khoảng cách so với đặc tả ban đầu

Các điểm từng được mô tả nhưng **chưa nên coi là đã hoàn thành**:

- Menu i18n VI/EN tức thì toàn bộ giao diện.
- Cloud save, public share link và CDN.
- Favorites/tags/collections cho voice library.
- Professional clone/fine-tuning như một job production.
- Dubbing 4K, hàng nghìn cue và render đồng thời đã được đảm bảo.
- STT 99,2% cho mọi ngôn ngữ/audio.
- Export DOCX hoàn chỉnh trong mọi luồng.
- Stripe/PayPal/Momo/VNPay đồng thời; hiện source có Stripe và VietQR/SePay, các provider khác cần tích hợp riêng.
- Webhook render job hoàn chỉnh; webhook hiện có chủ yếu cho payment.
- GPU dashboard/auto-scaling/99,99% uptime.
- Không giới hạn kích thước file client-side.

Tài liệu sản phẩm và UI nên dùng từ “hỗ trợ”, “tùy cấu hình”, “đang thử nghiệm” cho các mục trên cho đến khi có test và monitoring chứng minh.

---

## 15. Backlog ưu tiên

### P0 — trước production

- [ ] Chuẩn hóa credit rate và sửa `pricingPlans.free.credits`.
- [ ] Bảo vệ file bằng private storage/signed URL.
- [ ] Enforce upload limits, MIME/magic-byte/duration và cleanup.
- [ ] Idempotency cho billing/webhook và atomic usage cho mọi API.
- [ ] Queue + status cho dubbing/clone/STT dài.
- [ ] Kiểm tra output URL không còn placeholder.
- [ ] Security headers, CORS, CSRF/origin, audit log admin.
- [ ] Test build, API integration, payment sandbox và critical e2e.

### P1 — trải nghiệm và độ tin cậy

- [ ] Preview cue/timeline trước render dubbing.
- [ ] Progress, cancel, retry và thông báo lỗi có request ID.
- [ ] Favorites/collections voice; catalog sync/health check.
- [ ] OpenAPI, SDK, webhook job và quota dashboard.
- [ ] Web Worker cho tool nặng; file guard và cancel.
- [ ] Subscription renewal/cancel thực sự và email receipts.
- [ ] Backup/restore, retention policy, GDPR export/delete.

### P2 — mở rộng sản phẩm

- [ ] i18n VI/EN bằng dictionary + locale routing.
- [ ] S3/R2/CDN và multi-region processing.
- [ ] Fine-tuning voice chuyên nghiệp có consent/audit.
- [ ] Mobile/PWA, team workspace và role sharing.
- [ ] Observability GPU, autoscaling và cost analytics.

---

## 16. Tiêu chí hoàn thành production

Một chức năng chỉ chuyển từ 🟡/🔧 sang ✅ khi thỏa cả bốn điều kiện:

1. Có UI/API hoàn chỉnh và kiểm tra quyền sở hữu dữ liệu.
2. Có validation, giới hạn tài nguyên, xử lý lỗi và cleanup.
3. Có unit/integration/e2e test cho happy path, retry, timeout và input xấu.
4. Có logging/metrics, tài liệu người dùng và hướng dẫn vận hành.

**Tài liệu liên quan:**

- Hướng dẫn người dùng và cài đặt: [`README.md`](README.md)
- Schema dữ liệu: [`prisma/schema.prisma`](prisma/schema.prisma)
- Dữ liệu giá: [`src/data/pricing.ts`](src/data/pricing.ts)
- Dữ liệu tools: [`src/data/audioTools.ts`](src/data/audioTools.ts)
- API docs UI: [`src/app/docs/page.tsx`](src/app/docs/page.tsx)
