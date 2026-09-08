FROM node:20-bookworm-slim

ENV NODE_ENV=production \
    PORT=7860 \
    HOSTNAME=0.0.0.0 \
    DATABASE_URL=file:/data/dev.db \
    PYTHONUNBUFFERED=1 \
    PIPER_MODELS_DIR=/app/models/piper

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg python3 python3-pip \
    && python3 -m pip install --no-cache-dir --break-system-packages piper-tts \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY next.config.mjs tsconfig.json next-env.d.ts postcss.config.mjs tailwind.config.ts ./
COPY src ./src
COPY public ./public
COPY models ./models

RUN npx prisma generate \
    && npm run build \
    && mkdir -p /data public/generated \
    && chmod -R a+rwX /data public/generated

EXPOSE 7860

CMD ["sh", "-c", "npx prisma db push --skip-generate && npm start"]