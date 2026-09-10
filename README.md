---
title: DubbingStation
emoji: 🎙️
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
---

# DubbingStation   
https://dubbing-station.onrender.com/

> All-in-One AI Voice Studio cho sáng tạo nội dung, biên tập video, giáo dục và doanh nghiệp.

**Phiên bản:** v1.0
**Tác giả:** Võ Phạm Gia Kiệt
**Ngày tạo:** 05/09/2026

## Mục lục

- [Tầm nhìn và mục tiêu](#tầm-nhìn-và-mục-tiêu)
- [Người dùng mục tiêu](#người-dùng-mục-tiêu)
- [Tính năng cốt lõi](#tính-năng-cốt-lõi)
- [Mô hình Credits](#mô-hình-credits)
- [Bảng giá](#bảng-giá)
- [Kiến trúc kỹ thuật](#kiến-trúc-kỹ-thuật)
- [Hướng dẫn chạy Docker & Local Coqui XTTS (Voice Clone)](#hướng-dẫn-chạy-docker--local-coqui-xtts-voice-clone)
- [Yêu cầu phi chức năng](#yêu-cầu-phi-chức-năng)
- [Lộ trình phát triển](#lộ-trình-phát-triển)

## Tầm nhìn và mục tiêu

### Tầm nhìn

Xây dựng **DubbingStation** thành nền tảng **All-in-One AI Voice Studio** hàng đầu, cho phép người sáng tạo nội dung, biên tập viên video, giáo viên, nhà tiếp thị và doanh nghiệp tạo hoặc lồng tiếng âm thanh chất lượng studio chuyên nghiệp bằng vài cú nhấp chuột, trên nhiều ngôn ngữ.


### Mục tiêu kinh doanh

- Độ trễ xử lý TTS ngắn dưới **1,5 giây**.
- Đạt **100.000 người dùng đăng ký** trong 6 tháng đầu.
- Đạt tỷ lệ chuyển đổi từ dùng thử sang trả phí trên **3,5%**.

## Người dùng mục tiêu

1. **Content Creators:** YouTubers, TikTokers và podcasters cần giọng đọc tự nhiên cho Shorts, Reels, TikTok hoặc video dài.
2. **Video Editors và Film Translators:** Tự động lồng tiếng từ file phụ đề SRT/VTT, khớp với mốc thời gian.
3. **EdTech và Course Creators:** Nhân bản giọng nói để sản xuất bài giảng tự động.
4. **Doanh nghiệp và Marketers:** Tạo lồng tiếng đa ngôn ngữ cho video quảng cáo.

## Tính năng cốt lõi

### AI Voice Studio

#### Text-to-Speech (TTS)

- Hỗ trợ mục tiêu **100+ ngôn ngữ** và **3.000+ giọng đọc**.
- Đa dạng giới tính, độ tuổi và cảm xúc.
- Tùy chỉnh ngữ điệu, cảm xúc, tốc độ đọc (WPM), cao độ (pitch) và khoảng nghỉ.

#### Subtitle-to-Audio và Video Dubbing

- Tải lên file phụ đề `.srt`, `.vtt` hoặc video `.mp4`.
- Tự động nhận diện khung thời gian và tạo lồng tiếng khớp từng đoạn, từng giây với video.

#### Speech-to-Text (STT)

- Trích xuất văn bản hoặc phụ đề từ file âm thanh và bản ghi âm.
- Hướng tới độ chính xác cao cho quy trình biên tập và hậu kỳ.

#### Custom Voice Cloning (Local Coqui XTTS-v2)

- **Zero-Shot Voice Cloning:** Tích hợp mô hình **Coqui XTTS-v2** chạy trực tiếp offline/local, không gửi giọng nói lên bên thứ ba.
- **Audio mẫu ngắn gọn:** Chỉ cần tải lên file âm thanh WAV/MP3 hoặc thu âm trực tiếp từ microphone từ **10 đến 30 giây**.
- **Tính năng Thử XTTS trực tiếp (Inline Synthesis Test):** Kiểm tra và nghe thử giọng clone đọc câu thoại bất kỳ ngay trên bảng điều khiển `/dashboard/clone` trước khi đưa vào dự án chính.
- **Tích hợp đồng bộ Studio:** Giọng clone sau khi tạo tự động hiển thị trong Studio Console (`/dashboard`), sẵn sàng cho các tác vụ Text-to-Speech, Subtitle Dubbing và lồng tiếng video.
- **Quản lý an toàn:** Lưu trữ cục bộ bảo mật tại `public/user-voices/`, hỗ trợ tải lại mẫu giọng gốc hoặc xóa bỏ hoàn toàn dữ liệu.

### 22 Free Audio Tools

Các công cụ xử lý trực tiếp trên trình duyệt, không cần cài đặt:

| Nhóm | Công cụ và khả năng |
| --- | --- |
| Xử lý cơ bản | Cắt âm thanh (Trim Audio), nối file (Audio Joiner), đảo ngược (Audio Reverser), tách âm thanh từ video (Video to Audio) |
| Tối ưu âm thanh | Lọc tiếng ồn (Noise Reducer), xóa khoảng lặng (Silence Remover), tăng/giảm âm lượng từ 10% đến 300%, điều chỉnh tốc độ từ 0,25x đến 3,0x, chỉnh pitch, equalizer 5-band |
| AI nâng cao | Bóc tách lời hát (Vocal Remover/Karaoke), tách 4 track nhạc cụ bằng AI (AI Music Splitter) |
| Định dạng và thu âm | Chuyển đổi MP3, WAV, FLAC, OGG; ghi âm microphone trực tiếp với biểu đồ sóng (Waveform) |

## Mô hình Credits

Tất cả dịch vụ dùng chung một số dư **Unified Credit Balance**:

| Dịch vụ | Quy đổi |
| --- | --- |
| Text-to-Speech | 1 Credit = 1 ký tự văn bản |
| Audio Dubbing | 50 Credits / giây âm thanh, tương đương khoảng 3.000 Credits / phút |
| Video Dubbing và Subtitle | 100 Credits / giây video, tương đương khoảng 6.000 Credits / phút |

## Bảng giá

| Gói | Giá/tháng | Credits/tháng | Tính năng chính |
| --- | ---: | ---: | --- |
| Free | $0 | 50.000 | Tối đa 3.000 ký tự/lần, 300 giọng chuẩn, 22 audio tools miễn phí |
| Lite | $2,00 | 99.000 | Mở khóa 3.000+ giọng premium, tạo tối đa 20 giọng clone |
| Starter | $9,00 | 999.000 | Ưu tiên tốc độ xử lý, tạo tối đa 100 giọng clone |
| Growth | $19,00 | 2.499.000 | Công cụ Video Dubbing/SRT chuyên sâu, tạo tối đa 500 giọng clone |
| Pro / Enterprise | $29,00 | 3.999.000 | API Access, tạo tối đa 1.000 giọng clone, hỗ trợ 1-on-1 |

## Kiến trúc kỹ thuật

### Frontend

- Next.js 14, React 18, TypeScript và TailwindCSS.
- Web Audio API / AudioContext để giải mã, trộn và resample audio ngay trên trình duyệt.
- Transformers.js chạy trên WebAssembly để nhận dạng giọng nói phía client.
- FFmpeg.wasm để trích xuất audio từ video và tạo phụ đề cục bộ.

### Backend

- Next.js API Routes chạy trên Node.js để quản lý luồng dịch, TTS, STT, lồng tiếng và xử lý file.
- FFmpeg native được gọi từ Node.js để căn timestamp, mix audio và ghép track lồng tiếng vào video.
- Prisma ORM và database để lưu người dùng, project, credit wallet và lịch sử sử dụng.

### AI Model Integration

- **Speech-to-Text:** mô hình `Xenova/whisper-tiny` của Hugging Face thông qua Transformers.js, chạy bằng WASM trong trình duyệt và tạo timestamp cho từng đoạn thoại.
- **Dịch phụ đề:** OpenAI `gpt-4o-mini` qua Chat Completions API; Google Translate endpoint được dùng làm phương án dự phòng.
- **Text-to-Speech:** Microsoft Neural TTS qua `edge-tts-universal`, OpenAI `tts-1-hd`, Piper TTS chạy local bằng Python với model ONNX, và Google Translate TTS làm fallback.
- **Voice Cloning (Zero-Shot TTS):** Mô hình **Coqui XTTS-v2** (`tts_models/multilingual/multi-dataset/xtts_v2`) chạy cục bộ thông qua pipeline Python `scripts/xtts_synthesize.py` và wrapper Node.js `src/lib/tts/xtts.ts`. Hỗ trợ nhân bản voice timbre đa ngôn ngữ từ audio tham chiếu gốc mà không cần huấn luyện lại mạng nơ-ron.
- **Xử lý giọng:** điều chỉnh tốc độ, pitch, volume, fade và loudness normalization trước khi xuất audio.
- **Định dạng phụ đề:** hỗ trợ SRT, VTT và TXT với timestamp theo từng cue.

### Cloud và Storage

- File video đầu ra hiện được lưu trong thư mục `public/generated`.
- Chưa tích hợp AWS S3, Cloudflare R2, Redis hoặc CDN trong phiên bản hiện tại; đây là các hướng mở rộng về sau.

### Thanh toán chuyển khoản VietQR

- Checkout tạo `PaymentOrder` ở trạng thái `PENDING` với số tiền và nội dung chuyển khoản duy nhất cho từng người dùng.
- QR được tạo từ `PAYMENT_BANK_ID`, `PAYMENT_ACCOUNT_NO` và `PAYMENT_ACCOUNT_NAME` trong biến môi trường.
- Webhook ngân hàng gửi tới `POST /api/payments/sepay` kèm `x-sepay-api-key` hoặc `Authorization: Apikey ...`.
- Hệ thống chỉ cộng Credits khi webhook xác minh đúng số tiền, đúng nội dung và giao dịch chưa được xử lý; webhook lặp lại không cộng trùng.
- Cần cấu hình `SEPAY_WEBHOOK_API_KEY` và URL public của ứng dụng trong SePay hoặc cổng webhook ngân hàng tương ứng.
- Nút “Kiểm tra giao dịch” chỉ kiểm tra trạng thái đơn, không có quyền tự cộng Credits.

### Deploy lên Hugging Face Spaces

1. Tạo Space mới tại Hugging Face, chọn SDK **Docker** và chọn phần cứng phù hợp.
2. Đẩy toàn bộ repository lên Space. File `Dockerfile` sẽ tự cài Next.js, FFmpeg và Piper TTS.
3. Trong **Settings → Variables and secrets**, thêm `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `DATABASE_URL`, `PAYMENT_BANK_ID`, `PAYMENT_ACCOUNT_NO`, `PAYMENT_ACCOUNT_NAME`, `SEPAY_WEBHOOK_API_KEY` và `OPENAI_API_KEY` nếu dùng OpenAI.
4. Đặt `NEXTAUTH_URL` bằng URL Space, ví dụ `https://username-dubbingstation.hf.space`.
5. Gắn Storage Bucket vào `/data` để giữ SQLite database và file sinh ra sau khi Space restart. Không dùng database SQLite tạm cho production.
6. Cấu hình SePay webhook tới `https://username-dubbingstation.hf.space/api/payments/sepay`.

Space phải chạy ở port `7860`, đã được khai báo trong metadata README và Dockerfile. Build có thể mất vài phút vì phải cài Piper và các dependency âm thanh.

## Hướng dẫn chạy Docker & Local Coqui XTTS (Voice Clone)

Hệ thống hỗ trợ đóng gói trọn gói toàn bộ ứng dụng Next.js, Piper TTS và mô hình **Coqui XTTS-v2** vào một Docker image duy nhất.

### 1. Build Docker Image

Chạy lệnh build trong thư mục gốc của dự án:

```bash
docker build --load --progress=plain -t dubbingstation-xtts .
```

> **Lưu ý:** Quá trình build lần đầu sẽ tải và cài đặt các phụ thuộc PyTorch, TTS, spacy, transformers và biên dịch Next.js 14. Thời gian build khoảng 5 – 10 phút tùy theo tốc độ mạng và CPU.

### 2. Khởi chạy Docker Container

Khởi chạy container với volume persistent lưu trữ database, audio tải lên và cache model weights của XTTS (~2.5GB):

```bash
docker run -d \
  -p 7860:7860 \
  -v dubbingstation-data:/data \
  --name dubbingstation \
  dubbingstation-xtts
```

Nếu máy chủ có GPU NVIDIA và đã cài NVIDIA Container Toolkit, bạn có thể kích hoạt tăng tốc GPU cho XTTS:

```bash
docker run -d \
  --gpus all \
  -e XTTS_USE_GPU=true \
  -p 7860:7860 \
  -v dubbingstation-data:/data \
  --name dubbingstation \
  dubbingstation-xtts
```

### 3. Các biến môi trường quan trọng

| Biến môi trường | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `COQUI_TOS_AGREED` | `1` | Tự động đồng ý điều khoản bản quyền CPML của Coqui để chạy headless |
| `TTS_HOME` | `/data/tts-cache` | Thư mục lưu trữ model weights XTTS-v2 để tránh tải lại sau khi khởi động lại container |
| `XTTS_MODEL` | `tts_models/multilingual/multi-dataset/xtts_v2` | Định danh model clone giọng Coqui |
| `XTTS_USE_GPU` | `false` | Bật (`true`) / tắt (`false`) chế độ tăng tốc GPU CUDA |
| `DATABASE_URL` | `file:/data/dev.db` | Đường dẫn SQLite database lưu trong volume data |
| `GENERATED_DIR` | `/data/generated` | Thư mục lưu audio/video đầu ra |

### 4. Quy trình sử dụng tính năng Clone giọng nói

1. **Truy cập trang nhân bản giọng:**
   Mở trình duyệt vào `http://localhost:7860/dashboard/clone` (hoặc `http://localhost:3000/dashboard/clone` trên môi trường dev).
2. **Thiết lập mẫu huấn luyện:**
   - Nhập tên đại diện cho giọng (VD: *Giọng Kể Chuyện Của Tôi*).
   - Chọn giới tính (Nam / Nữ / Trung tính) và ngôn ngữ chuẩn.
   - Chọn chế độ: **Instant Clone** (5.000 Credits) hoặc **Professional Clone** (20.000 Credits).
   - Tải lên tệp âm thanh giọng nói mẫu (10 – 30 giây, định dạng WAV/MP3) hoặc thu âm trực tiếp.
   - Đánh dấu đồng ý cam kết bản quyền và bấm **"Nhân Bản Giọng Ngay"**.
3. **Thử nghiệm sinh giọng trực tiếp với XTTS (Inline Test):**
   - Tại danh sách "Giọng Độc Quyền Của Bạn", bấm nút **"Thử XTTS"** trên card giọng tương ứng.
   - Nhập đoạn văn bản bạn muốn đọc thử.
   - Bấm **"Đọc thử"**: Hệ thống sẽ gọi API `/api/clone/synthesize` để Coqui XTTS-v2 nạp audio mẫu của bạn và sinh audio giọng đọc mới tại chỗ.
4. **Sử dụng trong Studio:**
   - Bấm nút **"Dùng"** để chuyển thẳng sang Studio Console (`/dashboard?voice=custom-...`).
   - Giọng clone sẽ tự động đồng bộ vào danh sách chọn giọng (*Voice Selector*), áp dụng cho cả tính năng chuyển văn bản thành giọng nói (TTS) và lồng tiếng phụ đề video (Dubbing).

## Yêu cầu phi chức năng

- **Bảo mật:** Mã hóa dữ liệu người dùng, tuân thủ GDPR.
- **Quyền thương mại:** Người dùng giữ 100% bản quyền thương mại đối với âm thanh được tạo ra.
- **Hiệu năng:** Auto-scaling để phục vụ hàng nghìn yêu cầu render audio đồng thời.
- **Đa nền tảng:** Responsive trên web, định hướng phát triển ứng dụng iOS và Android.

