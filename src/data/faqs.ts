import type { FaqItem } from '@/types';

export const faqs: FaqItem[] = [
  {
    id: 'faq-commercial-rights',
    question: 'Tôi có quyền thương mại hóa (kiếm tiền YouTube, TikTok, quảng cáo) không?',
    answer: 'HOÀN TOÀN CÓ. Toàn bộ các file âm thanh và video bạn tạo trên DubbingStation đều thuộc 100% sở hữu bản quyền của bạn. Bạn được phép bật kiếm tiền trên YouTube, phân phối bài học trực tuyến, chạy quảng cáo Facebook/TikTok mà không lo bị vi phạm bản quyền.',
  },
  {
    id: 'faq-free-credits',
    question: '50.000 Credits miễn phí khi đăng ký có thực sự miễn phí không?',
    answer: 'Chính xác! Ngay khi hoàn tất đăng ký tài khoản mới bằng Email hoặc Google, tài khoản của bạn sẽ được nạp sẵn 50.000 Credits. Không yêu cầu liên kết thẻ tín dụng, không tự động gia hạn.',
  },
  {
    id: 'faq-voice-cloning',
    question: 'Tính năng nhân bản giọng đọc (Voice Cloning) hoạt động như thế nào?',
    answer: 'Bạn chỉ cần tải lên một mẫu giọng nói rõ ràng của chính mình dài từ 10 đến 30 giây (hoặc sử dụng công cụ ghi âm trực tiếp của chúng tôi). Neural Voice Engine sẽ phân tích đặc tính âm sắc, cao độ và lưu trữ thành mô hình riêng chỉ trong vài chục giây.',
  },
  {
    id: 'faq-wasm-limit',
    question: 'Bộ 22 Audio Tools có giới hạn dung lượng tệp không?',
    answer: 'Vì 22 công cụ xử lý hoàn toàn trên phần cứng của bạn bằng công nghệ WebAssembly, không có giới hạn ngặt nghèo về dung lượng tệp gửi lên máy chủ. Bạn có thể cắt ghép, khuếch đại âm thanh và tách giọng mà không phải đợi tải file lên mạng.',
  },
];
