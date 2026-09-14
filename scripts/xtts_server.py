"""
Coqui XTTS-v2 Standalone FastAPI High-Performance Synthesis Worker
Tải mô hình vào VRAM/RAM 1 lần duy nhất, hỗ trợ đa tệp audio mẫu và trích xuất latents.
Chạy bằng: uvicorn scripts.xtts_server:app --host 0.0.0.0 --port 8020
"""

import os
import sys
import tempfile
import torch
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Body
from fastapi.responses import Response
from pydantic import BaseModel
import soundfile as sf
import io

os.environ['COQUI_TOS_AGREED'] = '1'

app = FastAPI(title="DubbingStation Coqui XTTS-v2 Worker", version="2.0.0")

# Biến toàn cục lưu trữ mô hình và bộ nhớ cache latents
tts_instance = None
cached_latents = {}


class TrainRequest(BaseModel):
    voice_id: str
    audio_paths: List[str]


class SynthesizeRequest(BaseModel):
    voice_id: Optional[str] = None
    text: str
    speaker_wavs: Optional[List[str]] = None
    language: Optional[str] = "vi"
    speed: Optional[float] = 1.0
    temperature: Optional[float] = 0.75
    repetition_penalty: Optional[float] = 5.0


def get_tts_model():
    global tts_instance
    if tts_instance is None:
        from TTS.api import TTS
        model_name = os.getenv('XTTS_MODEL', 'tts_models/multilingual/multi-dataset/xtts_v2')
        use_gpu = os.getenv('XTTS_USE_GPU', 'false').lower() in ('true', '1', 'yes')
        print(f"[XTTS Server] Đang nạp mô hình {model_name} (GPU: {use_gpu})...")
        tts_instance = TTS(model_name=model_name, progress_bar=False, gpu=use_gpu)
        print("[XTTS Server] Nạp mô hình hoàn tất!")
    return tts_instance


@app.get("/health")
def health_check():
    use_gpu = torch.cuda.is_available()
    gpu_name = torch.cuda.get_device_name(0) if use_gpu else "CPU only"
    return {
        "status": "ONLINE",
        "model": os.getenv('XTTS_MODEL', 'xtts_v2'),
        "device": "cuda" if use_gpu else "cpu",
        "gpu_name": gpu_name,
        "cached_voices": list(cached_latents.keys()),
    }


@app.post("/train")
def train_voice(req: TrainRequest):
    tts = get_tts_model()
    xtts_model = getattr(tts.synthesizer, 'tts_model', None)
    if not xtts_model:
        raise HTTPException(status_code=500, detail="Không thể truy cập mô hình XTTS.")

    valid_paths = [p for p in req.audio_paths if os.path.exists(p)]
    if not valid_paths:
        raise HTTPException(status_code=400, detail="Không tìm thấy tệp audio tham chiếu nào.")

    try:
        gpt_cond_latent, speaker_embedding = xtts_model.get_conditioning_latents(
            audio_path=valid_paths,
            max_ref_length=60,
            gpt_cond_len=30,
            sound_norm_refs=True,
        )
        cached_latents[req.voice_id] = {
            "gpt_cond_latent": gpt_cond_latent,
            "speaker_embedding": speaker_embedding,
        }
        return {
            "success": True,
            "voice_id": req.voice_id,
            "sample_count": len(valid_paths),
            "message": f"Đã trích xuất và nạp latents cho giọng {req.voice_id} vào bộ nhớ RAM.",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/synthesize")
def synthesize_speech(req: SynthesizeRequest):
    tts = get_tts_model()
    xtts_model = getattr(tts.synthesizer, 'tts_model', None)
    device = "cuda" if torch.cuda.is_available() else "cpu"

    try:
        # Nếu đã có latents trong cache
        if req.voice_id and req.voice_id in cached_latents:
            lat = cached_latents[req.voice_id]
            gpt_cond_latent = lat["gpt_cond_latent"].to(device)
            speaker_embedding = lat["speaker_embedding"].to(device)
        elif req.speaker_wavs:
            valid_wavs = [p for p in req.speaker_wavs if os.path.exists(p)]
            if not valid_wavs:
                raise HTTPException(status_code=400, detail="Không tìm thấy tệp speaker_wavs.")
            gpt_cond_latent, speaker_embedding = xtts_model.get_conditioning_latents(
                audio_path=valid_wavs,
                max_ref_length=60,
                gpt_cond_len=30,
                sound_norm_refs=True,
            )
        else:
            raise HTTPException(status_code=400, detail="Cần cung cấp voice_id đã train hoặc speaker_wavs.")

        lang = (req.language or "vi").lower().split("-")[0]
        supported = getattr(tts, "languages", [])
        if supported and lang not in supported:
            lang = os.getenv("XTTS_FALLBACK_LANG", "en")

        out = xtts_model.inference(
            text=req.text,
            language=lang,
            gpt_cond_latent=gpt_cond_latent,
            speaker_embedding=speaker_embedding,
            temperature=req.temperature or 0.75,
            repetition_penalty=req.repetition_penalty or 5.0,
            speed=req.speed or 1.0,
        )

        buf = io.BytesIO()
        sf.write(buf, out["wav"], 24000, format="WAV", subtype="PCM_16")
        buf.seek(0)

        return Response(content=buf.read(), media_type="audio/wav")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("XTTS_PORT", "8020"))
    uvicorn.run("scripts.xtts_server:app", host="0.0.0.0", port=port, reload=False)
