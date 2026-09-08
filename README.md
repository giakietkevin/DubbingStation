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
5. [Cấu Hình Gửi Real OTP Qua Gmail SMTP](#-cấu-hình-gửi-real-otp-qua-gmail-smtp)
6. [Hệ Thống Tài Khoản & Phân Quyền](#-hệ-thống-tài-khoản--phân-quyền)
7. [Cơ Chế Trừ Số Dư Credits (Unified Balance)](#-cơ-chế-trừ-số-dư-credits-unified-balance)
8. [Cấu Trúc Thư Mục Dự Án](#-cấu-trúc-thư-mục-dự-án)
9. [Công Nghệ Sử Dụng (Tech Stack)](#-công-nghệ-sử-dụng-tech-stack)

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

Sao chép hoặc tạo tệp `.env` tại thư mục gốc của dự án:

```bash
cp .env.example .env
```
*(Nếu chưa có `.env.example`, bạn hãy tạo tệp `.env` theo hướng dẫn ở phần bên dưới).*

### Bước 4: Khởi tạo CSDL SQLite với Prisma

Chạy lệnh để sinh mã Prisma Client và đồng bộ cấu trúc database SQLite:

```bash
npx prisma db push
```

*(Tùy chọn: Bạn có thể chạy `npx prisma studio` để mở giao diện quản lý dữ liệu CSDL trực quan trên trình duyệt tại cổng 5555).*

### Bước 5: Khởi động Server phát triển (Development)

```bash
npm run dev
```

Mở trình duyệt và truy cập: **[http://localhost:3000](http://localhost:3000)**

---

## ⚙️ Cấu Hình Biến Môi Trường (.env)

Tạo tệp `.env` tại thư mục gốc với nội dung mẫu sau:

```env
# Kết nối CSDL SQLite cục bộ
DATABASE_URL="file:./dev.db"

# Khóa bí mật NextAuth & URL ứng dụng
NEXTAUTH_SECRET="dubbingstation-super-secret-key-32chars-min-length-2026"
NEXTAUTH_URL="http://localhost:3000"

# OAuth Providers (Tùy chọn nếu muốn đăng nhập bằng Google)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Cấu hình gửi Real OTP kích hoạt tài khoản qua Gmail SMTP
SMTP_USER="dia-chi-gmail-cua-ban@gmail.com"
SMTP_PASS="xxxx xxxx xxxx xxxx"
SMTP_FROM="DubbingStation AI <dia-chi-gmail-cua-ban@gmail.com>"
```

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
