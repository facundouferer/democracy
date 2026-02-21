import crypto from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'admin_session';
const SESSION_HOURS = 12;

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error('Falta ADMIN_SESSION_SECRET en variables de entorno');
  }
  return secret;
}

type SessionPayload = {
  email: string;
  exp: number;
};

function base64UrlEncode(value: string): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, 'base64').toString('utf8');
}

function sign(data: string): string {
  const sessionSecret = getSessionSecret();
  return crypto
    .createHmac('sha256', sessionSecret)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function safeEqualsBase64Url(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

function createToken(email: string): string {
  const payload: SessionPayload = {
    email,
    exp: Date.now() + SESSION_HOURS * 60 * 60 * 1000,
  };
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(payloadEncoded);
  return `${payloadEncoded}.${signature}`;
}

function verifyToken(token: string): SessionPayload | null {
  const [payloadEncoded, signature] = token.split('.');

  if (!payloadEncoded || !signature) {
    return null;
  }

  const expected = sign(payloadEncoded);
  if (!safeEqualsBase64Url(expected, signature)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(payloadEncoded)) as SessionPayload;
    if (payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function createAdminSession(email: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createToken(email), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_HOURS * 60 * 60,
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getAdminSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

export async function requireAdminSession(): Promise<SessionPayload> {
  const session = await getAdminSession();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}
