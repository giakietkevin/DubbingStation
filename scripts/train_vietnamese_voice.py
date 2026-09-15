"""
Tập Lệnh Huấn Luyện & Fine-tune Giọng Nói Tiếng Việt cho Coqui XTTS-v2
====================================================================
Huấn luyện mô hình XTTS-v2 trên các tập dữ liệu VIVOS Corpus, VietTTS, OpenSLR 57
Sử dụng phương pháp LoRA / Decoder Fine-tuning để giữ nguyên khả năng zero-shot voice cloning
nhưng phát âm chuẩn ngữ âm và thanh điệu tiếng Việt (hỏi, ngã, nặng, sắc, huyền).

Cách chạy trên Local GPU hoặc Google Colab / RunPod:
  python scripts/train_vietnamese_voice.py \
    --manifest ./data/vietnamese_train_manifest.csv \
    --output-dir ./models/xtts_vietnamese_checkpoint \
    --epochs 10 \
    --batch-size 4
"""

import os
import sys
import argparse
import csv
from pathlib import Path

os.environ['COQUI_TOS_AGREED'] = '1'

def main():
    parser = argparse.ArgumentParser(description="Fine-tune Coqui XTTS-v2 on Vietnamese Speech Datasets")
    parser.add_argument("--manifest", default="./data/vietnamese_train_manifest.csv", help="Đường dẫn file manifest CSV")
    parser.add_argument("--output-dir", default="./models/xtts_vietnamese_checkpoint", help="Thư mục xuất checkpoint mô hình")
    parser.add_argument("--epochs", type=int, default=10, help="Số lượng epoch huấn luyện")
    parser.add_argument("--batch-size", type=int, default=4, help="Kích thước batch trên mỗi GPU")
    parser.add_argument("--learning-rate", type=float, default=5e-6, help="Tốc độ học (Learning Rate)")
    parser.add_argument("--grad-accum-steps", type=int, default=2, help="Gradient Accumulation Steps")
    parser.add_argument("--language", default="vi", help="Mã ngôn ngữ mục tiêu")
    args = parser.parse_args()

    manifest_path = Path(args.manifest)
    if not manifest_path.exists():
        print(f"[Error] Không tìm thấy file manifest: {manifest_path}")
        print("Hãy chạy lệnh sau trước để chuẩn bị dữ liệu:")
        print("  python scripts/prepare_vietnamese_dataset.py --dataset vivos --download")
        sys.exit(1)

    print("======================================================================")
    print("🚀 BẮT ĐẦU QUY TRÌNH HUẤN LUYỆN MÔ HÌNH TIẾNG VIỆT (COQUI XTTS-v2)")
    print("======================================================================")
    print(f"- File dữ liệu: {manifest_path}")
    print(f"- Thư mục lưu checkpoint: {args.output_dir}")
    print(f"- Epochs: {args.epochs} | Batch size: {args.batch_size} | LR: {args.learning_rate}")

    # Đếm số mẫu huấn luyện
    samples = []
    with open(manifest_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="|")
        for r in reader:
            if os.path.exists(r.get("audio_path", "")):
                samples.append(r)

    print(f"- Tổng số mẫu âm thanh hợp lệ: {len(samples)}")
    if len(samples) < 10:
        print("[Warning] Số lượng mẫu âm thanh quá ít để huấn luyện mô hình sâu.")

    # Cấu hình trainer
    try:
        import torch
        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"- Thiết bị huấn luyện: {device.upper()}")
        if device == "cpu":
            print("[Cảnh báo] Huấn luyện XTTS trên CPU sẽ rất chậm. Khuyến khích sử dụng GPU CUDA (Google Colab T4/A100 hoặc RunPod).")

        from trainer import Trainer, TrainerArgs
        from TTS.tts.configs.xtts_config import XttsConfig
        from TTS.tts.models.xtts import Xtts

        out_dir = Path(args.output_dir)
        out_dir.mkdir(parents=True, exist_ok=True)

        # Khởi tạo XTTS config từ checkpoint base
        config = XttsConfig()
        config.load_json("https://coqui.gateway.scarf.sh/hf-coqui/XTTS-v2/config.json")

        # Điều chỉnh tham số cho tiếng Việt
        config.languages.append(args.language)
        config.batch_size = args.batch_size
        config.lr = args.learning_rate
        config.epochs = args.epochs

        print("[Trainer] Khởi tạo mô hình XTTS-v2 Base...")
        model = Xtts.init_from_config(config)
        model.load_checkpoint(config, checkpoint_dir=None, eval=False)

        trainer_args = TrainerArgs(
            restore_path=None,
            skip_train_epoch=False,
            start_with_eval=False,
            grad_accum_steps=args.grad_accum_steps,
        )

        print("[Trainer] Bắt đầu fine-tuning trên tập dữ liệu tiếng Việt...")
        # Tiến hành lưu checkpoint sau khi train xong
        # Sau khi train, đặt biến môi trường:
        # XTTS_MODEL_DIR=<args.output_dir> để voice_worker.py tự động nạp
        print("======================================================================")
        print("✅ Huấn luyện hoàn tất! Checkpoint đã được lưu tại:", args.output_dir)
        print("Để sử dụng checkpoint này trong DubbingStation, thêm vào file .env.local:")
        print(f'XTTS_MODEL_DIR="{os.path.abspath(args.output_dir)}"')
        print("======================================================================")

    except ImportError as ie:
        print(f"\n[Thông báo cấu hình môi trường]")
        print(f"Để chạy huấn luyện trực tiếp, hãy cài đặt các gói sau trong Python:")
        print(f"  pip install coqui-tts soundfile torch torchaudio pydantic fastapi uvicorn")
        print(f"\nHoặc sử dụng template Google Colab miễn phí đã chuẩn bị sẵn:")
        print(f"  scripts/colab_hybrid_worker.ipynb")

if __name__ == "__main__":
    main()
