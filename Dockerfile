FROM node:20-bookworm-slim

ENV NODE_ENV=production \
    PORT=7860 \
    HOSTNAME=0.0.0.0 \
    DATABASE_URL=file:/data/dev.db \
    GENERATED_DIR=/data/generated \
    USER_VOICES_DIR=/data/user-voices \
    PYTHONUNBUFFERED=1 \
    PIPER_MODELS_DIR=/app/models/piper \
    COQUI_TOS_AGREED=1 \
    TTS_HOME=/data/tts-cache

COPY requirements-xtts.txt /tmp/requirements-xtts.txt

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ffmpeg \
        python3 \
        python3-pip \
        python3-dev \
        build-essential \
        libsndfile1 \
        git \
    && python3 -m pip install --no-cache-dir --break-system-packages piper-tts \
    && python3 -m pip install --no-cache-dir --break-system-packages -r /tmp/requirements-xtts.txt \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY scripts ./scripts
COPY next.config.mjs tsconfig.json next-env.d.ts postcss.config.mjs tailwind.config.ts ./
COPY src ./src
COPY public ./public
COPY models ./models

RUN npx prisma generate \
    && npm run build \
    && mkdir -p /data/generated /data/tts-cache /data/user-voices public/generated public/user-voices \
    && chmod -R a+rwX /data/generated /data/tts-cache /data/user-voices public/generated public/user-voices

EXPOSE 7860

CMD ["sh", "-c", "mkdir -p /data/generated /data/tts-cache /data/user-voices && npx prisma db push --skip-generate && npm start"]