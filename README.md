# DubbingStation

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

- Next.js (React) và TailwindCSS.
- Web Audio API / WebAssembly cho các thao tác cắt và chỉnh sửa audio nhẹ ngay trên client, giảm tải cho server.

### Backend

- Node.js / Python (FastAPI) để quản lý luồng dữ liệu, thanh toán và xử lý file.

### AI Model Integration

- Tích hợp các nhà cung cấp TTS như ElevenLabs, Microsoft Azure Speech và OpenAI Voice API.
- Kết hợp mô hình tự host như Coqui TTS và Whisper cho STT nhằm tối ưu chi phí.
- Audio caching cho các đoạn giọng đọc phổ biến để giảm chi phí gọi API.

### Cloud và Storage

- AWS S3 hoặc Cloudflare R2 để lưu trữ file âm thanh.
- Redis cho hàng đợi công việc rendering.
- CDN để phân phối và phát audio với tốc độ cao.

## Yêu cầu phi chức năng

- **Bảo mật:** Mã hóa dữ liệu người dùng, tuân thủ GDPR.
- **Quyền thương mại:** Người dùng giữ 100% bản quyền thương mại đối với âm thanh được tạo ra.
- **Hiệu năng:** Auto-scaling để phục vụ hàng nghìn yêu cầu render audio đồng thời.
- **Đa nền tảng:** Responsive trên web, định hướng phát triển ứng dụng iOS và Android.

## Lộ trình phát triển

### Giai đoạn 1: MVP, tháng 1-3

- Ra mắt Text-to-Speech cốt lõi với 10+ ngôn ngữ chính.
- Tích hợp đăng ký/đăng nhập, quản lý Credits và thanh toán qua Stripe/PayPal.
- Phát hành 10 công cụ xử lý audio cơ bản chạy trên client.

### Giai đoạn 2: Mở rộng, tháng 4-6

- Bổ sung Subtitle-to-Audio cho file SRT và video.
- Mở rộng lên 3.000+ giọng đọc và Custom Voice Cloning.
- Hoàn thiện đầy đủ 22 Free Audio Tools.

### Giai đoạn 3: Tăng trưởng, từ tháng 7 trở đi

- Cung cấp Public API cho doanh nghiệp.
- Phát triển ứng dụng DubbingStation trên iOS và Android.
