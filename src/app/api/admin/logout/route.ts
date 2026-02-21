import { NextResponse } from 'next/server';

import { clearAdminSession } from '@/lib/admin-auth';
import { assertSameOrigin } from '@/lib/security';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await clearAdminSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN_CSRF') {
      return NextResponse.json({ ok: false, message: 'Origen inválido' }, { status: 403 });
    }

    return NextResponse.json({ ok: false, message: 'No se pudo cerrar sesión' }, { status: 400 });
  }
}
