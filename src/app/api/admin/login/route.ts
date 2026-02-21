import { NextResponse } from 'next/server';

import { createAdminSession } from '@/lib/admin-auth';
import { ensureDefaultAdminUser, validateAdminCredentials } from '@/lib/admin-users';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = (body.email ?? '').trim();
    const password = body.password ?? '';

    await ensureDefaultAdminUser();

    if (!(await validateAdminCredentials(email, password))) {
      return NextResponse.json(
        { ok: false, message: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    await createAdminSession(email);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, message: 'No se pudo iniciar sesión' },
      { status: 400 }
    );
  }
}
