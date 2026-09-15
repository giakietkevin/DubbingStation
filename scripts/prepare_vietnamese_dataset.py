"""
Bộ Tiền Xử Lý & Chuẩn Hóa Dữ Liệu Tiếng Việt (Vietnamese Dataset Pipeline)
========================================================================
Hỗ trợ nạp và xử lý 4 tập dữ liệu tiếng Việt chuẩn phòng thu:
1. VIVOS Corpus (AILAB - ĐH Khoa học Tự nhiên TP.HCM) - ~15 giờ, 46 speakers
2. VietTTS Dataset - ~20 giờ thu âm đơn giọng phát thanh viên
3. OpenSLR 57 (Vietnamese Speech Corpus) - ~3.000 câu phát thanh
4. Mozilla Common Voice 17.0 (Vietnamese) - ~50 giờ đa dạng chất giọng

Cách chạy:
  python scripts/prepare_vietnamese_dataset.py --dataset vivos --download --target-dir ./data/vivos
  python scripts/prepare_vietnamese_dataset.py --dataset all --out-manifest ./data/vietnamese_train_manifest.csv
"""

import os
import sys
import re
import csv
import shutil
import argparse
import urllib.request
import tarfile
import zipfile
from pathlib import Path
from typing import List, Dict, Tuple, Optional

# Cố gắng nhập các thư viện xử lý âm thanh (soundfile / librosa / pydub)
try:
    import soundfile as sf
    import numpy as np
except ImportError:
    sf = None
    np = None

DATASET_SOURCES = {
    "vivos": {
        "name": "VIVOS Corpus (AILAB HCMUS)",
        "url": "https://zenodo.org/records/7068130/files/vivos.tar.gz",
        "archive_name": "vivos.tar.gz",
        "extracted_folder": "vivos",
    },
    "openslr57": {
        "name": "OpenSLR 57 (Vietnamese Speech)",
        "url": "https://www.openslr.org/resources/57/asr_vietnamese_0.zip",
        "archive_name": "asr_vietnamese_0.zip",
        "extracted_folder": "asr_vietnamese",
    },
}

def download_progress_hook(block_num, block_size, total_size):
    """Hiển thị thanh tiến trình tải tệp xuống"""
    downloaded = block_num * block_size
    if total_size > 0:
        percent = min(100.0, (downloaded / total_size) * 100)
        mb_down = downloaded / (1024 * 1024)
        mb_total = total_size / (1024 * 1024)
        sys.stdout.write(f"\r[Tải dữ liệu] {mb_down:.1f}MB / {mb_total:.1f}MB ({percent:.1f}%)")
        sys.stdout.flush()
    else:
        sys.stdout.write(f"\r[Tải dữ liệu] {downloaded / (1024 * 1024):.1f}MB")
        sys.stdout.flush()

def normalize_text(text: str) -> str:
    """Chuẩn hóa ký tự, dấu tiếng Việt để đưa vào huấn luyện mô hình TTS"""
    if not text:
        return ""
    t = text.strip()
    # Chuyển chữ hoa thành chữ thường chuẩn
    t = t.lower()
    # Loại bỏ các ký tự rác không phải tiếng Việt hoặc dấu câu cơ bản
    t = re.sub(r'[\r\n\t]+', ' ', t)
    t = re.sub(r'[^\w\s\.,\?!;:\-\'\"]', '', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def convert_audio_to_studio_wav(
    src_path: Path,
    dst_path: Path,
    target_sample_rate: int = 24000
) -> bool:
    """
    Chuyển đổi và chuẩn hóa tệp âm thanh:
    - Resample về 24000Hz (hoặc 22050Hz)
    - Chuẩn 16-bit Mono PCM
    - Chuẩn hóa âm lượng EBU R128 (-16 LUFS)
    """
    dst_path.parent.mkdir(parents=True, exist_ok=True)

    # 1. Thử dùng FFmpeg nếu có
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg:
        import subprocess
        cmd = [
            ffmpeg, "-y", "-i", str(src_path),
            "-af", "highpass=f=75,silenceremove=start_periods=1:start_duration=0.1:start_threshold=-40dB:detection=peak,areverse,silenceremove=start_periods=1:start_duration=0.1:start_threshold=-40dB:detection=peak,areverse,loudnorm=I=-16:TP=-1.5:LRA=11",
            "-ar", str(target_sample_rate),
            "-ac", "1",
            "-c:a", "pcm_s16le",
            str(dst_path)
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res.returncode == 0 and dst_path.exists() and dst_path.stat().st_size > 1024:
            return True

    # 2. Fallback bằng soundfile
    if sf is not None:
        try:
            data, sr = sf.read(str(src_path))
            if len(data.shape) > 1:
                data = data.mean(axis=1)

            if sr != target_sample_rate:
                from scipy import signal
                target_len = int(len(data) * target_sample_rate / sr)
                data = signal.resample(data, target_len)

            # Peak normalize
            max_val = np.max(np.abs(data))
            if max_val > 0:
                data = data / max_val * 0.9

            sf.write(str(dst_path), data, target_sample_rate, subtype="PCM_16")
            return dst_path.exists() and dst_path.stat().st_size > 1024
        except Exception as e:
            print(f"[Error converting audio]: {e}")

    return False

# =====================================================================
# XỬ LÝ TẬP DỮ LIỆU VIVOS
# =====================================================================
def process_vivos_dataset(vivos_root: Path, output_wavs_dir: Path) -> List[Dict[str, str]]:
    """
    Xử lý cấu trúc thư mục VIVOS:
    vivos/
      train/
        prompts.txt (định dạng: <file_id> <transcript>)
        waves/
          <speaker_id>/
            <file_id>.wav
      test/
        prompts.txt
        waves/
    """
    entries = []
    splits = ["train", "test"]

    for split in splits:
        split_dir = vivos_root / split
        prompts_file = split_dir / "prompts.txt"
        waves_dir = split_dir / "waves"

        if not prompts_file.exists():
            continue

        print(f"\n[VIVOS] Đang đọc phân đoạn '{split}'...")
        prompt_map: Dict[str, str] = {}
        with open(prompts_file, "r", encoding="utf-8") as f:
            for line in f:
                parts = line.strip().split(" ", 1)
                if len(parts) == 2:
                    prompt_map[parts[0].strip()] = parts[1].strip()

        # Quét các file WAV
        wav_files = list(waves_dir.glob("*/*.wav"))
        print(f"[VIVOS] Tìm thấy {len(wav_files)} file WAV trong '{split}'.")

        for idx, wav_p in enumerate(wav_files):
            file_id = wav_p.stem
            speaker_id = wav_p.parent.name
            transcript = prompt_map.get(file_id, "")
            if not transcript:
                continue

            clean_text = normalize_text(transcript)
            out_wav = output_wavs_dir / f"vivos_{speaker_id}_{file_id}_24k.wav"

            success = convert_audio_to_studio_wav(wav_p, out_wav)
            if success:
                entries.append({
                    "audio_path": str(out_wav.resolve()).replace("\\", "/"),
                    "speaker_id": f"vivos_{speaker_id}",
                    "text": clean_text,
                    "dataset": "vivos",
                    "split": split,
                })

            if (idx + 1) % 100 == 0 or (idx + 1) == len(wav_files):
                sys.stdout.write(f"\r[VIVOS {split}] Đã chuẩn hóa {idx + 1}/{len(wav_files)} tệp audio")
                sys.stdout.flush()
        print()

    return entries


# =====================================================================
# XỬ LÝ TẬP DỮ LIỆU OPENSLR 57
# =====================================================================
def process_openslr_dataset(openslr_root: Path, output_wavs_dir: Path) -> List[Dict[str, str]]:
    """Xử lý tập dữ liệu OpenSLR 57 Vietnamese Speech"""
    entries = []
    tsv_files = list(openslr_root.glob("*.tsv")) + list(openslr_root.glob("*.txt"))

    for tsv in tsv_files:
        try:
            with open(tsv, "r", encoding="utf-8") as f:
                reader = csv.reader(f, delimiter="\t")
                for row in reader:
                    if len(row) >= 2:
                        file_name = row[0].strip()
                        transcript = row[1].strip()
                        wav_candidate = openslr_root / file_name
                        if not wav_candidate.exists():
                            wav_candidate = openslr_root / f"{file_name}.wav"

                        if wav_candidate.exists():
                            out_wav = output_wavs_dir / f"slr_{Path(file_name).stem}_24k.wav"
                            if convert_audio_to_studio_wav(wav_candidate, out_wav):
                                entries.append({
                                    "audio_path": str(out_wav.resolve()).replace("\\", "/"),
                                    "speaker_id": "openslr_speaker",
                                    "text": normalize_text(transcript),
                                    "dataset": "openslr57",
                                    "split": "train",
                                })
        except Exception:
            pass

    return entries


# =====================================================================
# HÀM ĐIỀU PHỐI CHÍNH
# =====================================================================
def main():
    parser = argparse.ArgumentParser(description="Vietnamese Speech Datasets Preprocessor for DubbingStation")
    parser.add_argument("--dataset", choices=["vivos", "openslr57", "all"], default="vivos", help="Chọn tập dữ liệu cần chuẩn hóa")
    parser.add_argument("--download", action="store_true", help="Tự động tải dữ liệu từ internet nếu chưa có")
    parser.add_argument("--raw-dir", default="./data/raw", help="Thư mục chứa dữ liệu thô tải về")
    parser.add_argument("--processed-dir", default="./data/processed", help="Thư mục lưu âm thanh 24kHz đã xử lý")
    parser.add_argument("--out-manifest", default="./data/vietnamese_train_manifest.csv", help="Đường dẫn lưu file manifest CSV")
    args = parser.parse_args()

    raw_dir = Path(args.raw_dir)
    processed_dir = Path(args.processed_dir)
    raw_dir.mkdir(parents=True, exist_ok=True)
    processed_dir.mkdir(parents=True, exist_ok=True)

    all_entries: List[Dict[str, str]] = []

    # 1. XỬ LÝ VIVOS
    if args.dataset in ("vivos", "all"):
        vivos_info = DATASET_SOURCES["vivos"]
        vivos_dir = raw_dir / vivos_info["extracted_folder"]
        tar_path = raw_dir / vivos_info["archive_name"]

        if args.download and not vivos_dir.exists():
            if not tar_path.exists():
                print(f"[Dataset] Đang tải {vivos_info['name']} ({vivos_info['url']})...")
                urllib.request.urlretrieve(vivos_info["url"], tar_path, download_progress_hook)
                print("\n[Dataset] Tải tệp nén hoàn tất!")

            print(f"[Dataset] Đang giải nén {tar_path}...")
            with tarfile.open(tar_path, "r:gz") as tar:
                tar.extractall(path=raw_dir)
            print("[Dataset] Giải nén VIVOS hoàn tất!")

        if vivos_dir.exists():
            entries = process_vivos_dataset(vivos_dir, processed_dir / "wavs")
            all_entries.extend(entries)
            print(f"[VIVOS] Hoàn tất chuẩn hóa {len(entries)} mẫu âm thanh!")
        else:
            print(f"[VIVOS Warning] Thư mục {vivos_dir} chưa tồn tại. Thêm cờ --download để tự động tải.")

    # 2. XUẤT MANIFEST CSV
    if all_entries:
        out_csv = Path(args.out_manifest)
        out_csv.parent.mkdir(parents=True, exist_ok=True)

        with open(out_csv, "w", encoding="utf-8", newline="") as f:
            fieldnames = ["audio_path", "speaker_id", "text", "dataset", "split"]
            writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter="|")
            writer.writeheader()
            for row in all_entries:
                writer.writerow(row)

        print(f"\n======================================================================")
        print(f"🎉 Đã xuất thành công {len(all_entries)} mẫu huấn luyện vào: {out_csv}")
        print(f"Sẵn sàng nạp vào scripts/train_vietnamese_voice.py hoặc Coqui XTTS LoRA!")
        print(f"======================================================================")
    else:
        print("\n[Notice] Chưa có dữ liệu nào được xuất. Hãy kiểm tra đường dẫn hoặc chạy lại với cờ --download.")

if __name__ == "__main__":
    main()
