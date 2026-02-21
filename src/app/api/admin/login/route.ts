import { NextResponse } from 'next/server';

import { createAdminSession } from '@/lib/admin-auth';
import { ensureDefaultAdminUser, validateAdminCredentials } from '@/lib/admin-users';
import { assertSameOrigin, getClientFingerprint } from '@/lib/security';

type LoginAttempt = {
  count: number;
  firstAttempt: number;
  blockedUntil: number;
};

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 8;
const BLOCK_FOR_MS = 30 * 60 * 1000;

const loginAttempts = new Map<string, LoginAttempt>();

function isEmailFormat(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getAttemptRecord(fingerprint: string): LoginAttempt {
  const now = Date.now();
  const existing = loginAttempts.get(fingerprint);

  if (!existing) {
    const created: LoginAttempt = { count: 0, firstAttempt: now, blockedUntil: 0 };
    loginAttempts.set(fingerprint, created);
    return created;
  }

  if (existing.firstAttempt + LOGIN_WINDOW_MS < now) {
    existing.count = 0;
    existing.firstAttempt = now;
  }

  return existing;
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const fingerprint = getClientFingerprint(request);
    const attempts = getAttemptRecord(fingerprint);
    const now = Date.now();

    if (attempts.blockedUntil > now) {
      return NextResponse.json(
        { ok: false, message: 'Demasiados intentos. Probá nuevamente más tarde.' },
        { status: 429 }
      );
    }

    const body = (await request.json()) as { email?: string; password?: string };
    const email = (body.email ?? '').trim().toLowerCase();
    const password = (body.password ?? '').trim();

    if (!isEmailFormat(email) || password.length < 8 || password.length > 200) {
      return NextResponse.json(
        { ok: false, message: 'Credenciales inválidas' },
        { status: 400 }
      );
    }

    await ensureDefaultAdminUser();

    if (!(await validateAdminCredentials(email, password))) {
      attempts.count += 1;
      if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
        attempts.blockedUntil = now + BLOCK_FOR_MS;
      }

      return NextResponse.json(
        { ok: false, message: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    loginAttempts.delete(fingerprint);
    await createAdminSession(email);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN_CSRF') {
      return NextResponse.json({ ok: false, message: 'Origen inválido' }, { status: 403 });
    }

    if (
      error instanceof Error &&
      (error.message.includes('ADMIN_SESSION_SECRET') ||
        error.message.includes('ADMIN_DEFAULT_EMAIL') ||
        error.message.includes('ADMIN_DEFAULT_PASSWORD') ||
        error.message.includes('MONGODB_URI'))
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'Error de configuración del servidor. Revisá variables de entorno del administrador.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: false, message: 'No se pudo iniciar sesión' },
      { status: 500 }
    );
  }
}
