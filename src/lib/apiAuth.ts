import { prisma } from '@/lib/prisma';

export interface AuthenticatedUser {
  userId: string;
  email: string | null;
  name: string | null;
  walletBalance: number;
  apiKeyId: string;
}

/**
 * Xác thực API Key từ Header Authorization: Bearer ds_live_xxxx
 */
export async function authenticateApiKey(req: Request): Promise<{
  user: AuthenticatedUser | null;
  error?: string;
  status?: number;
}> {
  const authHeader = req.headers.get('authorization') || req.headers.get('x-api-key');

  if (!authHeader) {
    return {
      user: null,
      error: 'Thiếu API Key xác thực. Vui lòng truyền Authorization: Bearer ds_live_xxxx hoặc x-api-key',
      status: 401,
    };
  }

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : authHeader.trim();

  if (!token.startsWith('ds_live_') && !token.startsWith('ds_test_')) {
    return {
      user: null,
      error: 'Định dạng API Key không hợp lệ. API Key phải bắt đầu bằng ds_live_ hoặc ds_test_',
      status: 401,
    };
  }

  try {
    const apiKeyRecord = await prisma.apiKey.findFirst({
      where: {
        keyHash: token,
        isActive: true,
      },
      include: {
        user: {
          include: {
            wallet: true,
          },
        },
      },
    });

    if (!apiKeyRecord) {
      return {
        user: null,
        error: 'API Key không tồn tại hoặc đã bị vô hiệu hóa.',
        status: 403,
      };
    }

    if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
      return {
        user: null,
        error: 'API Key này đã hết hạn sử dụng.',
        status: 403,
      };
    }

    // Cập nhật thời điểm sử dụng API Key gần nhất (asynchronous)
    prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() },
    }).catch(console.error);

    return {
      user: {
        userId: apiKeyRecord.userId,
        email: apiKeyRecord.user.email,
        name: apiKeyRecord.user.name,
        walletBalance: apiKeyRecord.user.wallet?.balance || 0,
        apiKeyId: apiKeyRecord.id,
      },
    };
  } catch (error) {
    console.error('API Key Auth Exception:', error);
    return {
      user: null,
      error: 'Lỗi máy chủ khi xác thực API Key.',
      status: 500,
    };
  }
}
