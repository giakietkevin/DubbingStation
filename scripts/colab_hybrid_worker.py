"""
Google Colab / Cloud GPU Hybrid Worker Launcher
===============================================
Chạy toàn bộ Deep Learning Voice Worker trên Google Colab GPU T4 miễn phí.
Tự động mở cổng công khai Cloudflare / ngrok để kết nối về DubbingStation trên máy bạn hoặc Vercel/Render!

Hướng dẫn sử dụng trên Google Colab:
1. Mở https://colab.research.google.com -> Tạo sổ tay mới (New Notebook).
2. Vào Menu: Runtime -> Change runtime type -> Chọn GPU (T4 GPU).
3. Dán đoạn mã dưới đây vào 1 ô Code và bấm RUN!
"""

"""
Google Colab / Cloud GPU Hybrid Worker Launcher
===============================================
Chạy toàn bộ Deep Learning Voice Worker trên Google Colab GPU T4 miễn phí.
Tự động mở cổng công khai Cloudflare Tunnel để kết nối về DubbingStation trên máy bạn!

Hướng dẫn 1-click trên Google Colab:
1. Mở https://colab.research.google.com -> Tạo sổ tay mới (New Notebook).
2. Vào Menu: Runtime -> Change runtime type -> Chọn GPU (T4 GPU).
3. Tạo 1 ô code và dán toàn bộ đoạn code dưới đây, rồi bấm RUN:

```python
# [Ô CODE DUY NHẤT TRÊN COLAB]
!pip install -q coqui-tts soundfile fastapi uvicorn pydantic python-multipart

import subprocess, time, urllib.request, os

# Tải file worker từ GitHub hoặc tạo trực tiếp
!wget -q -nc https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O cloudflared
!chmod +x cloudflared

# Khởi động worker
worker_proc = subprocess.Popen(["python", "-m", "uvicorn", "voice_worker:app", "--host", "0.0.0.0", "--port", "8020"])
time.sleep(3)

# Khởi động tunnel
tunnel_proc = subprocess.Popen(["./cloudflared", "tunnel", "--url", "http://localhost:8020"], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

for line in tunnel_proc.stdout:
    if "trycloudflare.com" in line:
        for word in line.split():
            if "trycloudflare.com" in word and "https://" in word:
                url = word.strip()
                print("=" * 65)
                print(f"🎉 GPU WORKER ĐÃ SẴN SÀNG: {url}")
                print(f'Thêm vào file .env của DubbingStation: VOICE_WORKER_URL="{url}"')
                print("=" * 65)
                break
```
"""

import os
import sys

if __name__ == "__main__":
    print("======================================================================")
    print("DUBBINGSTATION HYBRID VOICE WORKER (COLAB LAUNCHER)")
    print("======================================================================")
    print("1. Hãy mở Google Colab tại: https://colab.research.google.com")
    print("2. Tải file 'scripts/colab_hybrid_worker.ipynb' lên Colab.")
    print("3. Chọn Runtime -> T4 GPU và bấm Run All.")
    print("4. Sao chép URL 'https://xxxx.trycloudflare.com' vào file .env của bạn:")
    print('   VOICE_WORKER_URL="https://xxxx.trycloudflare.com"')
    print("======================================================================")

