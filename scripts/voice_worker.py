"""
DubbingStation Universal Hybrid Voice Worker
=============================================
FastAPI worker hỗ trợ đa nền tảng (Local CPU/GPU, Google Colab, RunPod, VPS, Docker):
1. Coqui XTTS-v2 (Zero-shot Cloning & Fine-tuned Vietnamese Checkpoints)
2. Piper VITS ONNX (Huấn luyện từ VIVOS Corpus & 25Hours)
3. Bộ chuẩn hóa ngữ âm tiếng Việt (Vietnamese Text Normalizer & Phonemizer)
4. Hỗ trợ truyền audio qua Base64 cho Cloud Deployment (Next.js trên Vercel/Render -> GPU Worker ở xa)
"""

import os
import sys
import io
import time
import base64
import tempfile
import re
from typing import List, Optional, Dict, Any
from pathlib import Path

# Fix tương thích Python 3.10+ & 3.12 cho thư viện coqpit và coqui-tts
import builtins
import types
import typing
from typing import get_origin, Union
from contextlib import asynccontextmanager

_orig_issubclass = builtins.issubclass
def _safe_builtin_issubclass(cls, classinfo):
    try:
        if not isinstance(cls, type):
            return False
        return _orig_issubclass(cls, classinfo)
    except Exception:
        return False
builtins.issubclass = _safe_builtin_issubclass

try:
    import coqpit
    import coqpit.coqpit

    def _patched_is_union(arg_type: typing.Any) -> bool:
        if arg_type is Union:
            return True
        origin = get_origin(arg_type)
        if origin is Union:
            return True
        if hasattr(types, "UnionType") and (origin is types.UnionType or isinstance(arg_type, types.UnionType) or arg_type is types.UnionType):
            return True
        try:
            return coqpit.coqpit.safe_issubclass(arg_type.__origin__, Union)
        except Exception:
            return False

    def _patched_is_list(arg_type: typing.Any) -> bool:
        if arg_type is list or arg_type is typing.List:
            return True
        origin = get_origin(arg_type)
        if origin is list or origin is typing.List:
            return True
        try:
            return arg_type.__origin__ is list or arg_type.__origin__ is typing.List
        except AttributeError:
            return False

    def _patched_is_dict(arg_type: typing.Any) -> bool:
        if arg_type is dict or arg_type is typing.Dict:
            return True
        origin = get_origin(arg_type)
        if origin is dict or origin is typing.Dict:
            return True
        try:
            return arg_type.__origin__ is dict or arg_type.__origin__ is typing.Dict
        except AttributeError:
            return False

    coqpit.coqpit.is_union = _patched_is_union
    coqpit.is_union = _patched_is_union
    coqpit.coqpit.is_list = _patched_is_list
    coqpit.is_list = _patched_is_list
    coqpit.coqpit.is_dict = _patched_is_dict
    coqpit.is_dict = _patched_is_dict
    coqpit.coqpit.safe_issubclass = _safe_builtin_issubclass
    coqpit.safe_issubclass = _safe_builtin_issubclass
    coqpit.coqpit.issubclass = _safe_builtin_issubclass

    _orig_deserialize = coqpit.coqpit._deserialize
    def _safe_deserialize(x: typing.Any, field_type: typing.Any) -> typing.Any:
        try:
            return _orig_deserialize(x, field_type)
        except ValueError:
            # Fallback nếu type deserialization gặp lỗi do format union của Python 3.12
            if _patched_is_union(field_type):
                for arg in getattr(field_type, "__args__", []):
                    try:
                        return _safe_deserialize(x, arg)
                    except Exception:
                        pass
            try:
                if isinstance(x, field_type):
                    return x
            except TypeError:
                pass
            return x

    coqpit.coqpit._deserialize = _safe_deserialize
except Exception as patch_err:
    print(f"[Worker Warning] Không thể patch coqpit: {patch_err}")

# Fix tương thích PyTorch 2.6+ (weights_only=False mặc định khi nạp Coqui checkpoints)
try:
    import torch
    import torch.serialization

    _orig_torch_load = torch.load
    def _safe_torch_load(*args, **kwargs):
        if "weights_only" not in kwargs:
            kwargs["weights_only"] = False
        return _orig_torch_load(*args, **kwargs)

    torch.load = _safe_torch_load
    torch.serialization.load = _safe_torch_load
except Exception as torch_patch_err:
    print(f"[Worker Warning] Không thể patch torch.load: {torch_patch_err}")

# Đảm bảo đồng ý điều khoản CPML cho Coqui
os.environ['COQUI_TOS_AGREED'] = '1'

import uvicorn
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[Worker] Đang kiểm tra và nạp trước mô hình Coqui XTTS vào VRAM...")
    load_xtts_engine()
    yield

app = FastAPI(
    title="DubbingStation Voice Worker",
    version="3.0.0",
    description="Hybrid Voice Synthesis & Cloning Worker for Vietnamese and Multilingual Speech",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================================
# BỘ CHUẨN HÓA TIẾNG VIỆT (VIETNAMESE TEXT NORMALIZER)
# =====================================================================
NUMBERS_MAP = {
    '0': 'không', '1': 'một', '2': 'hai', '3': 'ba', '4': 'bốn',
    '5': 'năm', '6': 'sáu', '7': 'bảy', '8': 'tám', '9': 'chín'
}

UNITS_MAP = ['', 'nghìn', 'triệu', 'tỷ']

def number_to_words(num_str: str) -> str:
    """Chuyển chuỗi số thành chữ tiếng Việt cơ bản"""
    try:
        val = int(num_str)
        if val == 0:
            return 'không'
        # Xử lý các số nhỏ
        if len(num_str) <= 4:
            words = []
            for ch in num_str:
                words.append(NUMBERS_MAP.get(ch, ch))
            return ' '.join(words)
        return num_str
    except Exception:
        return num_str

def normalize_vietnamese_text(text: str) -> str:
    """Chuẩn hóa ký tự, số, dấu câu tiếng Việt để mô hình TTS đọc chuẩn xác"""
    if not text:
        return ""

    # Thay thế phần trăm, tiền tệ
    t = text.replace('%', ' phần trăm ')
    t = t.replace('$', ' đô la ')
    t = t.replace('₫', ' đồng ')
    t = t.replace('&', ' và ')
    t = t.replace('+', ' cộng ')

    # Chuẩn hóa khoảng trắng và dấu câu
    t = re.sub(r'[\r\n\t]+', ' ', t)
    t = re.sub(r'\s+', ' ', t).strip()

    # Chuẩn hóa các số đơn giản
    def replace_num(match):
        num = match.group(0)
        if len(num) <= 4:
            return f" {number_to_words(num)} "
        return num

    t = re.sub(r'\b\d+\b', replace_num, t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t


# =====================================================================
# CẤU HÌNH & KHỞI TẠO MÔ HÌNH (MODEL MANAGERS)
# =====================================================================
cached_latents: Dict[str, Any] = {}
loaded_models: Dict[str, Any] = {
    "xtts": None,
    "piper_vivos": None,
    "piper_25h": None,
}

MODELS_BASE_DIR = Path(os.getenv("MODELS_DIR", Path(__file__).resolve().parent.parent / "models"))

def get_device() -> str:
    import torch
    if torch.cuda.is_available():
        return "cuda"
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"

def load_xtts_engine():
    global loaded_models
    if loaded_models["xtts"] is not None:
        return loaded_models["xtts"]

    try:
        from TTS.api import TTS
        custom_model_dir = os.getenv("XTTS_MODEL_DIR", "")
        device_str = get_device()
        use_gpu = device_str in ("cuda", "mps")

        if custom_model_dir and os.path.exists(custom_model_dir):
            config_p = os.path.join(custom_model_dir, "config.json")
            model_p = os.path.join(custom_model_dir, "model.pth")
            if os.path.exists(config_p) and os.path.exists(model_p):
                print(f"[Worker] Đang nạp checkpoint tiếng Việt tùy chỉnh: {custom_model_dir}")
                loaded_models["xtts"] = TTS(model_path=model_p, config_path=config_p, progress_bar=False, gpu=use_gpu)
                return loaded_models["xtts"]

        model_name = os.getenv("XTTS_MODEL", "tts_models/multilingual/multi-dataset/xtts_v2")
        print(f"[Worker] Đang nạp mô hình Coqui XTTS ({model_name}) trên {device_str.upper()}...")
        loaded_models["xtts"] = TTS(model_name=model_name, progress_bar=True, gpu=use_gpu)
        print("[Worker] Nạp Coqui XTTS thành công!")
        return loaded_models["xtts"]
    except Exception as e:
        print(f"[Worker Warning] Không thể nạp Coqui XTTS: {e}")
        import traceback
        traceback.print_exc()
        return None


def get_piper_model_path(model_type: str = "vivos") -> Optional[str]:
    """Tìm đường dẫn tới file ONNX Piper VIVOS hoặc 25Hours"""
    piper_dir = MODELS_BASE_DIR / "piper"
    if model_type == "vivos":
        candidates = [
            piper_dir / "vi_VN-vivos-x_low.onnx",
            Path("models/piper/vi_VN-vivos-x_low.onnx"),
            Path("/app/models/piper/vi_VN-vivos-x_low.onnx"),
        ]
    else:
        candidates = [
            piper_dir / "vi_VN-25hours_single-low.onnx",
            Path("models/piper/vi_VN-25hours_single-low.onnx"),
            Path("/app/models/piper/vi_VN-25hours_single-low.onnx"),
        ]

    for c in candidates:
        if c.exists():
            return str(c)
    return None


# =====================================================================
# PYDANTIC SCHEMAS
# =====================================================================
class TrainVoiceRequest(BaseModel):
    voice_id: str
    audio_paths: Optional[List[str]] = None
    audio_base64_list: Optional[List[str]] = None
    gender: Optional[str] = "neutral"
    language: Optional[str] = "vi-VN"

class SynthesizeVoiceRequest(BaseModel):
    voice_id: Optional[str] = None
    text: str
    speaker_wavs: Optional[List[str]] = None
    speaker_base64: Optional[List[str]] = None
    language: Optional[str] = "vi"
    speed: Optional[float] = 1.0
    temperature: Optional[float] = 0.75
    repetition_penalty: Optional[float] = 5.0
    preferred_engine: Optional[str] = "auto" # 'auto', 'xtts', 'piper_vivos', 'piper_25h'


# =====================================================================
# API ENDPOINTS
# =====================================================================
@app.get("/health")
def health():
    import torch
    device = get_device()
    gpu_name = torch.cuda.get_device_name(0) if device == "cuda" else (
        "Apple Silicon (MPS)" if device == "mps" else "CPU Host"
    )
    vram_mb = round(torch.cuda.get_device_properties(0).total_memory / (1024 * 1024)) if device == "cuda" else 0

    vivos_available = get_piper_model_path("vivos") is not None
    piper25_available = get_piper_model_path("25h") is not None

    return {
        "status": "ONLINE",
        "worker_name": "DubbingStation-Universal-Voice-Worker",
        "version": "3.0.0",
        "device": device,
        "is_gpu": device in ("cuda", "mps"),
        "gpu_name": gpu_name,
        "vram_mb": vram_mb,
        "xtts_ready": loaded_models["xtts"] is not None or os.getenv("XTTS_ENABLED", "true") == "true",
        "piper_vivos_ready": vivos_available,
        "piper_25hours_ready": piper25_available,
        "cached_voices_count": len(cached_latents),
        "cached_voices": list(cached_latents.keys()),
        "supported_datasets": ["VIVOS (AILAB)", "VietTTS", "OpenSLR 57", "Common Voice Vietnamese"],
    }


@app.post("/train")
def train_voice(req: TrainVoiceRequest):
    """
    Trích xuất conditioning latents và speaker embedding cho voice_id.
    Chấp nhận danh sách đường dẫn file cục bộ hoặc chuỗi Base64 audio từ client.
    """
    tts = load_xtts_engine()
    if not tts:
        raise HTTPException(status_code=503, detail="XTTS Engine chưa sẵn sàng trên worker.")

    xtts_model = getattr(tts.synthesizer, "tts_model", None)
    if not xtts_model:
        raise HTTPException(status_code=500, detail="Không thể truy cập mô hình XTTS synthesizer.")

    temp_files = []
    resolved_paths = []

    try:
        # 1. Thu thập từ audio_paths
        if req.audio_paths:
            for p in req.audio_paths:
                if os.path.exists(p):
                    resolved_paths.append(p)

        # 2. Thu thập từ audio_base64_list (cho client ở xa qua mạng)
        if req.audio_base64_list:
            for idx, b64_str in enumerate(req.audio_base64_list):
                if not b64_str:
                    continue
                # Bỏ tiền tố data:audio/...;base64, nếu có
                clean_b64 = b64_str.split(",")[-1]
                data = base64.b64decode(clean_b64)
                tmp = tempfile.NamedTemporaryFile(suffix=f"_train_{idx}.wav", delete=False)
                tmp.write(data)
                tmp.close()
                temp_files.append(tmp.name)
                resolved_paths.append(tmp.name)

        if not resolved_paths:
            raise HTTPException(
                status_code=400,
                detail="Không tìm thấy tệp âm thanh hợp lệ (cần audio_paths hoặc audio_base64_list)."
            )

        print(f"[Worker] Đang trích xuất conditioning latents cho {req.voice_id} từ {len(resolved_paths)} mẫu...")
        gpt_cond_latent, speaker_embedding = xtts_model.get_conditioning_latents(
            audio_path=resolved_paths,
            max_ref_length=60,
            gpt_cond_len=30,
            sound_norm_refs=True,
        )

        cached_latents[req.voice_id] = {
            "gpt_cond_latent": gpt_cond_latent,
            "speaker_embedding": speaker_embedding,
            "gender": req.gender,
            "updated_at": time.time(),
        }

        return {
            "success": True,
            "voice_id": req.voice_id,
            "samples_processed": len(resolved_paths),
            "cached_in_memory": True,
            "message": f"Đã trích xuất và tối ưu hóa latents cho giọng {req.voice_id} thành công!",
        }

    except Exception as e:
        print(f"[Worker Error] Trích xuất latents thất bại: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        for tmp_path in temp_files:
            try:
                os.remove(tmp_path)
            except Exception:
                pass


@app.post("/synthesize")
def synthesize(req: SynthesizeVoiceRequest):
    """
    Tổng hợp giọng nói chất lượng cao:
    - Nếu có voice_id trong cache: Dùng conditioning latents đã nạp sẵn siêu tốc.
    - Nếu có speaker_wavs / speaker_base64: Trích xuất trực tiếp on-the-fly.
    - Hỗ trợ fallback thông minh sang Piper VITS (VIVOS Corpus) nếu XTTS không khả dụng.
    """
    clean_text = normalize_vietnamese_text(req.text)
    if not clean_text:
        raise HTTPException(status_code=400, detail="Văn bản cần đọc không hợp lệ hoặc trống.")

    temp_files = []
    try:
        # A. PIPER VITS FAST INFERENCE ENGINE (Nếu yêu cầu hoặc CPU)
        if req.preferred_engine in ("piper_vivos", "piper_25h"):
            model_type = "vivos" if req.preferred_engine == "piper_vivos" else "25h"
            piper_model_path = get_piper_model_path(model_type)
            if piper_model_path:
                audio_bytes = synthesize_with_piper_cli(clean_text, piper_model_path, req.speed or 1.0)
                if audio_bytes:
                    return Response(content=audio_bytes, media_type="audio/wav")

        # B. COQUI XTTS-V2 ENGINE
        tts = load_xtts_engine()
        if tts:
            xtts_model = getattr(tts.synthesizer, "tts_model", None)
            device = get_device()

            gpt_cond_latent = None
            speaker_embedding = None

            # 1. Lấy từ Cache Latents
            if req.voice_id and req.voice_id in cached_latents:
                lat = cached_latents[req.voice_id]
                gpt_cond_latent = lat["gpt_cond_latent"]
                speaker_embedding = lat["speaker_embedding"]
                if hasattr(gpt_cond_latent, "to"):
                    gpt_cond_latent = gpt_cond_latent.to(device)
                if hasattr(speaker_embedding, "to"):
                    speaker_embedding = speaker_embedding.to(device)

            # 2. Hoặc trích xuất từ audio tham chiếu gửi kèm
            else:
                resolved_refs = []
                if req.speaker_wavs:
                    resolved_refs.extend([p for p in req.speaker_wavs if os.path.exists(p)])

                if req.speaker_base64:
                    for idx, b64 in enumerate(req.speaker_base64):
                        clean_b64 = b64.split(",")[-1]
                        data = base64.b64decode(clean_b64)
                        tmp = tempfile.NamedTemporaryFile(suffix=f"_synth_ref_{idx}.wav", delete=False)
                        tmp.write(data)
                        tmp.close()
                        temp_files.append(tmp.name)
                        resolved_refs.append(tmp.name)

                if resolved_refs:
                    gpt_cond_latent, speaker_embedding = xtts_model.get_conditioning_latents(
                        audio_path=resolved_refs,
                        max_ref_length=60,
                        gpt_cond_len=30,
                        sound_norm_refs=True,
                    )

            if gpt_cond_latent is not None and speaker_embedding is not None:
                # Ngôn ngữ: Nếu model là checkpoint tiếng Việt thì dùng 'vi', ngược lại dùng fallback
                req_lang = (req.language or "vi").lower().split("-")[0]
                supported_langs = getattr(tts, "languages", []) or []
                use_lang = req_lang if req_lang in supported_langs else os.getenv("XTTS_FALLBACK_LANG", "en")

                out = xtts_model.inference(
                    text=clean_text,
                    language=use_lang,
                    gpt_cond_latent=gpt_cond_latent,
                    speaker_embedding=speaker_embedding,
                    temperature=req.temperature or 0.75,
                    repetition_penalty=req.repetition_penalty or 5.0,
                    speed=req.speed or 1.0,
                )

                import soundfile as sf
                buf = io.BytesIO()
                sf.write(buf, out["wav"], 24000, format="WAV", subtype="PCM_16")
                buf.seek(0)
                return Response(
                    content=buf.read(),
                    media_type="audio/wav",
                    headers={
                        "X-Engine": "Coqui-XTTS-v2",
                        "X-Device": device,
                        "X-Text-Length": str(len(clean_text)),
                    }
                )

        # C. FALLBACK SANG PIPER VITS (VIVOS CORPUS)
        vivos_path = get_piper_model_path("vivos") or get_piper_model_path("25h")
        if vivos_path:
            print("[Worker] Tự động kích hoạt Piper VITS (VIVOS Corpus) làm động cơ tạo tiếng Việt...")
            audio_bytes = synthesize_with_piper_cli(clean_text, vivos_path, req.speed or 1.0)
            if audio_bytes:
                return Response(
                    content=audio_bytes,
                    media_type="audio/wav",
                    headers={"X-Engine": "Piper-VITS-VIVOS", "X-Device": "CPU"}
                )

        raise HTTPException(
            status_code=500,
            detail="Cả XTTS và Piper VITS đều không thể sinh âm thanh. Hãy kiểm tra cấu hình worker."
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Worker Synthesis Error]: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        for tmp_p in temp_files:
            try:
                os.remove(tmp_p)
            except Exception:
                pass


def synthesize_with_piper_cli(text: str, model_path: str, speed: float = 1.0) -> Optional[bytes]:
    """Sinh âm thanh tiếng Việt siêu tốc bằng Piper VITS ONNX"""
    import subprocess
    import shutil

    piper_cmd = shutil.which("piper") or "piper"
    tmp_out = tempfile.NamedTemporaryFile(suffix="_piper.wav", delete=False)
    tmp_out.close()

    try:
        cmd = [
            piper_cmd,
            "--model", model_path,
            "--output_file", tmp_out.name,
            "--length_scale", str(round(1.0 / max(0.5, speed), 2))
        ]
        proc = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        stdout, stderr = proc.communicate(input=text.encode("utf-8"), timeout=30)
        if os.path.exists(tmp_out.name) and os.path.getsize(tmp_out.name) > 1024:
            with open(tmp_out.name, "rb") as f:
                return f.read()
    except Exception as e:
        print(f"[Piper CLI Warning]: {e}")
    finally:
        try:
            os.remove(tmp_out.name)
        except Exception:
            pass
    return None


@app.delete("/voices/{voice_id}")
def delete_cached_voice(voice_id: str):
    """Xóa latents của một voice khỏi bộ nhớ cache RAM"""
    if voice_id in cached_latents:
        del cached_latents[voice_id]
        return {"success": True, "message": f"Đã xóa voice {voice_id} khỏi RAM cache."}
    return {"success": False, "message": f"Voice {voice_id} không tồn tại trong RAM."}


# =====================================================================
# ENTRY POINT
# =====================================================================
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="DubbingStation Universal Voice Worker")
    parser.add_argument("--port", type=int, default=int(os.getenv("PORT", os.getenv("VOICE_WORKER_PORT", "8020"))), help="Port lắng nghe")
    parser.add_argument("--host", type=str, default=os.getenv("HOST", "0.0.0.0"), help="Host lắng nghe")
    args = parser.parse_args()

    print(f"[Worker] Khởi động DubbingStation Voice Worker tại http://{args.host}:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port)
