import { requireAdminSession } from '@/lib/admin-auth';
import connectDB from '@/lib/mongodb';
import { scrapeDiputados } from '@/lib/scrape-diputados';
import { assertSafeGetOrigin } from '@/lib/security';
import Diputado from '@/models/Diputado';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function buildEventMessage(event: string, payload: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export async function GET(request: Request) {
  try {
    assertSafeGetOrigin(request);
    await requireAdminSession();
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN_CSRF') {
      return new Response('Origen inválido', { status: 403 });
    }
    return new Response('No autorizado', { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const push = (event: string, payload: unknown) => {
        controller.enqueue(encoder.encode(buildEventMessage(event, payload)));
      };

      try {
        push('start', {
          message: 'Iniciando scraping de diputados...',
          startedAt: new Date().toISOString(),
        });

        await connectDB();

        const diputados = await scrapeDiputados({
          onProgress: async (progress) => {
            push('progress', progress);
          },
        });

        if (diputados.length === 0) {
          push('error', { message: 'El scraping no devolvió diputados.' });
          controller.close();
          return;
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

        push('done', {
          ok: true,
          totalScrapeados: diputados.length,
          creados: result.upsertedCount,
          modificados: result.modifiedCount,
          fecha: now.toISOString(),
        });
      } catch (error) {
        push('error', {
          message: error instanceof Error ? error.message : 'Error inesperado en el scraping',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
