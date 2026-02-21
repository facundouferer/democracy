import { NextResponse } from 'next/server';

import { requireAdminSession } from '@/lib/admin-auth';
import connectDB from '@/lib/mongodb';
import { scrapeDiputados } from '@/lib/scrape-diputados';
import { scrapeSenadores } from '@/lib/scrape-senadores';
import { assertSameOrigin } from '@/lib/security';
import Diputado from '@/models/Diputado';
import Senador from '@/models/Senador';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireAdminSession();
    await connectDB();

    const diputados = await scrapeDiputados();
    const senadores = await scrapeSenadores();

    if (diputados.length === 0 || senadores.length === 0) {
      return NextResponse.json(
        { ok: false, message: 'El scraping no devolvió datos completos de ambas cámaras' },
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

    const diputadosResult = await Diputado.bulkWrite(operations, { ordered: false });

    const senadoresOps = senadores.map((senador) => ({
      updateOne: {
        filter: { link: senador.link },
        update: {
          $set: {
            nombre: senador.nombre,
            distrito: senador.distrito,
            bloque: senador.bloque,
            mandato: senador.mandato,
            total_proyectos: senador.total_proyectos,
            foto: senador.foto,
            link: senador.link,
            fechaActualizacion: now,
          },
        },
        upsert: true,
      },
    }));

    const senadoresResult = await Senador.bulkWrite(senadoresOps, { ordered: false });

    return NextResponse.json({
      ok: true,
      totalScrapeados: diputados.length + senadores.length,
      diputados: {
        totalScrapeados: diputados.length,
        creados: diputadosResult.upsertedCount,
        modificados: diputadosResult.modifiedCount,
      },
      senadores: {
        totalScrapeados: senadores.length,
        creados: senadoresResult.upsertedCount,
        modificados: senadoresResult.modifiedCount,
      },
      fecha: now.toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN_CSRF') {
      return NextResponse.json({ ok: false, message: 'Origen inválido' }, { status: 403 });
    }

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
