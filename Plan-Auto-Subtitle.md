# Kế Hoạch Triển Khai Tính Năng Auto-Detect Video & Subtitle (Hoàn toàn Miễn Phí & Chạy Local)

## Ngữ Cảnh & Mục Tiêu
- **Mục tiêu**: Tải lên video, tự động bóc tách âm thanh, chuyển đổi âm thanh thành văn bản (STT), xuất ra file phụ đề `.srt` / `.vtt`, và hiển thị preview video kèm phụ đề chạy trực tiếp trên web.
- **Yêu cầu cốt lõi**:
  - Không tốn chi phí (Không dùng API trả phí như OpenAI, Google STT, v.v.).
  - Xử lý hoàn toàn tại máy tính cá nhân (local/client-side) vì máy tính cấu hình mạnh.
  - Đóng gói vào một thư mục/file component duy nhất để dễ dàng import và tái sử dụng ở bất kỳ đâu.
  - Không xoá hay thay đổi tuỳ tiện logic, style hiện tại của dự án.

## Công Nghệ Đề Xuất
1. **Trích xuất âm thanh từ Video (Client-side)**
   - Sử dụng **FFmpeg WebAssembly (`@ffmpeg/ffmpeg`)**: Cho phép chạy FFmpeg ngay trên trình duyệt để convert `.mp4`, `.mov` sang `.wav`/`.mp3` vô cùng nhanh chóng bằng sức mạnh của máy người dùng.
2. **Nhận diện giọng nói (STT Client-side)**
   - Sử dụng **`@huggingface/transformers` (Transformers.js)**: Chạy model Whisper (ví dụ: `Xenova/whisper-tiny` hoặc `Xenova/whisper-small`) ngay trên trình duyệt (hỗ trợ WebGPU / WebGL / WASM). Máy tính mạnh sẽ xử lý rất mượt mà.
3. **Hiển thị & Render phụ đề**
   - Sử dụng thẻ `<video>` HTML5 kết hợp với thẻ `<track>` cho file `.vtt` để text tự động chạy đè lên video.

## Chi Tiết Triển Khai (Các bước)

**Bước 1: Tạo cấu trúc thư mục Component `VideoSubtitler`**
Sẽ tạo một thư mục mới tại: `src/components/VideoSubtitler/` bao gồm:
- `index.tsx`: File component chính để bọc và render UI.
- `useAudioExtractor.ts`: Hook chịu trách nhiệm load FFmpeg.wasm và trích xuất audio.
- `useWhisperTranscriber.ts`: Hook chịu trách nhiệm load mô hình Whisper bằng transformers.js để bóc băng (STT).
- `utils.ts`: Chứa logic convert từ kết quả STT sang định dạng chuẩn `.vtt` và `.srt` (hiện tại `src/lib/whisper.ts` đã có hàm này, ta có thể import hoặc clone riêng biệt để độc lập).

**Bước 2: Cài đặt thư viện (Chỉ thực hiện nếu user đồng ý)**
Sẽ cần cài 2 package mạnh mẽ cho client:
```bash
npm install @ffmpeg/ffmpeg @ffmpeg/util @huggingface/transformers
```

**Bước 3: Code Logic Xử Lý**
1. **Load Video**: User chọn file video, component tạo Object URL và đưa vào thẻ `<video>`.
2. **Extract Audio**: Chạy lệnh FFmpeg wasm: `ffmpeg -i input.mp4 -vn -acodec libmp3lame output.mp3` (hoặc `.wav`).
3. **Transcribe**: Đưa file audio qua pipeline `automatic-speech-recognition` của Transformers.js. Lấy mảng chunks (segments) kèm timestamp (start, end, text).
4. **Generate VTT/SRT**: Tạo chuỗi định dạng `.vtt` từ segments, tạo URL Blob và gắn vào thuộc tính `src` của thẻ `<track default>` bên trong `<video>`.
5. Tích hợp nút Download phụ đề (Sử dụng lại hàm `exportToSRT`, `exportToVTT` nếu cần).

**Bước 4: Kiểm tra & Tích hợp**
- Tích hợp thử component `<VideoSubtitler />` vào một trang (ví dụ `src/app/dashboard/tools/page.tsx` hoặc tạo trang mới) để test.
- Đảm bảo giữ nguyên các tính năng đang có của dự án.

## Xác nhận từ User
Plan này đáp ứng đúng tiêu chí: Dùng 1 Component duy nhất, chạy 100% Free / Local trên máy (Browser) của người dùng, không gọi server, không tốn credit. Vui lòng cho phép để tiếp tục tiến hành code.