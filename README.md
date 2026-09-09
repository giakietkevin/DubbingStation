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

#### Custom Voice Cloning

- Tải lên hoặc ghi âm mẫu giọng dài từ **10 giây đến 1 phút**.
- Tạo giọng đọc tùy chỉnh để lồng tiếng đa ngôn ngữ.

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

## Yêu cầu phi chức năng

- **Bảo mật:** Mã hóa dữ liệu người dùng, tuân thủ GDPR.
- **Quyền thương mại:** Người dùng giữ 100% bản quyền thương mại đối với âm thanh được tạo ra.
- **Hiệu năng:** Auto-scaling để phục vụ hàng nghìn yêu cầu render audio đồng thời.
- **Đa nền tảng:** Responsive trên web, định hướng phát triển ứng dụng iOS và Android.

