import { verifyJWT } from '@/lib/jwt';
import { getJwtSecret } from '@/lib/env';

export async function getAuthPayload(req: Request): Promise<{ userId: string; username: string } | null> {
  const cookieHeader = req.headers.get('Cookie') || '';
  const tokenCookie = cookieHeader.split(';').find(c => c.trim().startsWith('morango_auth_token='));
  if (!tokenCookie) return null;

  const token = tokenCookie.split('=')[1]?.trim();
  if (!token) return null;

  try {
    const payload = await verifyJWT(token, getJwtSecret());
    if (!payload?.userId) return null;
    return { userId: payload.userId, username: payload.username };
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request): Promise<{ userId: string; username: string } | null> {
  return getAuthPayload(req);
}

export function verifyWebhookSecret(req: Request, envKey: string, headerName = 'x-webhook-secret'): boolean {
  const secret = process.env[envKey];
  if (!secret || secret.trim() === '') {
    return process.env.NODE_ENV !== 'production';
  }

  const headerSecret = req.headers.get(headerName);
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  return headerSecret === secret || bearer === secret;
}

export function verifyApiKey(req: Request, envKey: string): boolean {
  const apiKey = process.env[envKey];
  if (!apiKey || apiKey.trim() === '') {
    return process.env.NODE_ENV !== 'production';
  }

  const headerKey = req.headers.get('x-api-key');
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  return headerKey === apiKey || bearer === apiKey;
}
