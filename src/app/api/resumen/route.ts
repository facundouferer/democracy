import { NextResponse } from 'next/server';

import { generateResumenWithGemini } from '@/lib/gemini';
import connectDB from '@/lib/mongodb';
import { assertSameOrigin } from '@/lib/security';
import Diputado from '@/models/Diputado';
import Senador from '@/models/Senador';

type ResumenRequestBody = {
  tipo?: 'diputado' | 'senador';
  slug?: string;
  link?: string;
  nombre?: string;
  apellido?: string;
  distrito?: string;
  bloque?: string;
  mandato?: string;
  profesion?: string;
  fecha_nacimiento?: string;
  total_proyectos?: number;
  foto?: string;
};

function normalizeText(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function toTitleCase(value: string | undefined): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/\b([a-záéíóúüñ])/gi, (char) => char.toUpperCase());
}

function buildFallbackResumen(input: {
  tipo: 'diputado' | 'senador';
  nombre: string;
  apellido?: string;
  distrito: string;
  bloque: string;
  mandato?: string;
}): string {
  const fullName =
    input.tipo === 'diputado'
      ? `${normalizeText(input.nombre)} ${normalizeText(input.apellido)}`
      : normalizeText(input.nombre);
  const role =
    input.tipo === 'diputado' ? 'diputada o diputado nacional' : 'senadora o senador nacional';
  const mandato = normalizeText(input.mandato);

  const text = `${normalizeText(fullName)} es ${role} por la provincia de ${toTitleCase(input.distrito)} e integra el bloque ${toTitleCase(input.bloque)}${mandato ? `, con mandato ${mandato}` : ''}. En su rol parlamentario participa en la elaboración, debate y seguimiento de iniciativas legislativas vinculadas a los intereses de su distrito y a la agenda de su espacio político.`;

  if (text.length > 1000) {
    return text.slice(0, 997).trimEnd() + '...';
  }

  return text;
}

function isLegacyResumen(resumen: string): boolean {
  const normalized = normalizeText(resumen).toLowerCase();
  return (
    normalized.startsWith('quien es el o la') ||
    normalized.includes(' argentin ') ||
    normalized.startsWith('quién es la persona diputada o diputado') ||
    normalized.startsWith('quién es la persona senadora o senador')
  );
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await connectDB();

    const body = (await request.json()) as ResumenRequestBody;
    const tipo = body.tipo;

    if (tipo !== 'diputado' && tipo !== 'senador') {
      return NextResponse.json({ ok: false, message: 'Tipo inválido' }, { status: 400 });
    }

    if (tipo === 'diputado') {
      const slug = normalizeText(body.slug);
      if (!slug) {
        return NextResponse.json({ ok: false, message: 'Falta slug de diputado' }, { status: 400 });
      }

      const diputado = await Diputado.findOne({ slug }).exec();
      if (!diputado) {
        return NextResponse.json({ ok: false, message: 'Diputado no encontrado' }, { status: 404 });
      }

      const existingResumen = normalizeText(diputado.resumen);
      if (existingResumen) {
        if (isLegacyResumen(existingResumen)) {
          try {
            const regenerated = await generateResumenWithGemini({
              tipo: 'diputado',
              nombre: diputado.nombre,
              apellido: diputado.apellido,
              distrito: diputado.distrito,
              bloque: diputado.bloque,
              mandato: diputado.mandato,
              profesion: diputado.profesion,
              fecha_nacimiento: diputado.fecha_nacimiento,
              total_proyectos: diputado.total_proyectos,
            });
            diputado.resumen = regenerated;
            await diputado.save();
            return NextResponse.json({ ok: true, resumen: regenerated, cached: false, source: 'gemini' });
          } catch {
            return NextResponse.json({ ok: true, resumen: existingResumen, cached: true, source: 'legacy' });
          }
        }
        return NextResponse.json({ ok: true, resumen: existingResumen, cached: true });
      }

      let resumen = '';
      try {
        resumen = await generateResumenWithGemini({
          tipo: 'diputado',
          nombre: diputado.nombre,
          apellido: diputado.apellido,
          distrito: diputado.distrito,
          bloque: diputado.bloque,
          mandato: diputado.mandato,
          profesion: diputado.profesion,
          fecha_nacimiento: diputado.fecha_nacimiento,
          total_proyectos: diputado.total_proyectos,
        });
        if (isLegacyResumen(resumen)) {
          resumen = buildFallbackResumen({
            tipo: 'diputado',
            nombre: diputado.nombre,
            apellido: diputado.apellido,
            distrito: diputado.distrito,
            bloque: diputado.bloque,
            mandato: diputado.mandato,
          });
        }
        diputado.resumen = resumen;
        await diputado.save();

        return NextResponse.json({ ok: true, resumen, cached: false, source: 'gemini' });
      } catch {
        resumen = buildFallbackResumen({
          tipo: 'diputado',
          nombre: diputado.nombre,
          apellido: diputado.apellido,
          distrito: diputado.distrito,
          bloque: diputado.bloque,
          mandato: diputado.mandato,
        });

        return NextResponse.json({
          ok: true,
          resumen,
          cached: false,
          source: 'fallback',
          persisted: false,
          message:
            'Resumen temporal generado sin IA. No se guardó en base porque Gemini no respondió.',
        });
      }
    }

    const link = normalizeText(body.link);
    if (!link) {
      return NextResponse.json({ ok: false, message: 'Falta link de senador' }, { status: 400 });
    }

    const senadorFound = await Senador.findOne({ link }).exec();
    const existingResumen = normalizeText(senadorFound?.resumen);
    if (existingResumen) {
      if (senadorFound && isLegacyResumen(existingResumen)) {
        try {
          const regenerated = await generateResumenWithGemini({
            tipo: 'senador',
            nombre: senadorFound.nombre,
            distrito: senadorFound.distrito,
            bloque: senadorFound.bloque,
            mandato: senadorFound.mandato,
            total_proyectos: senadorFound.total_proyectos,
          });
          senadorFound.resumen = regenerated;
          await senadorFound.save();
          return NextResponse.json({ ok: true, resumen: regenerated, cached: false, source: 'gemini' });
        } catch {
          return NextResponse.json({ ok: true, resumen: existingResumen, cached: true, source: 'legacy' });
        }
      }
      return NextResponse.json({ ok: true, resumen: existingResumen, cached: true });
    }

    const nombre = normalizeText(body.nombre) || normalizeText(senadorFound?.nombre);
    const distrito = normalizeText(body.distrito) || normalizeText(senadorFound?.distrito);
    const bloque = normalizeText(body.bloque) || normalizeText(senadorFound?.bloque);
    const mandato = normalizeText(body.mandato) || normalizeText(senadorFound?.mandato);
    const foto = normalizeText(body.foto) || normalizeText(senadorFound?.foto);
    const total_proyectos = Number(
      body.total_proyectos ?? senadorFound?.total_proyectos ?? 0
    );

    if (!nombre || !distrito || !bloque || !mandato) {
      return NextResponse.json(
        { ok: false, message: 'Faltan datos para resumir al senador' },
        { status: 400 }
      );
    }

    let resumen = '';
    try {
      resumen = await generateResumenWithGemini({
        tipo: 'senador',
        nombre,
        distrito,
        bloque,
        mandato,
        total_proyectos,
      });
      if (isLegacyResumen(resumen)) {
        resumen = buildFallbackResumen({
          tipo: 'senador',
          nombre,
          distrito,
          bloque,
          mandato,
        });
      }
    } catch {
      resumen = buildFallbackResumen({
        tipo: 'senador',
        nombre,
        distrito,
        bloque,
        mandato,
      });

      return NextResponse.json({
        ok: true,
        resumen,
        cached: false,
        source: 'fallback',
        persisted: false,
        message:
          'Resumen temporal generado sin IA. No se guardó en base porque Gemini no respondió.',
      });
    }

    await Senador.updateOne(
      { link },
      {
        $set: {
          nombre,
          distrito,
          bloque,
          mandato,
          total_proyectos,
          foto,
          link,
          resumen,
          fechaActualizacion: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, resumen, cached: false, source: 'gemini' });
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN_CSRF') {
      return NextResponse.json({ ok: false, message: 'Origen inválido' }, { status: 403 });
    }

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Error al generar resumen',
      },
      { status: 500 }
    );
  }
}
