import { NextResponse, NextRequest } from 'next/server';
import * as cheerio from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Validar API Key antes de procesar la solicitud
  if (!validateApiKey(request)) {
    return createUnauthorizedResponse();
  }

  try {
    const { slug } = await params;

    console.log(`[AUTH] Solicitud autenticada - Obteniendo detalles de diputado: ${slug}`);

    // Construir la URL del diputado específico
    const url = `https://www.hcdn.gob.ar/diputados/${slug}/`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extraer información detallada del diputado
    const detalles = {
      nombre: $('.nombre-diputado').text().trim() || $('h1').first().text().trim(),
      foto: $('.foto-diputado img').attr('src') || '',
      distrito: $('.distrito').text().trim(),
      bloque: $('.bloque').text().trim(),
      periodo: $('.periodo').text().trim(),
      email: $('a[href^="mailto:"]').attr('href')?.replace('mailto:', '') || '',
      telefono: $('.telefono').text().trim(),
      despacho: $('.despacho').text().trim(),
      biografia: $('.biografia').text().trim(),
      // Intentar extraer información adicional que pueda estar presente
      comisiones: [] as string[],
      proyectos: [] as string[]
    };

    // Extraer comisiones si están presentes
    $('.comisiones li, .comision').each((_, el) => {
      const comision = $(el).text().trim();
      if (comision) {
        detalles.comisiones.push(comision);
      }
    });

    // Extraer proyectos recientes si están presentes
    $('.proyectos li, .proyecto').each((_, el) => {
      const proyecto = $(el).text().trim();
      if (proyecto) {
        detalles.proyectos.push(proyecto);
      }
    });

    // Si la foto es relativa, convertirla a absoluta
    if (detalles.foto && !detalles.foto.startsWith('http')) {
      detalles.foto = `https://www.hcdn.gob.ar${detalles.foto}`;
    }

    return NextResponse.json({
      success: true,
      data: detalles,
      url: url
    });

  } catch (error) {
    console.error('Error en el scraping del diputado:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener la información del diputado',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
