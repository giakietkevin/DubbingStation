---
title: DubbingStation
emoji: 🎙️
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
---

# DubbingStation 🎙️
> **All-in-One AI Voice Studio & Audio Toolkit** cho nhà sáng tạo nội dung, biên tập video, dịch thuật, giáo dục và doanh nghiệp.

🌐 **Trải nghiệm trực tuyến:** [https://dubbing-station.onrender.com/](https://dubbing-station.onrender.com/)  
📋 **Bảng đặc tả tính năng & Tiến độ:** Xem chi tiết tại [`Functions.md`](./Functions.md)

---

## 📑 Mục Lục
1. [Giới thiệu tổng quan](#-giới-thiệu-tổng-quan)
2. [Điểm nổi bật của nền tảng](#-điểm-nổi-bật-của-nền-tảng)
3. [Hướng dẫn sử dụng các tính năng chính](#-hướng-dẫn-sử-dụng-các-tính-năng-chính)
   - [3.1. Đăng ký & Kích hoạt 50.000 Credits miễn phí](#31-đăng-ký--kích-hoạt-50000-credits-miễn-phí)
   - [3.2. Studio Text-to-Speech (TTS)](#32-studio-text-to-speech-tts)
   - [3.3. Lồng tiếng video theo phụ đề (Video Dubbing)](#33-lồng-tiếng-video-theo-phụ-đề-video-dubbing)
   - [3.4. Dịch & Đóng phụ đề VietSub giữ 100% âm thanh gốc](#34-dịch--đóng-phụ-đề-vietsub-giữ-100-âm-thanh-gốc)
   - [3.5. Nhận diện giọng nói thành văn bản (Speech to Text - STT)](#35-nhận-diện-giọng-nói-thành-văn-bản-speech-to-text---stt)
   - [3.6. Dịch phụ đề tự động (Subtitle Translation)](#36-dịch-phụ-đề-tự-động-subtitle-translation)
   - [3.7. Nhân bản giọng nói độc quyền (Voice Cloning)](#37-nhân-bản-giọng-nói-độc-quyền-voice-cloning)
   - [3.8. Thư viện 3.000+ Giọng đọc (Voice Library)](#38-thư-viện-3000-giọng-đọc-voice-library)
   - [3.9. Trọn bộ 22 Công cụ Audio WebAssembly miễn phí](#39-trọn-bộ-22-công-cụ-audio-webassembly-miễn-phí)
4. [Hệ thống Unified Credits & Nâng cấp gói](#-hệ-thống-unified-credits--nâng-cấp-gói)
5. [Hướng dẫn cài đặt & Chạy trên máy cá nhân (Self-Hosting)](#-hướng-dẫn-cài-đặt--chạy-trên-máy-cá-nhân-self-hosting)
   - [Yêu cầu tiên quyết](#yêu-cầu-tiên-quyết)
   - [Cài đặt nhanh qua Node.js](#cài-đặt-nhanh-qua-nodejs)
   - [Cấu hình biến môi trường (.env)](#cấu-hình-biến-môi-trường-env)
   - [Chạy với Docker](#chạy-với-docker)
6. [Tăng tốc GPU Voice Worker với Google Colab (Miễn phí)](#-tăng-tốc-gpu-voice-worker-với-google-colab-miễn-phí)
7. [Hướng dẫn tích hợp REST API cho lập trình viên](#-hướng-dẫn-tích-hợp-rest-api-cho-lập-trình-viên)
8. [Cam kết đạo đức & Bản quyền thương mại](#-cam-kết-đạo-đức--bản-quyền-thương-mại)

---

## 🌟 Giới thiệu tổng quan

**DubbingStation** giải quyết trọn vẹn chuỗi sản xuất âm thanh và lồng tiếng video cho nhà sáng tạo nội dung: từ tạo giọng đọc kịch bản, phiên âm phụ đề, dịch ngôn ngữ, nhân bản giọng nói của chính bạn, đến lồng tiếng khớp mốc thời gian (timeline sync) và đóng phụ đề đè lên hardsub cũ mà không làm mất nhạc nền hay hiệu ứng video gốc.

---

## 🚀 Điểm nổi bật của nền tảng

- **Kiến trúc Multi-Provider TTS:** Tích hợp Microsoft Edge Neural TTS, OpenAI TTS-1-HD, Piper ONNX (mô hình VIVOS & 25H), CapCut ByteDance TTS và fallback đa tầng đảm bảo không bao giờ gián đoạn dịch vụ.
- **VietSub Video Chuyên Nghiệp:** Giữ 100% âm thanh gốc (`-c:a copy`), tự động che phụ đề cũ bằng hộp mờ (Opaque Box/Banner) và style chữ vàng điện ảnh chuẩn ASS.
- **Hệ thống Voice Cloning Hybrid 3 Tầng:**
  1. *Tầng 1:* Kết nối GPU Cloud Worker (Google Colab T4 / RunPod) qua FastAPI để chạy Coqui XTTS-v2 và VIVOS Piper.
  2. *Tầng 2:* Local Acoustic Timbre Transfer (phân tích F0, register, formant và EQ 10-band) chạy mượt mà ngay trên CPU máy chủ chỉ mất 0.4 giây.
  3. *Tầng 3:* Cascade fallback thông minh, bảo toàn nhịp điệu (tempo) bằng thuật toán bù trừ `asetrate` + `atempo`.
- **22 Công cụ Audio WASM:** Chạy 100% trên trình duyệt người dùng qua WebAssembly (FFmpeg.wasm & Web Audio API), hoàn toàn miễn phí, 0 tốn Credits và bảo mật dữ liệu tuyệt đối.
- **Thanh toán tự động:** Tích hợp chuyển khoản quét mã VietQR tự động xác nhận qua SePay Webhook và thanh toán quốc tế qua Stripe.

---

## 📖 Hướng dẫn sử dụng các tính năng chính

### 3.1. Đăng ký & Kích hoạt 50.000 Credits miễn phí

1. Truy cập `/register`, nhập Họ tên, Email và Mật khẩu (tối thiểu 6 ký tự).
2. Sau khi bấm **"Đăng ký ngay"**, hệ thống sẽ gửi mã xác thực gồm 6 chữ số qua email (hoặc hiển thị console nếu chưa cấu hình Gmail SMTP).
3. Nhập mã tại `/verify-otp` để kích hoạt tài khoản.
4. Ngay khi kích hoạt thành công, ví tài khoản của bạn được cấp ngay **50.000 Credits miễn phí** để trải nghiệm đầy đủ các tính năng.

---

### 3.2. Studio Text-to-Speech (TTS)
📍 **Đường dẫn:** `/dashboard`

1. **Nhập nội dung:** Nhập hoặc dán văn bản tiếng Việt có dấu chuẩn Unicode (hỗ trợ tới hàng nghìn ký tự tùy gói cước).
2. **Chèn thẻ ngữ điệu (Contextual Tags):**
   - Click nút `+ Nghỉ 0.5s` hoặc `+ Nghỉ 1.0s` để ngắt nhịp tự nhiên.
   - Click `+ Nhấn giọng` hoặc `+ Thì thầm` để thêm biểu cảm.
3. **Chọn giọng đọc:**
   - Bấm vào thanh chọn giọng để mở cửa sổ danh sách.
   - Lựa chọn theo vùng miền: Bắc (Minh Khang, Mai Phương), Nam (Thanh Thảo, Nam Minh), Trung, hoặc giọng quốc tế (Anh, Nhật, Hàn, Pháp).
   - Chọn giọng nhân bản độc quyền của chính bạn tại tab **"Giọng của tôi"**.
4. **Điều chỉnh thông số:**
   - Chọn sắc thái cảm xúc: *Tự nhiên*, *Truyền cảm*, *Hào hứng*, *Bản tin*.
   - Kéo thanh tốc độ từ `0.5x` đến `2.0x` (chuẩn tự nhiên là `1.0x`).
5. **Tạo và tải về:**
   - Bấm **"Tạo âm thanh ngay"**.
   - Nghe thử trực tiếp trên thanh phát có sóng âm (Waveform).
   - Bấm biểu tượng Tải về (Download) để nhận file MP3 chất lượng cao.

---

### 3.3. Lồng tiếng video theo phụ đề (Video Dubbing)
📍 **Đường dẫn:** `/dashboard/dubbing`

Dành cho nhu cầu thuyết minh phim, review video nước ngoài, bài giảng đa ngôn ngữ:

1. **Tải lên nguồn dữ liệu:**
   - Tải file video `.mp4`, `.mkv`, `.webm` HOẶC dán nội dung phụ đề `.srt`, `.vtt` vào khung soạn thảo.
   - Nếu video chưa có phụ đề, bạn có thể bấm **"Bóc thoại từ video"** bằng Whisper AI tích hợp.
2. **Dịch phụ đề (nếu là tiếng nước ngoài):**
   - Chọn ngôn ngữ đích là **Tiếng Việt**.
   - Bấm **"Dịch phụ đề tự động"** để chuyển ngữ mượt mà theo từng câu thoại.
3. **Phân vai & Gán giọng (Multi-speaker Assignment):**
   - Hệ thống tự động phân loại nhân vật (Speaker 1, Speaker 2,...).
   - Gán giọng đọc AI phù hợp cho từng nhân vật.
4. **Căn chỉnh thời lượng (Auto Time-Stretching):**
   - Hệ thống tự động tính toán thời lượng từng câu thoại, điều chỉnh tốc độ nói nhẹ nhàng để giọng AI khớp khít với khoảng thoại trong video gốc.
5. **Tách nhạc nền & Lồng tiếng:**
   - Tùy chỉnh âm lượng giọng AI và nhạc nền gốc.
   - Bấm **"Bắt đầu lồng tiếng"** và tải về video MP4 hoàn chỉnh.

---

### 3.4. Dịch & Đóng phụ đề VietSub giữ 100% âm thanh gốc
📍 **Đường dẫn:** `/dashboard/vietsub`

*Khác với Video Dubbing, VietSub Video giữ trọn vẹn toàn bộ giọng nói gốc, nhạc nền và âm thanh của video gốc:*

1. **Tải video lên:** Chọn video gốc có phụ đề tiếng nước ngoài (Trung, Hàn, Anh, Nhật...).
2. **Cung cấp phụ đề:** Tải file SRT/VTT có sẵn hoặc bấm nhận diện tự động từ âm thanh video.
3. **Chọn văn phong dịch tiếng Việt (Tone Polishing):**
   - *Đời thường / Thân mật:* mày - tao, cậu - tớ (hợp vlog, phim thanh xuân).
   - *Kịch tính / Hành động:* ngữ điệu mạnh mẽ, đối đầu gay cấn.
   - *Tình cảm / Lãng mạn:* anh - em ngọt ngào.
   - *Cổ trang / Kiếm hiệp:* xưng hô huynh - đệ, ngươi - ta chuẩn mực.
   - *Lịch sự / Công sở:* tôi - anh/chị.
4. **Cấu hình che phụ đề cũ (Hardsub Cover):**
   - Chọn kiểu che: **Hộp mờ (Opaque Box)** hoặc **Dải băng đáy (Full-width Banner)**.
   - Điều chỉnh độ mờ (opacity) từ 70% đến 100% để che sạch phụ đề gốc.
5. **Tùy chỉnh phụ đề mới:**
   - Chọn màu chữ: Vàng điện ảnh (Cinema Yellow), Trắng tinh khôi, Xanh ngọc Cyan, v.v.
   - Chọn cỡ chữ và vị trí hiển thị (Dưới đáy, Ở giữa hoặc Trên đỉnh).
6. **Xuất video:** Bấm **"Render Video VietSub"** để tạo video MP4 sắc nét với audio gốc được bảo toàn 100%.

---

### 3.5. Nhận diện giọng nói thành văn bản (Speech to Text - STT)
📍 **Đường dẫn:** `/dashboard/stt`

1. Tải lên tệp âm thanh (MP3, WAV, M4A, OGG) hoặc video (MP4, WebM).
2. Chọn ngôn ngữ nguồn (Tiếng Việt, Tiếng Anh, hoặc Tự động nhận diện).
3. Chọn model nhận dạng Whisper:
   - `tiny`: Siêu nhanh, nhẹ, phù hợp máy cấu hình vừa.
   - `base` / `small`: Độ chính xác cao hơn, dấu câu chuẩn xác.
4. Bấm **"Bắt đầu nhận diện"**: Quá trình diễn ra trực tiếp và hiển thị từng dòng kèm timestamp (bắt đầu - kết thúc).
5. Tải kết quả về dưới dạng tệp **SRT**, **VTT** hoặc sao chép văn bản thô **TXT**.

---

### 3.6. Dịch phụ đề tự động (Subtitle Translation)
📍 **Đường dẫn:** `/dashboard/translate`

1. Dán nội dung tệp SRT/VTT hoặc tải file từ máy tính.
2. Chọn ngôn ngữ nguồn và ngôn ngữ đích (hỗ trợ hơn 10 ngôn ngữ phổ biến).
3. Chọn phong cách bản dịch phù hợp.
4. Bấm **"Dịch phụ đề"**: Hệ thống bảo toàn 100% cấu trúc timestamp và số thứ tự cue, chỉ thay thế phần lời thoại.
5. Tải về file phụ đề đã dịch sẵn sàng sử dụng trong Premiere, CapCut, DaVinci Resolve hoặc VLC.

---

### 3.7. Nhân bản giọng nói độc quyền (Voice Cloning)
📍 **Đường dẫn:** `/dashboard/clone`

Tạo bản sao số hóa giọng nói của chính bạn chỉ với mẫu thu âm ngắn:

#### Bước 1: Chuẩn bị mẫu giọng
- Chọn **Instant Clone** (10 - 30 giây) hoặc **Professional Clone** (tải nhiều mẫu giọng ở nhiều cung bậc cảm xúc).
- Tải file âm thanh rõ tiếng, không lẫn tạp âm hoặc bấm **"Ghi âm microphone"** để đọc theo các câu mẫu có sẵn trên màn hình.

#### Bước 2: Phân tích âm học (Acoustic Profiling)
- Hệ thống tự động phân tích cao độ trung bình F0 (Hz), dải giọng (Bass/Baritone/Tenor/Alto/Soprano), độ ấm (warmth), độ sáng (brightness), các dải cộng hưởng Formant ($F_1, F_2, F_3, F_4$) và chiều dài thanh quản ước tính ($L\text{ cm}$).

#### Bước 3: Huấn luyện & Tạo giọng
- Đánh dấu đồng ý vào cam kết bản quyền và bấm **"Nhân bản giọng ngay"**.
- Hệ thống áp dụng công nghệ **Neural Acoustic Timbre Transfer** để ánh xạ âm sắc vào kho giọng nền tiếng Việt chuẩn nhất.

#### Bước 4: Thử giọng tại chỗ (Inline Synthesis Test)
- Tại danh sách giọng đã tạo, bấm nút **"Thử XTTS"**.
- Nhập một câu bất kỳ và bấm **"Đọc thử"** để nghe trực tiếp audio sinh ra từ mô hình.

#### Bước 5: Sử dụng trong Studio
- Bấm **"Dùng trong Studio"**: Giọng clone của bạn sẽ tự động xuất hiện tại Studio Console (`/dashboard`), sẵn sàng cho các bài đọc TTS và dự án lồng tiếng video.

---

### 3.8. Thư viện 3.000+ Giọng đọc (Voice Library)
📍 **Đường dẫn:** `/dashboard/voices`

- Tìm kiếm nhanh theo tên giọng đọc hoặc từ khóa phong cách (*trầm ấm, tin tức, kể chuyện, hoạt hình, quảng cáo*).
- Bộ lọc theo:
  - **Ngôn ngữ & Quốc gia:** Việt Nam, Mỹ, Anh, Nhật Bản, Hàn Quốc, Pháp, v.v.
  - **Giới tính:** Nam, Nữ.
  - **Vùng miền:** Giọng Hà Nội (Miền Bắc), Sài Gòn (Miền Nam), Đà Nẵng / Huế / Nghệ An (Miền Trung).
  - **Nhà cung cấp:** Edge Neural, Piper Human Dataset (VIVOS, 25Hours), OpenAI HD, CapCut.
- Bấm biểu tượng **Play** để nghe thử đoạn mẫu demo trước khi quyết định đưa vào dự án.

---

### 3.9. Trọn bộ 22 Công cụ Audio WebAssembly miễn phí
📍 **Đường dẫn:** `/dashboard/tools`

*Tất cả công cụ hoạt động trên máy khách (Client-Side) bằng WebAssembly/Web Audio API, không upload file lên máy chủ, không giới hạn số lần dùng và hoàn toàn 0 tốn Credits:*

| STT | Tên công cụ | Công dụng chính |
| :---: | :--- | :--- |
| 1 | **Cắt âm thanh (Audio Trim)** | Cắt lấy đoạn điệp khúc, nhạc chuông chuẩn xác tới 10ms. |
| 2 | **Tách lời hát (Vocal Remover)** | Tách riêng giọng hát và beat nhạc nền làm Karaoke. |
| 3 | **Tách 4-Stems nhạc cụ** | Phân tách 4 dải: Vocals, Trống (Drums), Bass, Nhạc cụ khác. |
| 4 | **Lọc ồn tạp âm (Noise Reducer)** | Khử tiếng quạt gió, tiếng rè micro và tiếng xe cộ. |
| 5 | **Khuếch đại âm lượng (Volume Booster)** | Tăng âm lượng lên tới 300% mà không bị vỡ hoặc méo tiếng. |
| 6 | **Thay đổi tốc độ (Speed Changer)** | Chỉnh tốc độ từ 0.25x đến 3.0x giữ nguyên cao độ (pitch). |
| 7 | **Xóa khoảng lặng (Silence Remover)** | Tự động quét và cắt các đoạn im lặng trong thu âm podcast. |
| 8 | **Đổi định dạng (Audio Converter)** | Chuyển đổi qua lại giữa MP3, WAV, AAC, FLAC, OGG, M4A, OPUS. |
| 9 | **Ghi âm trực tiếp (Voice Recorder)** | Thu âm chất lượng cao qua micro với sóng âm trực quan. |
| 10 | **Equalizer 5-băng tần (5-Band EQ)** | Tinh chỉnh Bass, Low-Mid, Mid, High-Mid, Treble như bàn mixer. |
| 11 | **Ghép nối âm thanh (Audio Joiner)** | Nối nhiều file thành 1 với hiệu ứng chuyển đổi mượt mà. |
| 12 | **Trích xuất audio từ video** | Tách luồng âm thanh nguyên bản từ MP4, MKV, WebM. |
| 13 | **Đảo ngược âm thanh (Reverse)** | Phát ngược âm thanh để tạo hiệu ứng âm thanh độc đáo. |
| 14 | **Thay đổi cao độ (Pitch Shifter)** | Nâng hoặc hạ tone giọng theo nửa cung (semitones). |
| 15 | **Hiệu ứng vang (Reverb & Echo)** | Thêm không gian phòng thu (Studio, Room, Hall, Cathedral). |
| 16 | **Biến đổi giọng (Voice Changer)** | Giả lập giọng Robot, Sóc chuột (Chipmunk), Quái vật, Loa phóng thanh. |
| 17 | **Nén tệp âm thanh (Compressor)** | Cân bằng dải động âm thanh và tối ưu kích thước file. |
| 18 | **Trình trộn đa âm (Audio Mixer)** | Trộn nhiều track nhạc nền, giọng đọc và hiệu ứng SFX. |
| 19 | **Tạo nhạc chuông (Ringtone Maker)** | Cắt nhanh và tạo hiệu ứng Fade In/Out cho iPhone/Android. |
| 20 | **Chuẩn hóa âm lượng (Normalizer)** | Cân bằng âm lượng chuẩn phát thanh quốc tế (EBU R128). |
| 21 | **Chỉnh sửa Metadata (ID3 Editor)** | Thêm tên bài hát, nghệ sĩ, album và ảnh bìa vào file nhạc. |
| 22 | **Tạo sóng âm video (Audiogram)** | Tạo video MP4 chứa sóng âm động phục vụ đăng TikTok/Shorts. |

---

## 💎 Hệ thống Unified Credits & Nâng cấp gói

Hệ thống sử dụng một đơn vị tín dụng thống nhất (**Unified Credits**) trừ trực tiếp theo khối lượng xử lý thực tế:

### Biểu phí tiêu thụ Credits

| Dịch vụ | Tỷ lệ tiêu thụ Credits |
| :--- | :--- |
| **TTS Giọng Tiêu Chuẩn** (Edge, Piper, CapCut, Google) | `1 Credit = 1 ký tự văn bản` |
| **TTS Giọng OpenAI HD** (`tts-1-hd`) | `3 Credits = 1 ký tự văn bản` |
| **Speech to Text (Whisper AI)** | `50 Credits / 1 giây audio` (~3.000 Credits / phút) |
| **Audio Dubbing** | `50 Credits / 1 giây audio` |
| **Video Dubbing & Subtitle Sync** | `100 Credits / 1 giây video` |
| **VietSub Video Giữ Audio Gốc** | Theo số giây video render |
| **Instant Voice Cloning** | `5.000 Credits / lần tạo giọng` |
| **22 Audio Tools (WASM)** | `0 Credit (100% Miễn phí)` |

### Danh sách gói cước (Subscription Tiers)

| Gói cước | Giá khuyến mãi (Tháng) | Credits hàng tháng | Số giọng Clone | Đặc quyền nổi bật |
| :--- | :---: | :---: | :---: | :--- |
| **Free** | **$0** | **50.000** (Tặng sẵn) | 0 | Trải nghiệm toàn diện, tối đa 3.000 ký tự/lần, 22 Audio Tools. |
| **Lite** | **$1.0** | **99.000** | 20 Clones | Mở khóa 3.000+ Voices, 50.000 ký tự/lần, ~33 phút Audio Dub. |
| **Starter** | **$4.5** | **999.000** | 100 Clones | ~1M ký tự (~20h audio), 100.000 ký tự/lần, Tốc độ ưu tiên. |
| **Growth** *(Khuyên dùng)* | **$9.5** | **2.499.000** | 500 Clones | 2.5M ký tự, ~416 phút Video Dub, Server cao cấp, Hỗ trợ video 4K. |
| **Pro** *(Studio)* | **$14.5** | **3.999.000** | 1.000 Clones | 4M ký tự (~80h), Toàn quyền API Access & Webhook, Hỗ trợ riêng. |

> Giảm thêm **30%** khi chọn chu kỳ thanh toán theo năm. Nhập mã `LAUNCH50` để giảm thêm 50% cho tháng đầu tiên.

### Phương thức thanh toán được hỗ trợ:
1. **Chuyển khoản ngân hàng tự động (VietQR):** Quét mã QR qua mọi ứng dụng ngân hàng tại Việt Nam (MB, Techcombank, Vietcombank, ACB...), tiền và credits được cộng tự động trong 5-30 giây qua SePay Webhook.
2. **Thẻ quốc tế (Visa/Mastercard/JCB):** Thanh toán an toàn qua cổng quốc tế Stripe.

---

## 🛠️ Hướng dẫn cài đặt & Chạy trên máy cá nhân (Self-Hosting)

### Yêu cầu tiên quyết
- **Node.js:** phiên bản `18.18+` hoặc `20.x` (khuyên dùng Node 20 LTS).
- **Trình quản lý gói:** `npm`, `yarn` hoặc `pnpm`.
- **FFmpeg:** Cần cài đặt FFmpeg trên máy chủ (nếu chạy trực tiếp ngoài Docker) để phục vụ ghép video, render VietSub và audio processing.
- **Python (Tùy chọn):** Python 3.10 – 3.12 nếu muốn chạy cục bộ mô hình Coqui XTTS hoặc Piper TTS.

---

### Cài đặt nhanh qua Node.js

```bash
# 1. Clone repository
git clone https://github.com/giakietkevin/DubbingStation.git
cd DubbingStation

# 2. Cài đặt các gói phụ thuộc
npm install

# 3. Tạo file cấu hình môi trường từ mẫu
cp .env.example .env

# 4. Khởi tạo cơ sở dữ liệu SQLite & sinh Prisma Client
npm run setup

# 5. Khởi chạy máy chủ phát triển
npm run dev
```

Mở trình duyệt truy cập: `http://localhost:3000`

---

### Cấu hình biến môi trường (.env)

Mở file `.env` và thiết lập các thông số:

```env
# ==========================================
# CƠ SỞ DỮ LIỆU & BẢO MẬT
# ==========================================
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="tao-mot-chuoi-ngau-nhien-that-dai-o-day"
NEXTAUTH_URL="http://localhost:3000"

# ==========================================
# ĐĂNG NHẬP GOOGLE OAUTH (TÙY CHỌN)
# ==========================================
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# ==========================================
# GMAIL SMTP GỬI MÃ XÁC THỰC OTP EMAIL
# (Tạo Mật khẩu ứng dụng / App Password trong tài khoản Google)
# ==========================================
SMTP_USER="email-cua-ban@gmail.com"
SMTP_PASS="mat-khau-ung-dung-16-ky-tu"
SMTP_FROM="DubbingStation AI <email-cua-ban@gmail.com>"

# ==========================================
# CỔNG THANH TOÁN VIETQR (SEPAY) & STRIPE
# ==========================================
PAYMENT_BANK_ID="MB"
PAYMENT_ACCOUNT_NO="0905884303"
PAYMENT_ACCOUNT_NAME="VO PHAM GIA KIET"
SEPAY_WEBHOOK_API_KEY="ma-api-sepay-cua-ban"

STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""

# ==========================================
# AI ENGINES & VOICE WORKER (TÙY CHỌN NÂNG CAO)
# ==========================================
OPENAI_API_KEY=""
HUGGINGFACE_API_KEY=""

# Địa chỉ GPU Voice Worker ngoài (Google Colab hoặc RunPod qua ngrok/cloudflare)
VOICE_WORKER_URL=""
# Hoặc URL XTTS FastAPI Server cục bộ
XTTS_API_URL=""
```

---

### Chạy với Docker

Dự án có sẵn `Dockerfile` đóng gói toàn bộ Next.js, FFmpeg và các thư viện liên quan:

```bash
# Build Docker Image
docker build -t dubbingstation .

# Khởi chạy Container
docker run -d \
  -p 7860:7860 \
  -v dubbingstation-data:/data \
  --name dubbingstation-app \
  dubbingstation
```

Truy cập tại: `http://localhost:7860`

---

## ⚡ Tăng tốc GPU Voice Worker với Google Colab (Miễn phí)

Để sử dụng mô hình **Coqui XTTS-v2** và **Piper VIVOS** trên card đồ họa GPU NVIDIA T4 hoàn toàn miễn phí mà không cần card rời trên máy tính:

1. Mở file `scripts/colab_hybrid_worker.ipynb` trong thư mục dự án và tải lên [Google Colab](https://colab.research.google.com/).
2. Chọn môi trường chạy: **Runtime → Change runtime type → T4 GPU**.
3. Điền mã token ngrok (miễn phí tại [ngrok.com](https://ngrok.com)) vào ô cấu hình.
4. Bấm **Runtime → Run all**.
5. Copy đường link ngrok công khai trả về (dạng `https://xxxx.ngrok-free.app`).
6. Dán vào biến `VOICE_WORKER_URL="https://xxxx.ngrok-free.app"` trong file `.env` của DubbingStation rồi khởi động lại ứng dụng.
7. Mở `/dashboard/clone`, bạn sẽ thấy trạng thái hiển thị: **`🟢 GPU Worker Online (NVIDIA T4 - CUDA)`**.

---

## 🔌 Hướng dẫn tích hợp REST API cho lập trình viên

DubbingStation cung cấp REST API cho phép tích hợp trực tiếp vào hệ sinh thái ứng dụng, bot tự động hoặc CMS của bạn.

### Tạo API Key
1. Đăng nhập và truy cập `/dashboard/settings`.
2. Tại mục **Quản lý API Key**, nhập tên ứng dụng và bấm **"Tạo Key Mới"**.
3. Sao chép token dạng `ds_live_xxxxxxxxxxxxxxxx`.

### Endpoint 1: Tạo giọng nói AI (Text to Speech)

```bash
curl -X POST "http://localhost:3000/api/v1/tts" \
  -H "Authorization: Bearer ds_live_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Xin chào! DubbingStation là nền tảng lồng tiếng AI hàng đầu.",
    "voice": "vi-VN-NamMinhNeural",
    "speed": 1.0,
    "format": "mp3"
  }' \
  --output speech.mp3
```

### Endpoint 2: Nhận diện giọng nói (Speech to Text)

```bash
curl -X POST "http://localhost:3000/api/v1/stt" \
  -H "Authorization: Bearer ds_live_YOUR_API_KEY" \
  -F "file=@/duong/dan/audio.mp3" \
  -F "language=vi"
```

### Endpoint 3: Lồng tiếng phụ đề video (Dubbing)

```bash
curl -X POST "http://localhost:3000/api/v1/dubbing" \
  -H "Authorization: Bearer ds_live_YOUR_API_KEY" \
  -F "video=@/duong/dan/video.mp4" \
  -F "subtitles=@/duong/dan/subtitle.srt" \
  -F "targetLanguage=vi"
```

Xem tài liệu tương tác chi tiết tại: `/docs`

---

## 🛡️ Cam kết đạo đức & Bản quyền thương mại

- **Quyền sở hữu thương mại 100%:** Mọi tệp âm thanh và video được tạo ra trên DubbingStation thuộc quyền sở hữu hoàn toàn của bạn. Bạn được phép bật kiếm tiền trên YouTube, TikTok, Facebook, sử dụng trong phim ảnh hoặc quảng cáo thương mại.
- **Bảo vệ quyền giọng nói cá nhân:** Người dùng chỉ được phép nhân bản giọng nói của chính mình hoặc của người đã đồng ý bằng văn bản. Nghiêm cấm hành vi giả mạo giọng nói chính khách, người nổi tiếng hoặc cá nhân khác nhằm mục đích lừa đảo, giả mạo danh tính hoặc phát tán thông tin sai lệch.
- **Bảo mật dữ liệu:** File âm thanh mẫu của bạn được bảo mật tuyệt đối trong phân vùng riêng và không bao giờ được chia sẻ ra bên thứ ba khi chưa có sự cho phép.

---

## 📞 Hỗ trợ & Đóng góp

- **Tác giả:** Võ Phạm Gia Kiệt
- **Email hỗ trợ:** support@dubbingstation.com
- **Báo lỗi & Đề xuất tính năng:** Tạo Issue tại GitHub Repository.

---
*DubbingStation AI Studio — Nâng tầm trải nghiệm giọng nói và sáng tạo nội dung số.*
