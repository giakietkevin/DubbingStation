# DubbingStation — AI Voice Studio & Video Dubbing Platform

> **Nền tảng phòng thu AI All-in-One:** Chuyển đổi văn bản thành giọng nói (Text-to-Speech), lồng tiếng video theo phụ đề tự động (Subtitle Video Dubbing), nhân bản giọng nói (Voice Cloning) và 22 công cụ xử lý âm thanh WebAssembly trực tiếp trên trình duyệt.

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-SQLite-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

---

## 📋 Mục Lục

1. [Tính Năng Nổi Bật](#-tính-năng-nổi-bật)
2. [Yêu Cầu Hệ Thống](#-yêu-cầu-hệ-thống)
3. [Hướng Dẫn Cài Đặt & Chạy Dự Án (Quick Start)](#-hướng-dẫn-cài-đặt--chạy-dự-án-quick-start)
4. [Cấu Hình Biến Môi Trường (.env)](#-cấu-hình-biến-môi-trường-env)
5. [Hướng Dẫn Sử Dụng](#-hướng-dẫn-sử-dụng)
6. [Cấu Hình Gửi Real OTP Qua Gmail SMTP](#-cấu-hình-gửi-real-otp-qua-gmail-smtp)
7. [Hệ Thống Tài Khoản & Phân Quyền](#-hệ-thống-tài-khoản--phân-quyền)
8. [Cơ Chế Trừ Số Dư Credits (Unified Balance)](#-cơ-chế-trừ-số-dư-credits-unified-balance)
9. [Triển Khai Production](#-triển-khai-production)
10. [Cấu Trúc Thư Mục Dự Án](#-cấu-trúc-thư-mục-dự-án)
11. [Công Nghệ Sử Dụng (Tech Stack)](#-công-nghệ-sử-dụng-tech-stack)

---

## ✨ Tính Năng Nổi Bật

* 🎙️ **Text to Speech (TTS) Studio:** Hỗ trợ đa dạng provider (Microsoft Neural, OpenAI HD, Piper Local Free, Chị Google Viral) với tùy chỉnh tốc độ (0.5x - 2.0x), cảm xúc, cao độ (Pitch), cường độ (Volume) và thẻ ngắt nghỉ SSML.
* 🎬 **Video Dubbing & Subtitle Auto-Sync:** Tải lên video MP4 hoặc phụ đề SRT/VTT để hệ thống tự động nhận diện khung thời gian (cues) và lồng tiếng ăn khớp từng giây.
* 🧬 **Voice Cloning & DSP Timbre:** Tải lên từ 1 đến 10 file âm thanh mẫu để trích xuất F0, Formant F1/F2 và áp dụng bộ lọc âm thanh kỹ thuật số (DSP Biquad Filters, Chest Warmth, Clarity).
* 🛠️ **22 WebAssembly Audio Tools (Miễn phí 100%):** Cắt audio, tăng âm lượng (Volume Booster lên 300%), đổi tốc độ, đảo ngược âm thanh, tách nhạc... xử lý 100% bằng Web Audio API ngay trên trình duyệt, không tốn Credits.
* 🔐 **Xác Thực OTP Kích Hoạt Tài Khoản:** Đăng ký nhận ngay 50.000 Credits, gửi mã OTP 6 số bảo mật về hộp thư Gmail thật qua SMTP Nodemailer.
* 👑 **Trang Quản Trị Hệ Thống (/admin):** Dành riêng cho tài khoản Admin duy nhất quản lý người dùng, xem danh sách mã OTP realtime, nạp/trừ credits, phân quyền và giám sát KPI.

---

## 💻 Yêu Cầu Hệ Thống

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt:

* **Node.js:** Phiên bản `>= 18.17.0` (Khuyên dùng Node.js 20 LTS)
* **Trình quản lý gói:** `npm` (đi kèm Node.js), `yarn` hoặc `pnpm`
* **Git:** Để clone mã nguồn từ kho lưu trữ

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án (Quick Start)

### Bước 1: Clone kho mã nguồn về máy

```bash
git clone https://github.com/giakietkevin/DubbingStation.git
cd DubbingStation
```

### Bước 2: Cài đặt các thư viện phụ thuộc (Dependencies)

```bash
npm install
```

### Bước 3: Thiết lập tệp môi trường `.env`

Tạo `.env` từ tệp mẫu có sẵn tại thư mục gốc dự án.

```bash
# macOS / Linux / Git Bash
cp .env.example .env
```

Trên Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Giữ nguyên giá trị mặc định để chạy local. Các biến bắt buộc và tùy chọn được giải thích ở phần [Cấu Hình Biến Môi Trường](#-cấu-hình-biến-môi-trường-env).

### Bước 4: Khởi tạo Prisma và CSDL SQLite

Chạy một lệnh duy nhất để sinh Prisma Client và đồng bộ schema:

```bash
npm run setup
```

Lệnh này tạo file `prisma/dev.db` nếu chưa có. Có thể mở giao diện xem dữ liệu bằng:

```bash
npx prisma studio
```

Prisma Studio chạy tại `http://localhost:5555`.

### Bước 5: Khởi động Server phát triển (Development)

```bash
npm run dev
```

Mở trình duyệt và truy cập: **[http://localhost:3000](http://localhost:3000)**

Để dừng server, nhấn `Ctrl+C` trong terminal.

---

## ⚙️ Cấu Hình Biến Môi Trường (.env)

Tệp `.env.example` trong repo đã có sẵn mẫu cấu hình. Sao chép thành `.env`, sau đó thay các giá trị cần thiết:

```env
# Kết nối CSDL SQLite cục bộ
DATABASE_URL="file:./dev.db"

# Khóa bí mật NextAuth & URL ứng dụng
NEXTAUTH_SECRET="thay-bang-chuoi-ngau-nhien-dai"
NEXTAUTH_URL="http://localhost:3000"

# OAuth Providers (Tùy chọn nếu muốn đăng nhập bằng Google)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Cấu hình gửi Real OTP kích hoạt tài khoản qua Gmail SMTP
SMTP_USER="dia-chi-gmail-cua-ban@gmail.com"
SMTP_PASS="xxxx xxxx xxxx xxxx"
SMTP_FROM="DubbingStation AI <dia-chi-gmail-cua-ban@gmail.com>"

# Tùy chọn: dùng OpenAI cho dịch phụ đề và OpenAI TTS
OPENAI_API_KEY=""
```

`DATABASE_URL`, `NEXTAUTH_SECRET` và `NEXTAUTH_URL` nên luôn được cấu hình. `GOOGLE_*`, `SMTP_*` và `OPENAI_API_KEY` là tùy chọn; để trống vẫn chạy được các chức năng local không phụ thuộc chúng. Không commit `.env` hoặc API key vào Git.

---

## 🎬 Hướng Dẫn Sử Dụng

### 1. Đăng ký và đăng nhập

1. Mở `/register`, nhập tên, email và mật khẩu.
2. Nhập OTP tại `/verify-otp`. Khi chưa cấu hình SMTP, mã OTP được hiển thị ở chế độ development và in trong terminal.
3. Đăng nhập tại `/login`. Tài khoản mới được tặng 50.000 Credits sau khi kích hoạt.

### 2. Tạo giọng nói từ văn bản (TTS)

1. Vào Dashboard và chọn **Text to Speech**.
2. Nhập hoặc dán nội dung, chọn ngôn ngữ và giọng đọc.
3. Điều chỉnh tốc độ, cao độ, âm lượng hoặc SSML nếu cần.
4. Bấm tạo audio, nghe thử rồi tải file kết quả.

### 3. Lồng tiếng video và phụ đề

1. Vào **Dubbing**, tải video và tệp `.srt` hoặc `.vtt`.
2. Kiểm tra các đoạn phụ đề, chọn giọng đọc và cấu hình tốc độ.
3. Chạy lồng tiếng, theo dõi tiến trình và tải video kết quả.

### 4. Dịch phụ đề, chuyển giọng nói thành văn bản và công cụ audio

* **Translate:** tải phụ đề, chọn ngôn ngữ nguồn/đích rồi xuất tệp đã dịch. Có `OPENAI_API_KEY` sẽ ưu tiên OpenAI; nếu không, hệ thống dùng Google Translate endpoint.
* **STT:** tải audio/video để nhận transcript và xuất phụ đề.
* **Tools:** dùng các công cụ xử lý audio tại trình duyệt; dữ liệu được xử lý bằng Web Audio/WebAssembly và không trừ Credits.
* **Voice Clone:** tải mẫu giọng sạch, đặt tên voice, sau đó chọn voice này trong các màn hình tạo audio hỗ trợ custom voice.

### 5. Quản lý tài khoản và dự án

Dashboard hiển thị số dư Credits, lịch sử dự án và các voice đã tạo. Các file đầu vào nên có âm thanh rõ, phụ đề đúng timestamp và không vượt giới hạn hiển thị trên từng màn hình.

---

## 📧 Cấu Hình Gửi Real OTP Qua Gmail SMTP

Hệ thống hỗ trợ gửi mã xác thực 6 số thật trực tiếp đến hòm thư Gmail của người dùng. Để kích hoạt:

1. Đăng nhập vào tài khoản Google: [myaccount.google.com/security](https://myaccount.google.com/security)
2. Bật tính năng **Xác minh 2 bước (2-Step Verification)**.
3. Truy cập vào mục **Mật khẩu ứng dụng (App Passwords)**: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
4. Nhập tên ứng dụng: `DubbingStation` -> Bấm **Tạo (Create)**.
5. Google sẽ cấp mã gồm 16 chữ cái (Ví dụ: `uejy imxc dsge dmvi`).
6. Dán thông tin vào tệp `.env`:
   * `SMTP_USER`: Điền địa chỉ Gmail của bạn.
   * `SMTP_PASS`: Điền 16 ký tự mật khẩu ứng dụng vừa tạo.
7. Khởi động lại server (`npm run dev`).

> 💡 **Lưu ý:** Nếu chưa điền `SMTP_USER` và `SMTP_PASS`, hệ thống sẽ tự động chuyển sang chế độ **Dev/Test**, hiển thị mã OTP ngay trên màn hình và log ra Terminal để bạn thuận tiện kiểm thử.

---

## 👥 Hệ Thống Tài Khoản & Phân Quyền

### 1. Tài khoản Người dùng (User)
* **Đăng ký:** Truy cập `/register` -> Điền thông tin.
* **Kích hoạt OTP:** Hệ thống gửi mã OTP 6 số -> Nhập tại `/verify-otp`.
* **Khuyến mãi:** Tự động nhận **50.000 Credits** vào ví CSDL ngay sau khi kích hoạt thành công.
* **Đăng nhập:** Truy cập `/login` (Hệ thống sẽ chặn nếu tài khoản chưa kích hoạt OTP).

### 2. Tài khoản Quản trị viên (Super Admin)
Hệ thống được cấu hình duy nhất **1 tài khoản Admin** có toàn quyền quản trị CSDL:

* **Tài khoản / Email:** `admin` *(hoặc `admin@dubbingstation.com`)*
* **Mật khẩu:** `Giakiet@123`
* **Số dư Credits:** 9.999.999 Credits (Vô hạn)
* **Trang Quản trị:** **[http://localhost:3000/admin](http://localhost:3000/admin)**
  * Xem thống kê tổng quan (Tổng user, số user chờ OTP, tổng credits lưu hành, số dự án).
  * Giám sát danh sách mã OTP đang có hiệu lực trong CSDL realtime.
  * Nạp hoặc khấu trừ Credits cho bất kỳ người dùng nào (ghi lịch sử giao dịch).
  * Kích hoạt thủ công hoặc tạo mã OTP mới cho người dùng.
  * Phân quyền (`FREE_USER`, `PAID_USER`, `API_DEVELOPER`).
  * Xóa tài khoản người dùng khỏi CSDL.

---

## 💰 Cơ Chế Trừ Số Dư Credits (Unified Balance)

Hệ thống quản lý Credits tập trung thông qua bảng `CreditWallet` & `CreditTransaction`:

| Thao tác | Mức tiêu tốn Credits | Ghi chú |
| :--- | :--- | :--- |
| **Đăng ký mới** | `+50.000 Credits` | Tặng miễn phí trải nghiệm |
| **Text to Speech (TTS)** | `1 Credit / 1 ký tự` | Provider Microsoft, Piper, Google (tối thiểu 10 cr) |
| **OpenAI TTS HD** | `3 Credits / 1 ký tự` | Chất lượng chuẩn phòng thu quốc tế |
| **Batch TTS (>5.000 ký tự)** | `1 Credit / 1 ký tự` | Trừ gộp 1 lần duy nhất cho toàn bộ batch |
| **Video Dubbing** | `100 Credits / 1 giây video` | Tương đương 6.000 Credits / phút video |
| **22 Audio Tools (WASM)** | `0 Credit (Miễn phí 100%)` | Xử lý trực tiếp trên RAM máy khách |

---

## 🚢 Triển Khai Production

Trên máy chủ production, cấu hình `.env` với:

* `NEXTAUTH_URL` là URL public thật, ví dụ `https://app.example.com`.
* `NEXTAUTH_SECRET` là chuỗi ngẫu nhiên dài, khác với môi trường local.
* `DATABASE_URL` trỏ tới database được lưu trữ bền vững. SQLite phù hợp cho cài đặt đơn máy; không dùng volume tạm thời.
* `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` nếu cần gửi OTP thật.
* `OPENAI_API_KEY` nếu cần OpenAI TTS hoặc ưu tiên OpenAI khi dịch.

Sau khi cài dependencies và sao chép `.env`, chạy:

```bash
npm run setup
npm run build
npm run start
```

Mặc định production server chạy tại `http://localhost:3000`. Dùng reverse proxy (Nginx, Caddy hoặc nền tảng hosting) để bật HTTPS và public domain. Không expose Prisma Studio trên Internet.

### Xử lý lỗi thường gặp

* **`EPERM ... query_engine-windows.dll.node` trên Windows:** đóng các terminal đang chạy `next dev`, `prisma studio` hoặc Node khác, rồi chạy lại `npm run setup`.
* **Không nhận được OTP:** kiểm tra `SMTP_USER` và `SMTP_PASS`; Gmail yêu cầu bật 2-Step Verification và dùng App Password.
* **Không đăng nhập Google được:** kiểm tra callback URL trong Google Cloud Console là `http://localhost:3000/api/auth/callback/google` (hoặc domain production tương ứng).
* **Không tạo được audio:** kiểm tra Credits, định dạng file đầu vào và log terminal của server.
* **Build lỗi do biến môi trường:** kiểm tra `.env` nằm ở thư mục gốc dự án và khởi động lại lệnh build.

> ⚠️ Tài khoản admin mặc định là `admin` hoặc `admin@dubbingstation.com` với mật khẩu `Giakiet@123`. Đây là thông tin được mã hóa cố định trong code hiện tại; hãy giới hạn quyền truy cập hoặc thay đổi cơ chế xác thực trước khi triển khai Internet công khai.

---

## 📁 Cấu Trúc Thư Mục Dự Án

```text
DubbingStation/
├── prisma/
│   ├── schema.prisma          # Định nghĩa Database Models (User, Wallet, Transaction, Projects)
│   └── dev.db                 # CSDL SQLite cục bộ
├── src/
│   ├── app/
│   │   ├── admin/             # Trang Quản trị Admin (/admin)
│   │   ├── api/
│   │   │   ├── admin/users/   # API CRUD & điều chỉnh Credits quản trị
│   │   │   ├── auth/          # API register, send-otp, verify-otp, next-auth
│   │   │   ├── tts/           # API generate, stream, batch TTS
│   │   │   ├── dubbing/       # API video dubbing
│   │   │   └── user/credits/  # API đồng bộ Credits realtime
│   │   ├── dashboard/         # Khu vực phòng thu Studio, Dubbing, Clone, Tools
│   │   ├── login/             # Trang Đăng nhập
│   │   ├── register/          # Trang Đăng ký
│   │   └── verify-otp/        # Trang Xác thực kích hoạt OTP
│   ├── components/            # UI components (Header, Footer, StudioConsole, VoiceModal...)
│   ├── data/                  # Dữ liệu giọng đọc, dịch vụ, bảng giá
│   ├── lib/
│   │   ├── auth.ts            # Cấu hình NextAuth & phân quyền Admin
│   │   ├── email.ts           # Dịch vụ gửi Gmail SMTP HTML bằng Nodemailer
│   │   ├── otp.ts             # Thuật toán sinh & kiểm tra OTP với SQLite
│   │   ├── prisma.ts          # Kết nối Prisma Client Singleton
│   │   ├── webAudio.ts        # Thuật toán xử lý âm thanh Web Audio API
│   │   └── tts/               # DSP Timbre Morphing & TTS Synthesis
│   └── types/                 # TypeScript interface definitions
├── .env                       # Biến môi trường
├── package.json
└── README.md
```

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

* **Giao diện (Frontend):** Next.js 14 (App Router), React 18, Tailwind CSS, Material Symbols.
* **Xác thực & Bảo mật (Auth):** NextAuth.js (JWT Strategy), Bcryptjs, Gmail SMTP (Nodemailer).
* **Cơ sở dữ liệu (Database):** Prisma ORM, SQLite (`dev.db`).
* **Âm thanh & AI (Audio & DSP):**
  * `edge-tts-universal` (Microsoft Neural TTS)
  * `wavefile` (16-bit PCM RIFF WAV Parser & Header Generator)
  * Web Audio API & WebAssembly (Cắt, ghép, khuếch đại âm lượng, đảo chiều sóng)
  * Biquad Direct Form II Transposed Formant Filter (F1/F2, Chest Resonance, Presence Filter)

---

## 📄 Bản Quyền & Tác Giả

* **Tác giả:** Võ Phạm Gia Kiệt
* **Bản quyền:** © 2026 DubbingStation AI Studio. Mọi quyền được bảo lưu.
* Giấy phép thương mại 100% cho âm thanh được tạo ra trên nền tảng.
