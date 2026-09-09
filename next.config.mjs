/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['ffmpeg-static', 'onnxruntime-node', '@huggingface/transformers', 'ws', 'edge-tts-universal'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'onnxruntime-node', '@huggingface/transformers', 'ws', 'edge-tts-universal'];
    } else {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        child_process: false,
        'onnxruntime-node': false,
        '@huggingface/transformers': false,
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
};

export default nextConfig;
