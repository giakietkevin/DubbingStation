import argparse
import os
import sys
import tempfile
import subprocess
from pathlib import Path

# Chấp thuận điều khoản Coqui CPML để tránh prompt stdin bị treo
os.environ['COQUI_TOS_AGREED'] = '1'


def prepare_reference_audio(audio_path: str, max_duration_sec: float = 25.0) -> str:
    """
    Chuẩn hóa audio tham chiếu cho XTTS:
    - Chuyển đổi định dạng MP3/M4A/FLAC/WEBM/WAV sang 24000Hz mono PCM WAV.
    - Cắt tỉa tối đa 25 giây để trích xuất speaker latent nhanh nhất, tránh tràn VRAM/RAM.
    """
    src = Path(audio_path)
    if not src.exists():
        raise FileNotFoundError(f"Không tìm thấy tệp audio tham chiếu: {audio_path}")

    # Tạo tệp WAV tạm thời chuẩn hóa
    temp_wav = tempfile.NamedTemporaryFile(suffix='_ref24k.wav', delete=False)
    temp_wav.close()
    out_path = temp_wav.name

    # Thử dùng ffmpeg nếu có sẵn (hỗ trợ đọc mọi định dạng audio)
    try:
        cmd = [
            'ffmpeg', '-y', '-i', str(src),
            '-t', str(max_duration_sec),
            '-ac', '1',
            '-ar', '24000',
            '-f', 'wav',
            out_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res.returncode == 0 and os.path.getsize(out_path) > 1024:
            return out_path
    except Exception:
        pass

    # Phương án dự phòng bằng soundfile / scipy nếu không có ffmpeg
    try:
        import soundfile as sf
        import numpy as np

        data, sr = sf.read(str(src))
        # Nếu là stereo, chuyển sang mono
        if len(data.shape) > 1:
            data = data.mean(axis=1)

        # Cắt tối đa max_duration_sec
        max_samples = int(sr * max_duration_sec)
        if len(data) > max_samples:
            data = data[:max_samples]

        # Resample sang 24000Hz nếu khác
        if sr != 24000:
            try:
                from scipy import signal
                num_output_samples = int(len(data) * 24000 / sr)
                data = signal.resample(data, num_output_samples)
                sr = 24000
            except Exception:
                pass

        sf.write(out_path, data, sr, format='WAV', subtype='PCM_16')
        if os.path.getsize(out_path) > 1024:
            return out_path
    except Exception:
        pass

    # Nếu không thể tiền xử lý, trả về đường dẫn gốc
    if os.path.exists(out_path):
        os.remove(out_path)
    return str(src)


def load_tts_model(model_name: str, use_gpu: bool):
    """
    Nạp mô hình TTS: Hỗ trợ tên model Coqui tiêu chuẩn hoặc thư mục checkpoint cục bộ.
    """
    from TTS.api import TTS

    if os.path.isdir(model_name):
        config_path = os.path.join(model_name, 'config.json')
        model_path = os.path.join(model_name, 'model.pth')
        if os.path.exists(config_path) and os.path.exists(model_path):
            return TTS(model_path=model_path, config_path=config_path, progress_bar=False, gpu=use_gpu)

    return TTS(model_name=model_name, progress_bar=False, gpu=use_gpu)


def main() -> int:
    parser = argparse.ArgumentParser(description="Coqui XTTS-v2 Voice Cloning & Synthesis Engine")
    parser.add_argument('--text', required=True, help="Văn bản cần đọc")
    parser.add_argument('--speaker-wav', required=True, help="Đường dẫn audio mẫu của người nói")
    parser.add_argument('--language', required=True, help="Mã ngôn ngữ (vi, en, ja, ko, zh-cn, ...)")
    parser.add_argument('--output', required=True, help="Đường dẫn tệp âm thanh đầu ra WAV")
    parser.add_argument('--speed', type=float, default=1.0, help="Tốc độ đọc (1.0 là bình thường)")
    args = parser.parse_args()

    try:
        from TTS.api import TTS
    except Exception as error:
        print(f'XTTS_IMPORT_ERROR: Không thể import thư viện TTS ({error}). Cần cài đặt coqui-tts hoặc TTS.', file=sys.stderr)
        return 2

    cleaned_ref_path = None
    try:
        # Chuẩn hóa audio tham chiếu trước khi truyền cho XTTS
        cleaned_ref_path = prepare_reference_audio(args.speaker_wav)

        model_name = os.getenv(
            'XTTS_MODEL',
            'tts_models/multilingual/multi-dataset/xtts_v2',
        )
        use_gpu = os.getenv('XTTS_USE_GPU', 'false').lower() in ('true', '1', 'yes')

        tts = load_tts_model(model_name, use_gpu)

        lang = args.language.lower()
        supported = getattr(tts, 'languages', None)
        if supported and lang not in supported:
            fallback = os.getenv('XTTS_FALLBACK_LANG', 'en')
            print(
                f'XTTS_WARNING: Language "{lang}" is not supported by {model_name}. '
                f'Supported: {supported}. Falling back to "{fallback}".',
                file=sys.stderr,
            )
            lang = fallback

        # Tạo thư mục chứa output nếu chưa có
        out_dir = os.path.dirname(os.path.abspath(args.output))
        if out_dir:
            os.makedirs(out_dir, exist_ok=True)

        tts.tts_to_file(
            text=args.text,
            speaker_wav=cleaned_ref_path,
            language=lang,
            file_path=args.output,
            speed=args.speed if args.speed and args.speed > 0 else 1.0,
        )

        if not os.path.exists(args.output) or os.path.getsize(args.output) == 0:
            print('XTTS_SYNTHESIS_ERROR: File output rỗng hoặc không được tạo.', file=sys.stderr)
            return 1

        return 0
    except Exception as error:
        print(f'XTTS_SYNTHESIS_ERROR: {error}', file=sys.stderr)
        return 1
    finally:
        # Dọn dẹp tệp WAV tạm thời nếu có tạo
        if cleaned_ref_path and cleaned_ref_path != args.speaker_wav and os.path.exists(cleaned_ref_path):
            try:
                os.remove(cleaned_ref_path)
            except Exception:
                pass


if __name__ == '__main__':
    raise SystemExit(main())
