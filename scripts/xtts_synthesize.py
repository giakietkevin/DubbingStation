import argparse
import os
import sys
import tempfile
import subprocess
from pathlib import Path
from typing import List, Optional

# Chấp thuận điều khoản Coqui CPML để tránh prompt stdin bị treo
os.environ['COQUI_TOS_AGREED'] = '1'


def prepare_single_audio(audio_path: str, max_duration_sec: float = 30.0) -> str:
    """
    Chuẩn hóa một tệp audio tham chiếu cho XTTS-v2:
    - Chuyển đổi định dạng MP3/M4A/FLAC/WEBM/WAV sang 24000Hz 16-bit mono PCM WAV.
    - Cắt lọc tần số thấp (<75Hz) và chuẩn hóa dải động.
    """
    src = Path(audio_path)
    if not src.exists():
        raise FileNotFoundError(f"Không tìm thấy tệp audio tham chiếu: {audio_path}")

    temp_wav = tempfile.NamedTemporaryFile(suffix='_ref24k.wav', delete=False)
    temp_wav.close()
    out_path = temp_wav.name

    # Ưu tiên sử dụng ffmpeg nếu có sẵn
    try:
        cmd = [
            'ffmpeg', '-y', '-i', str(src),
            '-t', str(max_duration_sec),
            '-af', 'highpass=f=75,silenceremove=start_periods=1:start_duration=0.1:start_threshold=-40dB:detection=peak',
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

    # Dự phòng bằng soundfile / scipy nếu không có ffmpeg
    try:
        import soundfile as sf
        import numpy as np

        data, sr = sf.read(str(src))
        if len(data.shape) > 1:
            data = data.mean(axis=1)

        max_samples = int(sr * max_duration_sec)
        if len(data) > max_samples:
            data = data[:max_samples]

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

    if os.path.exists(out_path):
        os.remove(out_path)
    return str(src)


def prepare_reference_audios(audio_paths: List[str]) -> List[str]:
    """
    Chuẩn hóa danh sách 1 hoặc nhiều audio tham chiếu.
    """
    cleaned_paths = []
    for p in audio_paths:
        if not p or not os.path.exists(p):
            continue
        cleaned = prepare_single_audio(p)
        cleaned_paths.append(cleaned)
    return cleaned_paths


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
    parser = argparse.ArgumentParser(description="Coqui XTTS-v2 Multi-Sample Voice Cloning & Synthesis Engine")
    parser.add_argument('--text', required=False, default="", help="Văn bản cần đọc")
    parser.add_argument(
        '--speaker-wav',
        nargs='+',
        required=False,
        help="Danh sách đường dẫn 1 hoặc nhiều audio mẫu của người nói"
    )
    parser.add_argument(
        '--latents-path',
        required=False,
        help="Đường dẫn tệp .pth chứa speaker conditioning latents đã trích xuất trước đó"
    )
    parser.add_argument(
        '--extract-latents-out',
        required=False,
        help="Nếu được chỉ định, trích xuất latents từ --speaker-wav và lưu vào file này rồi thoát"
    )
    parser.add_argument(
        '--language',
        required=False,
        default='vi',
        help="Mã ngôn ngữ (vi, en, ja, ko, zh-cn, fr, de, es, ...)"
    )
    parser.add_argument('--output', required=False, help="Đường dẫn tệp âm thanh đầu ra WAV")
    parser.add_argument('--speed', type=float, default=1.0, help="Tốc độ đọc (1.0 là bình thường)")
    parser.add_argument('--temperature', type=float, default=0.75, help="Độ biến thiên ngữ điệu (0.6 - 0.85)")
    parser.add_argument('--repetition-penalty', type=float, default=5.0, help="Ngăn chặn lặp từ/vấp tiếng")
    args = parser.parse_args()

    try:
        from TTS.api import TTS
        import torch
    except Exception as error:
        print(f'XTTS_IMPORT_ERROR: Không thể import thư viện TTS hoặc PyTorch ({error}).', file=sys.stderr)
        return 2

    cleaned_refs = []
    try:
        model_name = os.getenv('XTTS_MODEL', 'tts_models/multilingual/multi-dataset/xtts_v2')
        use_gpu = os.getenv('XTTS_USE_GPU', 'false').lower() in ('true', '1', 'yes')

        # Xử lý các tệp âm thanh tham chiếu nếu có
        if args.speaker_wav:
            # Flatten nếu người dùng truyền chuỗi phân cách bởi dấu phẩy
            raw_paths = []
            for item in args.speaker_wav:
                for sub in item.split(','):
                    if sub.strip():
                        raw_paths.append(sub.strip())
            cleaned_refs = prepare_reference_audios(raw_paths)

        # Nạp mô hình XTTS-v2
        tts = load_tts_model(model_name, use_gpu)

        # -------------------------------------------------------------
        # CHẾ ĐỘ 1: TRÍCH XUẤT CONDITIONING LATENTS VÀ LƯU FILE .PTH
        # -------------------------------------------------------------
        if args.extract_latents_out:
            if not cleaned_refs:
                print('XTTS_LATENTS_ERROR: Cần ít nhất 1 tệp speaker-wav để trích xuất latents.', file=sys.stderr)
                return 1

            out_latents_dir = os.path.dirname(os.path.abspath(args.extract_latents_out))
            if out_latents_dir:
                os.makedirs(out_latents_dir, exist_ok=True)

            print(f'[XTTS] Đang trích xuất speaker conditioning latents từ {len(cleaned_refs)} tệp âm thanh...')
            xtts_model = getattr(tts.synthesizer, 'tts_model', None)
            if xtts_model and hasattr(xtts_model, 'get_conditioning_latents'):
                gpt_cond_latent, speaker_embedding = xtts_model.get_conditioning_latents(
                    audio_path=cleaned_refs,
                    max_ref_length=60,
                    gpt_cond_len=30,
                    sound_norm_refs=True,
                )
                torch.save({
                    'gpt_cond_latent': gpt_cond_latent.cpu(),
                    'speaker_embedding': speaker_embedding.cpu(),
                    'num_refs': len(cleaned_refs),
                }, args.extract_latents_out)
                print(f'[XTTS] Đã lưu thành công latents vào: {args.extract_latents_out}')
                return 0
            else:
                print('XTTS_LATENTS_ERROR: Mô hình không hỗ trợ hàm get_conditioning_latents trực tiếp.', file=sys.stderr)
                return 1

        # -------------------------------------------------------------
        # CHẾ ĐỘ 2: TỔNG HỢP GIỌNG NÓI (SYNTHESIS)
        # -------------------------------------------------------------
        if not args.text or not args.output:
            print('XTTS_SYNTHESIS_ERROR: Thiếu --text hoặc --output cho tổng hợp giọng.', file=sys.stderr)
            return 1

        out_dir = os.path.dirname(os.path.abspath(args.output))
        if out_dir:
            os.makedirs(out_dir, exist_ok=True)

        lang = args.language.lower().split('-')[0]
        supported = getattr(tts, 'languages', None)
        if supported and lang not in supported:
            fallback = os.getenv('XTTS_FALLBACK_LANG', 'en')
            print(
                f'XTTS_WARNING: Language "{lang}" không có trong danh sách hỗ trợ {supported}. '
                f'Sử dụng ngôn ngữ fallback "{fallback}".',
                file=sys.stderr,
            )
            lang = fallback

        # Trường hợp A: Sử dụng latents đã lưu trong tệp .pth
        if args.latents_path and os.path.exists(args.latents_path):
            print(f'[XTTS] Nạp speaker latents từ: {args.latents_path}')
            device = 'cuda' if use_gpu and torch.cuda.is_available() else 'cpu'
            latents = torch.load(args.latents_path, map_location=device)
            gpt_cond_latent = latents['gpt_cond_latent'].to(device)
            speaker_embedding = latents['speaker_embedding'].to(device)

            xtts_model = getattr(tts.synthesizer, 'tts_model', None)
            if xtts_model and hasattr(xtts_model, 'inference'):
                out = xtts_model.inference(
                    text=args.text,
                    language=lang,
                    gpt_cond_latent=gpt_cond_latent,
                    speaker_embedding=speaker_embedding,
                    temperature=args.temperature,
                    length_penalty=1.0,
                    repetition_penalty=args.repetition_penalty,
                    top_k=50,
                    top_p=0.85,
                    speed=args.speed if args.speed and args.speed > 0 else 1.0,
                )
                import soundfile as sf
                sf.write(args.output, out['wav'], 24000)
                if os.path.exists(args.output) and os.path.getsize(args.output) > 1024:
                    print(f'[XTTS] Đã sinh audio qua precomputed latents: {args.output}')
                    return 0

        # Trường hợp B: Sử dụng trực tiếp danh sách speaker_wav
        if not cleaned_refs:
            print('XTTS_SYNTHESIS_ERROR: Cần cung cấp --speaker-wav hoặc --latents-path hợp lệ.', file=sys.stderr)
            return 1

        print(f'[XTTS] Tổng hợp giọng nói với {len(cleaned_refs)} tệp âm thanh tham chiếu...')
        tts.tts_to_file(
            text=args.text,
            speaker_wav=cleaned_refs if len(cleaned_refs) > 1 else cleaned_refs[0],
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
        # Dọn dẹp các tệp WAV tạm thời
        for temp_path in cleaned_refs:
            if '_ref24k.wav' in temp_path and os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass


if __name__ == '__main__':
    raise SystemExit(main())
