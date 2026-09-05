# BẢNG TỔNG HỢP TÍNH NĂNG CHI TIẾT (FUNCTIONS SPECIFICATION)
## DỰ ÁN: DUBBINGSTATION - ALL-IN-ONE AI VOICE STUDIO

---

## MỤC LỤC
1. [Tổng Quan Hệ Thống & Phân Hệ Chức Năng](#1-tổng-quan-hệ-thống--phân-hệ-chức-năng)
2. [Module 1: Header, Navigation & Quản Lý Trạng Thái Người Dùng](#2-module-1-header-navigation--quản-lý-trạng-thái-người-dùng)
3. [Module 2: Promo Rail & Marketing Banner Conversion](#3-module-2-promo-rail--marketing-banner-conversion)
4. [Module 3: Hero & Interactive Studio Demo Console (Trung Tâm Điều Khiển Giọng Nói)](#4-module-3-hero--interactive-studio-demo-console)
5. [Module 4: 4 Phân Hệ Công Nghệ AI Cốt Lõi (Core AI Services)](#5-module-4-4-phân-hệ-công-nghệ-ai-cốt-lõi)
   - [4.1. Text to Speech (TTS)](#41-text-to-speech-tts)
   - [4.2. Subtitle Video Dubbing (Lồng Tiếng Video Tự Động Khớp Frame)](#42-subtitle-video-dubbing)
   - [4.3. Speech to Text (STT - Whisper AI Engine)](#43-speech-to-text-stt)
   - [4.4. Custom Voice Cloning (Nhân Bản Giọng Nói Độc Bản)](#44-custom-voice-cloning)
6. [Module 5: Thư Viện Giọng Đọc Toàn Cầu (Voices Library - 3.000+ Voices)](#6-module-5-thư-viện-giọng-đọc-toàn-cầu)
7. [Module 6: Trọn Bộ 22 Công Cụ Xử Lý Âm Thanh Miễn Phí (WASM Audio Suite)](#7-module-6-trọn-bộ-22-công-cụ-xử-lý-âm-thanh-miễn-phí)
8. [Module 7: Hệ Thống Unified Credits & Bảng Giá (Pricing & Credit Engine)](#8-module-7-hệ-thống-unified-credits--bảng-giá)
9. [Module 8: Trợ Giúp, FAQ Accordion & Trung Tâm Hỗ Trợ](#9-module-8-trợ-giúp-faq-accordion--trung-tâm-hỗ-trợ)
10. [Module 9: Footer, Điều Khoản Pháp Lý & Trạng Thái Hệ Thống](#10-module-9-footer-điều-khoản-pháp-lý--trạng-thái-hệ-thống)
11. [Module 10: Quản Trị Hệ Thống & Developer API / Webhook](#11-module-10-quản-trị-hệ-thống--developer-api--webhook)

---

## 1. TỔNG QUAN HỆ THỐNG & PHÂN HỆ CHỨC NĂNG

DubbingStation là nền tảng điện toán giọng nói AI toàn diện (All-in-One AI Voice Studio), kết hợp:
- **Server-side AI Processing**: Các mô hình Deep Learning (Neural TTS, Whisper STT, Zero-Shot/Few-Shot Voice Cloning, Video-Audio Subtitle Alignment).
- **Client-side WebAssembly Processing**: Bộ 22 công cụ xử lý tệp âm thanh trực tiếp trong trình duyệt không tốn tài nguyên server và đảm bảo tính riêng tư 100%.
- **Unified Credit Economy**: 1 đơn vị tiền tệ credit thống nhất cho toàn bộ hệ sinh thái dịch vụ.

---

## 2. MODULE 1: HEADER, NAVIGATION & QUẢN LÝ TRẠNG THÁI NGƯỜI DÙNG

| Mã Tính Năng | Tên Tính Năng | Mô Tả Chi Tiết | Đầu Vào (Input) / Tương Tác | Đầu Ra (Output) / Phản Hồi |
| :--- | :--- | :--- | :--- | :--- |
| **NAV-01** | Logo & Home Redirect | Nhận diện thương hiệu DubbingStation với hiệu ứng hover mượt mà. | Click chuột / Tap | Điều hướng về trang chủ (`/` hoặc `#ai-voice-studio`). |
| **NAV-02** | Menu Dropdown: AI Voice Studio | Menu phân nhánh xổ xuống (Hover/Click) với hiệu ứng Glassmorphism, chứa 4 dịch vụ cốt lõi: TTS, Subtitle Dubbing, STT, Voice Cloning. | Hover / Tap vào "AI Voice Studio" | Hiển thị menu nổi với icon xoay 180°, dẫn tới từng phân trang chức năng. |
| **NAV-03** | Menu Link: 22 Free Audio Tools | Truy cập nhanh khu vực công cụ âm thanh Client-side. | Click vào link | Cuộn/chuyển tới danh mục 22 công cụ WASM kèm nhãn "100% Free". |
| **NAV-04** | Menu Link: Voices Library | Thư viện 3.000+ giọng đọc với nhãn hiển thị số lượng "3,000+". | Click vào link | Mở trang tra cứu, nghe thử và lọc giọng đọc. |
| **NAV-05** | Menu Link: Pricing & Credits | Xem biểu phí các gói cước và bảng quy đổi tín dụng. | Click vào link | Cuộn mượt (smooth scroll) tới `#pricing-section` hoặc trang checkout. |
| **NAV-06** | Menu Link: API & Docs | Dành cho lập trình viên tích hợp SDK & REST API. | Click vào link | Chuyển tới trang tài liệu kỹ thuật API. |
| **NAV-07** | Live Credit Balance Badge | Widget hiển thị số dư Credit khả dụng theo thời gian thực (real-time balance) kèm hiệu ứng chấm sáng xanh nhấp nháy (`animate-pulse`). | Dữ liệu session user từ backend | Hiển thị chính xác số Credits (ví dụ: `50,000 Credits Free`). |
| **NAV-08** | Chuyển Đổi Ngôn Ngữ (VI/EN) | Switcher 2 ngôn ngữ giao diện tiếng Việt và tiếng Anh. | Click nút "VI" hoặc "EN" | Chuyển đổi toàn bộ text giao diện (i18n Localization) tức thì. |
| **NAV-09** | CTA "Nâng cấp Pro" Header | Nút kêu gọi hành động với gradient Cyan - Violet phát sáng. | Click nút | Mở Modal Checkout hoặc chuyển đến bảng giá gói cước. |
| **NAV-10** | User Profile & Quick Menu | Ảnh đại diện người dùng với viền Cyan glow, tích hợp menu tài khoản (Profile, Lịch sử tệp, Cài đặt, Đăng xuất). | Click vào Avatar | Xổ menu quản lý tài khoản cá nhân. |

---

## 3. MODULE 2: PROMO RAIL & MARKETING BANNER CONVERSION

| Mã Tính Năng | Tên Tính Năng | Mô Tả Chi Tiết | Logic & Tương Tác |
| :--- | :--- | :--- | :--- |
| **PRM-01** | Top Announcement Rail | Thanh thông báo ưu đãi ra mắt (Launch Offer) gắn cố định dưới header. | Chứa dot cảnh báo động (`animate-ping`), mã khuyến mãi `LAUNCH50` (giảm 50%), nút dẫn "Xem biểu phí & Nhận ưu đãi". |
| **PRM-02** | Quick Copy Promo Code | Cho phép người dùng bấm vào thẻ mã `LAUNCH50` để sao chép nhanh vào clipboard. | Tự động copy `LAUNCH50` + hiển thị tooltip "Đã sao chép!". |
| **PRM-03** | Converting CTA Banner (Cuối Trang) | Banner chuyển đổi định dạng Glow Gradient kích thích tạo tài khoản trải nghiệm 50.000 credits. | Chứa 2 nút CTA: "Tạo Giọng Nói Ngay Miễn Phí" và "Xem Các Gói Ưu Đãi" kèm huy hiệu bảo mật: Không cần thẻ tín dụng & Chuẩn mã hóa. |

---

## 4. MODULE 3: HERO & INTERACTIVE STUDIO DEMO CONSOLE

Bảng điều khiển trung tâm (Studio Demo Console) lấy cảm hứng từ Yupvox, cho phép người dùng thao tác trực tiếp trên giao diện:

| Mã Tính Năng | Tên Tính Năng | Mô Tả Chi Tiết & Hành Vi Giao Diện |
| :--- | :--- | :--- |
| **STU-01** | Mode Switcher Tabs | Bộ chuyển đổi 4 chế độ làm việc: **Text to Voice**, **Subtitle to Video**, **Audio to Text**, **Clone Voice**. Cập nhật trạng thái active tab nổi bật bằng nền xanh ngọc `border-active-cyan`. |
| **STU-02** | Engine Status Indicators | Huy hiệu hiển thị trạng thái động cơ AI: `Whisper & Neural V3 Ready` (chấm xanh Online) và `3,000+ VOICES`. |
| **STU-03** | Textarea Source Input | Khung nhập liệu văn bản thông minh (hỗ trợ nhập liệu tiếng Việt có dấu chuẩn Unicode, tối đa 5.000 ký tự ở bản demo). |
| **STU-04** | Live Character & Credit Calculator | Bộ đếm ký tự và ước lượng chi phí Credits theo thời gian thực (1 ký tự = 1 credit). Tự động format dạng số Việt Nam (`174 / 5.000 ký tự`). |
| **STU-05** | Contextual SSML Helper Tags | Các nút chèn nhanh thẻ ngữ điệu vào vị trí con trỏ chuột trong văn bản:<br>• `+ Nghỉ 0.5s` chèn `[pause 0.5s]`<br>• `+ Nghỉ 1.0s` chèn `[pause 1.0s]`<br>• `+ Nhấn giọng` chèn `[nhấn_mạnh]`<br>• `+ Thì thầm` chèn `[thì_thầm]` |
| **STU-06** | Active Voice Selector Modal Opener | Nút pill hiển thị giọng đọc hiện tại (Avatar chữ tắt, tên giọng ví dụ: *Minh Khang*, tag xuất xứ *VIỆT NAM*, phong cách *Tự nhiên • Trầm ấm*). Bấm để mở Voice Selection Modal. |
| **STU-07** | Emotion Presets Selector | Bộ lọc sắc thái cảm xúc tức thì: *Tự nhiên (Natural)*, *Truyền cảm (Expressive)*, *Hào hứng (Excited)*, *Bản tin (News)*. |
| **STU-08** | Speed Slider & Dial | Thanh trượt tùy biến tốc độ đọc từ `0.5x` đến `2.0x` (bước nhảy `0.1x`). Hiển thị giá trị tức thời trên màn hình (`speed-val`). |
| **STU-09** | Voice Generation Trigger | Nút bấm "Tạo âm thanh ngay (Generate Voice)" với micro-interaction xoay vòng loading (`animate-spin`) và hiệu ứng rung sáng ring player khi hoàn thành. |
| **STU-10** | Integrated Audio Player Deck | Trình phát âm thanh tích hợp: Nút Play/Pause chuyển trạng thái icon, bộ đếm thời gian thực `00:00 / 00:14`, nhãn chất lượng chuẩn `24kHz Neural`. |
| **STU-11** | Interactive Waveform Visualizer | Thanh trực quan hóa sóng âm thanh (SVG dynamic audio waveform bars) chuyển động đồng bộ theo tiến độ phát âm thanh. |
| **STU-12** | Export & Cloud Actions | Cụm nút tác vụ nhanh: Tải tệp MP3 (`download`), Lưu trữ đám mây (`cloud_sync`), Sao chép liên kết chia sẻ (`share`). |

---

## 5. MODULE 4: 4 PHÂN HỆ CÔNG NGHỆ AI CỐT LÕI

### 4.1. Text to Speech (TTS)
- **Mã:** `CORE-TTS`
- **Mô tả:** Chuyển đổi văn bản thành giọng nói chuẩn phòng thu.
- **Tính năng chi tiết:**
  1. Hỗ trợ hơn 3.000 giọng đọc trên 100 ngôn ngữ, tối ưu đặc biệt cho tiếng Việt 3 miền Bắc - Trung - Nam.
  2. Khả năng phân tích ngữ pháp, ngắt nghỉ theo dấu câu tự nhiên, hỗ trợ thẻ điều khiển SSML / Pause tags.
  3. Đa dạng biểu cảm cảm xúc (Vui vẻ, trang nghiêm, giận dữ, hồi hộp, thì thầm, thuyết minh).
  4. Hỗ trợ render định dạng tệp đa dạng: MP3, WAV (lossless 48kHz), AAC.
  5. Xử lý đoạn văn bản dài lên đến 100.000 ký tự trên các gói cước nâng cao.

### 4.2. Subtitle Video Dubbing (Lồng Tiếng Video & Khớp Subtitle)
- **Mã:** `CORE-DUB`
- **Mô tả:** Tự động hóa quy trình lồng tiếng cho video dựa trên phụ đề và dòng thời gian (timeline).
- **Tính năng chi tiết:**
  1. Tải lên tệp phụ đề tiêu chuẩn: `.srt`, `.vtt`, `.ass`.
  2. Tự động gán giọng đọc khác nhau cho từng nhân vật / vai diễn (Multi-speaker Diarization).
  3. Căn chỉnh thời lượng giọng nói AI vừa khít với khoảng trống thời gian trong video gốc (Auto Time-Stretching & Pitch Matching).
  4. Hỗ trợ tách âm thanh nền (BGM) và nhạc hiệu, chỉ đè giọng nói AI lên lời thoại cũ.
  5. Xuất video chất lượng cao lên đến độ phân giải 4K (Ultra HD).

### 4.3. Speech to Text (STT - Whisper AI Engine)
- **Mã:** `CORE-STT`
- **Mô tả:** Nhận dạng và chuyển đổi âm thanh/video thành văn bản chính xác 99.2%.
- **Tính năng chi tiết:**
  1. Nhận diện giọng nói đa ngôn ngữ, tự động phát hiện ngôn ngữ nguồn.
  2. Tự động chèn dấu câu chuẩn xác, phân đoạn câu theo ngữ cảnh tự nhiên.
  3. Phân biệt người nói (Speaker Identification: Speaker 1, Speaker 2,...).
  4. Xuất tệp phụ đề định dạng `.srt`, `.vtt`, `.txt`, `.docx` có gắn kèm timestamp chính xác đến từng mili-giây.

### 4.4. Custom Voice Cloning (Nhân Bản Giọng Nói Độc Bản)
- **Mã:** `CORE-CLONE`
- **Mô tả:** Tái tạo mô hình giọng đọc cá nhân từ mẫu âm thanh ngắn.
- **Tính năng chi tiết:**
  1. Instant Voice Clone: Chỉ yêu cầu 10 - 30 giây mẫu thu âm giọng nói rõ ràng.
  2. Professional Voice Clone: Huấn luyện mô hình sâu từ 5 - 30 phút audio chất lượng cao.
  3. Bảo toàn âm sắc (timbre), cao độ, phong cách biểu đạt đặc trưng của chủ thể.
  4. Quản lý kho giọng cá nhân trong mục "My Custom Voices" với tính năng bảo mật phân quyền.

---

## 6. MODULE 5: THƯ VIỆN GIỌNG ĐỌC TOÀN CẦU (VOICES LIBRARY)

| Mã Tính Năng | Tên Tính Năng | Mô Tả Chi Tiết |
| :--- | :--- | :--- |
| **LIB-01** | Voice Explorer & Search | Tìm kiếm giọng đọc theo tên, từ khóa hoặc phong cách (Ví dụ: "Minh Khang", "Kể chuyện", "Tin tức"). |
| **LIB-02** | Multi-Factor Filter Engine | Bộ lọc đa chiều: Theo Ngôn ngữ (Việt, Anh, Nhật, v.v.), Vùng miền (Bắc, Trung, Nam), Giới tính (Nam, Nữ, Trẻ em), Độ tuổi (Trẻ, Trung niên, Lão niên), Mục đích sử dụng (Podcast, Audiobook, Review phim, Quảng cáo e-Learning). |
| **LIB-03** | Instant Sample Player | Nghe thử đoạn mẫu (audio sample preview) của từng giọng trước khi chọn sử dụng. |
| **LIB-04** | Favorite & Custom Tags | Đánh dấu yêu thích (Bookmark), tạo bộ sưu tập giọng đọc riêng cho từng dự án. |

---

## 7. MODULE 6: TRỌN BỘ 22 CÔNG CỤ XỬ LÝ ÂM THANH MIỄN PHÍ (WASM AUDIO SUITE)

*Toàn bộ 22 công cụ chạy 100% Client-Side trên trình duyệt bằng WebAssembly (FFmpeg.wasm / Web Audio API), không trừ Credit, bảo mật tuyệt đối:*

| STT | Mã Tool | Tên Công Cụ | Chức Năng Chính |
| :---: | :--- | :--- | :--- |
| 1 | `TOOL-01` | **Cắt Âm Thanh (Audio Trim)** | Cắt bỏ đoạn thừa, lấy đoạn nhạc chuông hoặc trích đoạn với độ chuẩn xác từng 10ms. |
| 2 | `TOOL-02` | **Tách Lời Hát (Vocal Remover)** | Tách riêng vocal và beat nhạc nền (instrumental) chất lượng cao để làm Karaoke. |
| 3 | `TOOL-03` | **Tách 4-Stems Nhạc Cụ** | Phân tách tệp bài hát thành 4 track độc lập: Vocals, Trống (Drums), Bass, Nhạc cụ khác. |
| 4 | `TOOL-04` | **Lọc Ồn Tạp Âm (Noise Reducer)** | Khử tiếng quạt, gió rít, tiếng xe cộ và tiếng rè microphone tự động. |
| 5 | `TOOL-05` | **Khuếch Đại Âm Lượng (Volume Booster)** | Tăng âm lượng tệp âm thanh lên tới 300% (3x) mà không làm vỡ hoặc méo tiếng. |
| 6 | `TOOL-06` | **Thay Đổi Tốc Độ (Speed Changer)** | Thay đổi tốc độ phát từ `0.25x` đến `3.0x` mà vẫn giữ nguyên cao độ giọng nói (Pitch preserved). |
| 7 | `TOOL-07` | **Xóa Khoảng Lặng (Silence Remover)** | Tự động quét và cắt bỏ các đoạn im lặng ngắt quãng trong các tệp thu âm/podcast. |
| 8 | `TOOL-08` | **Đổi Định Dạng (Audio Converter)** | Chuyển đổi qua lại giữa MP3, WAV, AAC, FLAC, OGG, M4A, OPUS với bitrate tùy chỉnh. |
| 9 | `TOOL-09` | **Ghi Âm Mic Trực Tiếp (Voice Recorder)** | Ghi âm giọng nói qua Microphone chất lượng cao, hiển thị sóng âm trực quan và tải về tức thì. |
| 10 | `TOOL-10` | **Equalizer 5-Băng Tần (5-Band EQ)** | Tinh chỉnh các dải tần số Low, Low-Mid, Mid, High-Mid, High trực quan như bàn mixer. |
| 11 | `TOOL-11` | **Ghép Nối Âm Thanh (Audio Joiner)** | Ghép nhiều tệp âm thanh thành một tệp duy nhất với hiệu ứng chuyển đổi mượt mà (Crossfade). |
| 12 | `TOOL-12` | **Trích Xuất Audio Từ Video (Audio Extractor)** | Tách luồng âm thanh gốc từ các tệp MP4, MKV, AVI, WebM mà không làm suy giảm chất lượng. |
| 13 | `TOOL-13` | **Đảo Ngược Âm Thanh (Reverse Audio)** | Phát ngược âm thanh để tạo các hiệu ứng âm thanh độc đáo cho video sáng tạo. |
| 14 | `TOOL-14` | **Thay Đổi Cao Độ (Pitch Shifter)** | Nâng cao hoặc hạ thấp tông giọng (semitones) mà không làm thay đổi tốc độ bài hát. |
| 15 | `TOOL-15` | **Hiệu Ứng Vang / Không Gian (Reverb & Echo)** | Thêm hiệu ứng vang vọng phòng thu (Studio, Hall, Cathedral, Room). |
| 16 | `TOOL-16` | **Hiệu Ứng Biến Đổi Giọng (Voice Changer)** | Giả lập các loại giọng đặc biệt: Robot, Sóc chuột (Chipmunk), Giọng Quái vật, Loa phóng thanh. |
| 17 | `TOOL-17` | **Nén Tệp Âm Thanh (Audio Compressor)** | Tối ưu dung lượng tệp âm thanh (giảm size đến 80%) để dễ dàng chia sẻ hoặc gửi email. |
| 18 | `TOOL-18` | **Trình Trộn Đa Âm (Audio Mixer)** | Trộn nhạc nền, hiệu ứng âm thanh (SFX) và giọng đọc trên nhiều track với âm lượng riêng. |
| 19 | `TOOL-19` | **Tạo Nhạc Chuông Điện Thoại (Ringtone Maker)** | Cắt nhanh, thêm hiệu ứng Fade In / Fade Out và xuất file định dạng tương thích iOS/Android. |
| 20 | `TOOL-20` | **Chuẩn Hóa Âm Lượng (Audio Normalizer)** | Tự động cân bằng mức âm lượng theo chuẩn phát thanh quốc tế (EBU R128 / LUFS standard). |
| 21 | `TOOL-21` | **Chỉnh Sửa Metadata (ID3 Tag Editor)** | Thêm/sửa thông tin Tác giả, Tiêu đề bài hát, Album, Năm phát hành, Ảnh bìa Album (Cover Art). |
| 22 | `TOOL-22` | **Tạo Sóng Âm Video (Audiogram Generator)** | Tạo video MP4 chứa sóng âm chuyển động và ảnh đại diện phục vụ đăng tải TikTok, YouTube Shorts. |

---

## 8. MODULE 7: HỆ THỐNG UNIFIED CREDITS & BẢNG GIÁ

### 8.1. Quy Tắc Tiêu Thụ Credits (Unified Consumption Engine)
Hệ thống sử dụng một quỹ credits thống nhất cho toàn bộ các dịch vụ:
- **Text to Speech (TTS):** `1 ký tự = 1 Credit`.
- **Audio Dubbing:** `50 Credits / 1 giây` (tương đương `3.000 Credits / 1 phút`).
- **Video Dubbing & Subtitle Sync:** `100 Credits / 1 giây` (tương đương `6.000 Credits / 1 phút`).
- **Speech to Text (STT):** `30 Credits / 1 giây` (tương đương `1.800 Credits / 1 phút`).
- **22 Audio Tools (Client-Side WASM):** `0 Credit (100% Free)`.

### 8.2. Danh Sách Gói Cước (5 Subscription Tiers)

| Gói Cước | Giá Khuyến Mãi (Tháng) | Giá Gốc | Hạn Mức Credits / Tháng | Số Giọng Clone | Tính Năng Nổi Bật |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Free** | **$0** | $0 | 50.000 (Tặng 1 lần) | 0 | 300+ Giọng tiêu chuẩn, tối đa 3.000 ký tự/lần, 22 Audio Tools. |
| **Lite** | **$1.0** | $2.0 | 99.000 Credits/tháng | 20 Clones | Mở khóa 3.000+ Voices, 50.000 ký tự/yêu cầu, ~33 phút Audio Dub. |
| **Starter** | **$4.5** | $9.0 | 999.000 Credits/tháng | 100 Clones | ~1M ký tự (~20h audio), 100.000 ký tự/yêu cầu, Tốc độ ưu tiên cao. |
| **Growth (Khuyên dùng)** | **$9.5** | $19.0 | 2.499.000 Credits/tháng | 500 Clones | 2.5M ký tự, ~833 phút Audio Dub, ~416 phút Video Dub, Server cao cấp. |
| **Pro (Studio)** | **$14.5** | $29.0 | 3.999.000 Credits/tháng | 1.000 Clones | 4M ký tự (~80h), Toàn quyền API Access & Webhook, Hỗ trợ 1-on-1. |

### 8.3. Tính Năng Quản Lý Thanh Toán & Khuyến Mãi
- **PRC-01:** Chuyển đổi chu kỳ thanh toán Hàng Tháng / Hàng Năm (Chiết khấu 30% khi thanh toán theo năm).
- **PRC-02:** Nhập mã giảm giá khuyến mãi (Ví dụ: `LAUNCH50` giảm 50% tháng đầu).
- **PRC-03:** Cổng thanh toán đa kênh: Thẻ tín dụng/ghi nợ quốc tế (Stripe), Chuyển khoản ngân hàng Việt Nam (VietQR), Ví điện tử (Momo/VNPay/PayPal).
- **PRC-04:** Tự động gia hạn hoặc hủy đăng ký bất cứ lúc nào không ràng buộc.

---

## 9. MODULE 8: TRỢ GIÚP, FAQ ACCORDION & TRUNG TÂM HỖ TRỢ

| Mã Tính Năng | Tên Tính Năng | Chi Tiết |
| :--- | :--- | :--- |
| **FAQ-01** | Accordion Tương Tác | Danh sách câu hỏi/trả lời có thể mở rộng/thu gọn mượt mà kèm xoay icon chỉ báo. |
| **FAQ-02** | Giải Đáp Bản Quyền Thương Mại | Xác nhận 100% quyền sở hữu tệp âm thanh, được phép bật kiếm tiền YouTube/TikTok, chạy quảng cáo và thương mại hóa. |
| **FAQ-03** | Giải Đáp Chính Sách Free Credits | Xác minh nhận 50.000 credits ngay khi đăng ký mà không cần nhập thẻ ngân hàng. |
| **FAQ-04** | Hướng Dẫn Cơ Chế Voice Cloning | Giải thích quy trình tải mẫu 10-30s và bảo mật âm sắc của người dùng. |
| **FAQ-05** | Chính Sách Dung Lượng & Bảo Mật WASM | Khẳng định không giới hạn dung lượng tệp tải lên đối với bộ công cụ xử lý trên máy khách (WASM). |

---

## 10. MODULE 9: FOOTER, ĐIỀU KHOẢN PHÁP LÝ & TRẠNG THÁI HỆ THỐNG

- **FT-01: Bản Quyền Thương Hiệu**: Thông tin sở hữu trí tuệ DubbingStation AI Studio.
- **FT-02: Phân Loại Liên Kết Sản Phẩm / Tài Nguyên / Công Ty**: Chuyển hướng nhanh đến các trang chuyên biệt.
- **FT-03: Chính Sách Pháp Lý**: Điều khoản dịch vụ (`/terms-of-service`), Chính sách quyền riêng tư (`/privacy-policy`), Chính sách hoàn tiền (`/refund-policy`).
- **FT-04: System Status Badge**: Hiển thị trạng thái hoạt động của hệ thống thời gian thực (`Operational 99.99%`).

---

## 11. MODULE 10: QUẢN TRỊ HỆ THỐNG & DEVELOPER API / WEBHOOK

- **API-01: REST API Gateway**: Endpoint cho phép các hệ thống bên thứ ba tạo audio TTS, upload SRT dubbing tự động.
- **API-02: Webhook Notifications**: Gửi thông báo JSON khi tiến trình render video/audio dung lượng lớn hoàn tất.
- **API-03: API Key Management**: Tạo, xóa và theo dõi mức độ tiêu thụ Credits qua API Token.
- **ADM-01: Admin Dashboard**: Quản lý người dùng, thống kê doanh thu, giám sát tài nguyên máy chủ AI Inference GPU và quản lý kho giọng đọc.

---
*Tài liệu này là cơ sở kỹ thuật đối chiếu chính xác cho các giai đoạn thiết kế và lập trình trong `Processes.prd`.*
