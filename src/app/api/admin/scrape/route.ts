import { NextResponse } from 'next/server';

import { requireAdminSession } from '@/lib/admin-auth';
import connectDB from '@/lib/mongodb';
import { scrapeDiputados } from '@/lib/scrape-diputados';
import Diputado from '@/models/Diputado';

export async function POST() {
  try {
    await requireAdminSession();
    await connectDB();

    const diputados = await scrapeDiputados();

    if (diputados.length === 0) {
      return NextResponse.json(
        { ok: false, message: 'El scraping no devolvió diputados' },
        { status: 502 }
      );
    }

    const now = new Date();

    const operations = diputados.map((diputado) => ({
      updateOne: {
        filter: { slug: diputado.slug },
        update: {
          $set: {
            ...diputado,
            fechaActualizacion: now,
          },
        },
        upsert: true,
      },
    }));

    const result = await Diputado.bulkWrite(operations, { ordered: false });

    return NextResponse.json({
      ok: true,
      totalScrapeados: diputados.length,
      creados: result.upsertedCount,
      modificados: result.modifiedCount,
      fecha: now.toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ ok: false, message: 'No autorizado' }, { status: 401 });
    }

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Error inesperado en scraping',
      },
      { status: 500 }
    );
  }
}
