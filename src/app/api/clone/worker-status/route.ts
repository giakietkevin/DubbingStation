import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const workerUrl = process.env.VOICE_WORKER_URL || process.env.XTTS_API_URL || '';

  if (!workerUrl || !workerUrl.trim().startsWith('http')) {
    return NextResponse.json({
      online: false,
      configured: false,
      workerUrl: null,
      mode: 'LOCAL_HYBRID',
      title: 'Local Hybrid Timbre Transfer',
      description: 'Hệ thống đang hoạt động ở chế độ Local Neural Timbre Transfer (0.4s phản hồi, không cần GPU rời).',
    });
  }

  const cleanUrl = workerUrl.trim().replace(/\/$/, '');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const startTime = Date.now();
    const res = await fetch(`${cleanUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const latencyMs = Date.now() - startTime;

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        online: true,
        configured: true,
        workerUrl: cleanUrl,
        mode: 'GPU_WORKER',
        title: data.gpu_name || 'Deep Learning GPU Worker',
        latencyMs,
        isGpu: Boolean(data.is_gpu),
        gpuName: data.gpu_name || 'GPU Server',
        vramMb: data.vram_mb || 0,
        device: data.device || 'cuda',
        cachedVoicesCount: data.cached_voices_count || 0,
        xttsReady: Boolean(data.xtts_ready),
        vivosReady: Boolean(data.piper_vivos_ready),
        supportedDatasets: data.supported_datasets || ['VIVOS', 'VietTTS'],
        description: `GPU Worker đang hoạt động trực tuyến (${data.device?.toUpperCase() || 'GPU'}, ${latencyMs}ms).`,
      });
    }

    return NextResponse.json({
      online: false,
      configured: true,
      workerUrl: cleanUrl,
      mode: 'LOCAL_HYBRID',
      title: 'Worker không phản hồi (Mã lỗi: ' + res.status + ')',
      description: 'Đã tự động kích hoạt chế độ dự phòng Local Hybrid Engine.',
    });
  } catch (err: any) {
    return NextResponse.json({
      online: false,
      configured: true,
      workerUrl: cleanUrl,
      mode: 'LOCAL_HYBRID',
      title: 'Worker Ngoại Tuyến (Offline)',
      description: 'Không thể kết nối đến GPU Worker. Tự động chuyển tiếp sang Local Hybrid Timbre Transfer.',
      error: err?.message || 'Connection timeout',
    });
  }
}
