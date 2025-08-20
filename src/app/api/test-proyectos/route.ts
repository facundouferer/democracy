import { NextRequest } from 'next/server';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/auth';
import * as cheerio from 'cheerio';

interface DebugInfo {
  urlFirmante: string;
  urlCofirmante: string;
  responseFirmante: {
    ok: boolean;
    status: number;
    contentType: string | null;
  };
  htmlSample?: string;
  textoPaginadorCompleto?: string;
  estrategias?: {
    paginador: number;
    tabla: number;
    divs: number;
    textoLey: number;
    enlaces: number;
    expedientes: number;
  };
  metodoUsado?: string;
  resultadoFinal?: number;
  error?: string;
}

// Función de test para proyectos (copiada y mejorada del sync)
async function obtenerProyectosLeyTest(slug: string): Promise<{
  proyectosLeyFirmante?: number;
  proyectosLeyCofirmante?: number;
  debug: DebugInfo;
}> {
  try {
    console.log(`[TEST] Obteniendo proyectos para: ${slug}`);

    // URLs correctas basadas en el patrón del sitio web
    const urlFirmante = `https://www.hcdn.gob.ar/diputados/${slug}/listado-proyectos.html?tipoFirmante=firmante`;
    const urlCofirmante = `https://www.hcdn.gob.ar/diputados/${slug}/listado-proyectos.html?tipoFirmante=cofirmante`;

    console.log(`[TEST] URLs corregidas: 
    - Firmante: ${urlFirmante}
    - Cofirmante: ${urlCofirmante}`);

    const responseFirmante = await fetch(urlFirmante, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': `https://www.hcdn.gob.ar/diputados/${slug}`,
        'Cache-Control': 'no-cache'
      }
    });

    const debugInfo: DebugInfo = {
      urlFirmante,
      urlCofirmante,
      responseFirmante: {
        ok: responseFirmante.ok,
        status: responseFirmante.status,
        contentType: responseFirmante.headers.get('content-type')
      }
    };

    let proyectosLeyFirmante = 0;

    if (responseFirmante.ok) {
      const htmlFirmante = await responseFirmante.text();
      const $firmante = cheerio.load(htmlFirmante);

      // Debug: capturar HTML parcial
      debugInfo.htmlSample = htmlFirmante.substring(0, 500) + '...';

      // Estrategia principal: buscar texto "X Proyectos Encontrados"
      const textoPaginador = $firmante('.textoPaginador').text();
      const matchProyectos = textoPaginador.match(/(\d+)\s+Proyectos?\s+Encontrados?/i);

      const estrategias = {
        paginador: matchProyectos ? parseInt(matchProyectos[1], 10) : 0,
        tabla: $firmante('table tbody tr').length,
        divs: $firmante('.resultado, .proyecto, .resultado-busqueda').length,
        textoLey: $firmante('*:contains("Proyecto de Ley"), *:contains("LEY")').length,
        enlaces: $firmante('a[href*="proyecto"], a[href*="expediente"]').length,
        expedientes: (htmlFirmante.match(/\d{4}-[A-Z]-\d{4}/g) || []).length
      };

      debugInfo.estrategias = estrategias;
      debugInfo.textoPaginadorCompleto = textoPaginador;

      // Usar la estrategia principal (paginador) o fallback a tabla
      if (estrategias.paginador > 0) {
        proyectosLeyFirmante = estrategias.paginador;
        debugInfo.metodoUsado = 'paginador';
      } else if (estrategias.tabla > 0) {
        proyectosLeyFirmante = estrategias.tabla;
        debugInfo.metodoUsado = 'tabla';
      } else if (estrategias.enlaces > 0) {
        proyectosLeyFirmante = estrategias.enlaces;
        debugInfo.metodoUsado = 'enlaces';
      }

      debugInfo.resultadoFinal = proyectosLeyFirmante;
    } return {
      proyectosLeyFirmante,
      proyectosLeyCofirmante: 0, // Solo testear firmante por ahora
      debug: debugInfo
    };

  } catch (error) {
    return {
      proyectosLeyFirmante: 0,
      proyectosLeyCofirmante: 0,
      debug: {
        urlFirmante: '',
        urlCofirmante: '',
        responseFirmante: { ok: false, status: 0, contentType: null },
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    };
  }
}

export async function GET(request: NextRequest) {
  // Validar API key
  const authResult = validateApiKey(request);
  if (!authResult) {
    return createUnauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug') || 'sacevedo'; // Default para test

    console.log(`[TEST] Iniciando test de proyectos para slug: ${slug}`);

    const resultado = await obtenerProyectosLeyTest(slug);

    return Response.json({
      success: true,
      slug,
      resultado,
      mensaje: `Test completado para diputado: ${slug}`
    });

  } catch (error) {
    console.error('[TEST] Error en test de proyectos:', error);

    return Response.json(
      {
        success: false,
        error: 'Error en test de proyectos',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
