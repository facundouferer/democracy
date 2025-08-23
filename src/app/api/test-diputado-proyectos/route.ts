import { NextRequest } from 'next/server';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Diputado from '@/models/Diputado';
import Proyecto from '@/models/Proyecto';
import * as cheerio from 'cheerio';

interface DiputadoData {
  _id: string;
  nombre: string;
  slug: string;
}

interface ResultadoTipo {
  totalProyectos?: number;
  totalPaginas?: number;
  proyectosEnDB?: number;
  muestrasPaginas?: Array<{
    pagina: number;
    proyectosExtraidos?: number;
    muestra?: Array<{
      expediente: string;
      tipo: string;
      fecha: Date;
    }>;
    error?: string;
  }>;
  error?: string;
}

interface ProyectoScrapeado {
  expediente: string;
  tipo: string;
  sumario: string;
  fecha: Date;
  enlace: string;
  tipoFirmante: 'firmante' | 'cofirmante';
}

// Función para obtener información de paginación
async function obtenerInfoPaginacion(slug: string, tipoFirmante: 'firmante' | 'cofirmante'): Promise<{ totalProyectos: number, totalPaginas: number }> {
  const url = `https://www.diputados.gov.ar/diputados/${slug}/listado-proyectos.html?tipoFirmante=${tipoFirmante}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} para ${url}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const textoProyectos = $('.textoPaginador').first().text();
  const matchProyectos = textoProyectos.match(/(\d+)\s+Proyectos?\s+Encontrados?/i);
  const matchPaginas = textoProyectos.match(/Página\s+\d+\s+de\s+(\d+)/i);

  const totalProyectos = matchProyectos ? parseInt(matchProyectos[1]) : 0;
  const totalPaginas = matchPaginas ? parseInt(matchPaginas[1]) : 1;

  return { totalProyectos, totalPaginas };
}

// Función para obtener proyectos de una página específica
async function obtenerProyectosPagina(slug: string, tipoFirmante: 'firmante' | 'cofirmante', pagina: number): Promise<ProyectoScrapeado[]> {
  const url = `https://www.diputados.gov.ar/diputados/${slug}/listado-proyectos.html?tipoFirmante=${tipoFirmante}&pagina=${pagina}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} para ${url}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const proyectos: ProyectoScrapeado[] = [];
  const filasProyectos = $('#tablesorter tbody tr');

  filasProyectos.each((index, elemento) => {
    try {
      const $fila = $(elemento);

      // Extraer expediente y enlace
      const $enlaceExpediente = $fila.find('td').first().find('a');
      const expediente = $enlaceExpediente.text().trim();
      const enlaceRelativo = $enlaceExpediente.attr('href');

      if (!expediente || !enlaceRelativo) {
        return;
      }

      const enlace = enlaceRelativo.startsWith('http')
        ? enlaceRelativo
        : `https://www.diputados.gov.ar/diputados/${slug}/${enlaceRelativo}`;

      // Extraer tipo
      const tipo = $fila.find('td').eq(1).text().trim();

      // Extraer sumario
      const sumario = $fila.find('td').eq(2).text().trim();

      // Extraer y parsear fecha
      const fechaTexto = $fila.find('td').eq(3).text().trim();
      let fecha: Date;

      try {
        // Formato esperado: DD/MM/YYYY
        const [dia, mes, año] = fechaTexto.split('/');
        fecha = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia));

        if (isNaN(fecha.getTime())) {
          throw new Error('Fecha inválida');
        }
      } catch {
        return;
      }

      // Validar que todos los campos estén presentes
      if (!tipo || !sumario) {
        return;
      }

      proyectos.push({
        expediente,
        tipo,
        sumario,
        fecha,
        enlace,
        tipoFirmante
      });

    } catch {
      // Continuar con la siguiente fila
    }
  });

  return proyectos;
}

export async function POST(request: NextRequest) {
  // Validar API Key
  if (!validateApiKey(request)) {
    return createUnauthorizedResponse();
  }

  try {
    await connectDB();

    const body = await request.json();
    const { slug, maxPaginas = 5, soloInfo = false } = body;

    if (!slug) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Se requiere el slug del diputado'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Buscar el diputado
    const diputado = await Diputado.findOne({ slug }).lean() as DiputadoData | null;
    if (!diputado) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Diputado con slug '${slug}' no encontrado`
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[TEST-DIPUTADO] Analizando ${diputado.nombre} (${slug})`);

    const tiposFirmante: ('firmante' | 'cofirmante')[] = ['firmante', 'cofirmante'];
    const resultados = {
      diputado: {
        nombre: diputado.nombre,
        slug: slug
      },
      tipos: {} as Record<string, ResultadoTipo>
    };

    for (const tipoFirmante of tiposFirmante) {
      try {
        console.log(`[TEST-DIPUTADO] Obteniendo info de ${tipoFirmante}...`);

        const info = await obtenerInfoPaginacion(slug, tipoFirmante);

        resultados.tipos[tipoFirmante] = {
          totalProyectos: info.totalProyectos,
          totalPaginas: info.totalPaginas,
          proyectosEnDB: 0,
          muestrasPaginas: []
        };

        // Contar proyectos existentes en la BD
        const proyectosEnDB = await Proyecto.countDocuments({
          diputadoSlug: slug,
          tipoFirmante: tipoFirmante
        });

        resultados.tipos[tipoFirmante].proyectosEnDB = proyectosEnDB;

        if (!soloInfo && info.totalProyectos > 0) {
          // Obtener muestra de algunas páginas
          const paginasAProbar = Math.min(maxPaginas, info.totalPaginas);

          for (let pagina = 1; pagina <= paginasAProbar; pagina++) {
            try {
              console.log(`[TEST-DIPUTADO] Probando página ${pagina}/${info.totalPaginas} de ${tipoFirmante}...`);

              const proyectosPagina = await obtenerProyectosPagina(slug, tipoFirmante, pagina);

              if (!resultados.tipos[tipoFirmante].muestrasPaginas) {
                resultados.tipos[tipoFirmante].muestrasPaginas = [];
              }

              resultados.tipos[tipoFirmante].muestrasPaginas.push({
                pagina: pagina,
                proyectosExtraidos: proyectosPagina.length,
                muestra: proyectosPagina.slice(0, 3).map(p => ({
                  expediente: p.expediente,
                  tipo: p.tipo,
                  fecha: p.fecha
                }))
              });

              // Delay entre páginas
              if (pagina < paginasAProbar) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }

            } catch (error) {
              if (!resultados.tipos[tipoFirmante].muestrasPaginas) {
                resultados.tipos[tipoFirmante].muestrasPaginas = [];
              }

              resultados.tipos[tipoFirmante].muestrasPaginas.push({
                pagina: pagina,
                error: error instanceof Error ? error.message : 'Error desconocido'
              });
            }
          }
        }

      } catch (error) {
        resultados.tipos[tipoFirmante] = {
          error: error instanceof Error ? error.message : 'Error desconocido'
        };
      }

      // Delay entre tipos
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return new Response(
      JSON.stringify({
        success: true,
        resultados,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[TEST-DIPUTADO] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error en el test del diputado',
        details: error instanceof Error ? error.message : 'Error desconocido'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
