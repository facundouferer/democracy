import { NextRequest } from 'next/server';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Diputado from '@/models/Diputado';
import Proyecto from '@/models/Proyecto';
import * as cheerio from 'cheerio';

interface ProyectoScrapeado {
  expediente: string;
  tipo: string;
  sumario: string;
  fecha: Date;
  enlace: string;
  tipoFirmante: 'firmante' | 'cofirmante';
}

// Función para obtener proyectos de una página específica
async function obtenerProyectosPagina(slug: string, tipoFirmante: 'firmante' | 'cofirmante', pagina: number): Promise<{ proyectos: ProyectoScrapeado[], totalPaginas: number, totalProyectos: number }> {
  const url = `https://www.diputados.gov.ar/diputados/${slug}/listado-proyectos.html?tipoFirmante=${tipoFirmante}&pagina=${pagina}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} para ${url}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Obtener información de paginación
  const textoProyectos = $('.textoPaginador').first().text();
  const matchProyectos = textoProyectos.match(/(\d+)\s+Proyectos?\s+Encontrados?/i);
  const matchPaginas = textoProyectos.match(/Página\s+\d+\s+de\s+(\d+)/i);

  const totalProyectos = matchProyectos ? parseInt(matchProyectos[1]) : 0;
  const totalPaginas = matchPaginas ? parseInt(matchPaginas[1]) : 1;

  const proyectos: ProyectoScrapeado[] = [];

  // Extraer proyectos de la tabla
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
      } catch (error) {
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

    } catch (error) {
      // Continuar con la siguiente fila
    }
  });

  return { proyectos, totalPaginas, totalProyectos };
}

// Función para obtener proyectos de un diputado específico (todas las páginas)
async function obtenerProyectosDiputado(slug: string, diputadoId: string, diputadoNombre: string, reintentos = 3): Promise<ProyectoScrapeado[]> {
  const proyectos: ProyectoScrapeado[] = [];
  const tiposFirmante: ('firmante' | 'cofirmante')[] = ['firmante', 'cofirmante'];

  for (const tipoFirmante of tiposFirmante) {
    let exitoso = false;

    for (let intento = 1; intento <= reintentos && !exitoso; intento++) {
      try {
        console.log(`[PROYECTOS] Scrapeando ${tipoFirmante} para ${diputadoNombre} - Intento ${intento}/${reintentos}`);

        // Delay para evitar rate limiting
        if (intento > 1) {
          const delay = 2000 + Math.random() * 3000; // 2-5 segundos
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Primero obtener la primera página para saber cuántas páginas hay
        const primeraPagina = await obtenerProyectosPagina(slug, tipoFirmante, 1);

        if (primeraPagina.totalProyectos === 0) {
          console.log(`[PROYECTOS] No se encontraron proyectos como ${tipoFirmante} para ${diputadoNombre}`);
          exitoso = true;
          break;
        }

        console.log(`[PROYECTOS] ${diputadoNombre} - ${tipoFirmante}: ${primeraPagina.totalProyectos} proyectos en ${primeraPagina.totalPaginas} páginas`);

        // Agregar proyectos de la primera página
        proyectos.push(...primeraPagina.proyectos);

        // Obtener el resto de las páginas
        for (let pagina = 2; pagina <= primeraPagina.totalPaginas; pagina++) {
          try {
            console.log(`[PROYECTOS] ${diputadoNombre} - ${tipoFirmante}: Página ${pagina}/${primeraPagina.totalPaginas}`);

            // Delay entre páginas
            await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400)); // 0.8-1.2 segundos

            const paginaData = await obtenerProyectosPagina(slug, tipoFirmante, pagina);
            proyectos.push(...paginaData.proyectos);

          } catch (error) {
            console.warn(`[PROYECTOS] Error en página ${pagina} para ${diputadoNombre} (${tipoFirmante}):`, error);
            // Continuar con la siguiente página en caso de error
          }
        }

        const proyectosTipo = proyectos.filter(p => p.tipoFirmante === tipoFirmante);
        console.log(`[PROYECTOS] Completado ${tipoFirmante} para ${diputadoNombre}: ${proyectosTipo.length} proyectos extraídos`);
        exitoso = true;

      } catch (error) {
        if (intento < reintentos) {
          console.warn(`Error en intento ${intento}/${reintentos} para ${diputadoNombre} (${tipoFirmante}):`, error);
          continue;
        } else {
          console.error(`Error final obteniendo proyectos de ${diputadoNombre} (${tipoFirmante}):`, error);
          break;
        }
      }
    }

    // Delay entre tipos de firmante
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  return proyectos;
}

export async function POST(request: NextRequest) {
  // Validar API Key
  if (!validateApiKey(request)) {
    return createUnauthorizedResponse();
  }

  try {
    console.log('[SYNC-PROYECTOS] Iniciando sincronización de proyectos...');

    // Conectar a MongoDB
    await connectDB();

    // Obtener parámetros opcionales
    const body = await request.json().catch(() => ({}));
    const { limiteDiputados = 10, soloActivos = true } = body;

    // Construir filtros para diputados
    interface FiltrosDiputados {
      estado?: string;
    }
    const filtrosDiputados: FiltrosDiputados = {};
    if (soloActivos) {
      filtrosDiputados.estado = 'activo';
    }

    // Obtener diputados para procesar
    const diputados = await Diputado.find(filtrosDiputados)
      .select('_id nombre slug')
      .limit(limiteDiputados)
      .lean();

    if (diputados.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No se encontraron diputados para procesar'
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SYNC-PROYECTOS] Procesando ${diputados.length} diputados...`);

    let proyectosProcesados = 0;
    let proyectosNuevos = 0;
    let errores = 0;

    // Procesar cada diputado
    for (let i = 0; i < diputados.length; i++) {
      const diputado = diputados[i];

      try {
        console.log(`[SYNC-PROYECTOS] Procesando ${i + 1}/${diputados.length}: ${diputado.nombre}`);

        // Obtener proyectos del diputado
        const proyectosObtenidos = await obtenerProyectosDiputado(
          diputado.slug,
          String(diputado._id),
          diputado.nombre
        );

        // Guardar proyectos en la base de datos
        for (const proyectoData of proyectosObtenidos) {
          try {
            const proyecto = new Proyecto({
              ...proyectoData,
              diputadoId: diputado._id,
              diputadoNombre: diputado.nombre,
              diputadoSlug: diputado.slug
            });

            await proyecto.save();
            proyectosNuevos++;

          } catch (saveError: unknown) {
            interface MongoError extends Error {
              code?: number;
            }

            if (saveError instanceof Error && 'code' in saveError && (saveError as MongoError).code === 11000) {
              // Proyecto duplicado, ignorar
              console.log(`[SYNC-PROYECTOS] Proyecto duplicado: ${proyectoData.expediente}`);
            } else {
              console.error(`[SYNC-PROYECTOS] Error guardando proyecto ${proyectoData.expediente}:`, saveError);
              errores++;
            }
          }
        }

        proyectosProcesados += proyectosObtenidos.length;

        // Delay entre diputados para evitar sobrecargar el servidor
        if (i < diputados.length - 1) {
          const delay = 3000 + Math.random() * 2000; // 3-5 segundos
          console.log(`[SYNC-PROYECTOS] Esperando ${Math.round(delay / 1000)}s antes del siguiente diputado...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (error) {
        console.error(`[SYNC-PROYECTOS] Error procesando diputado ${diputado.nombre}:`, error);
        errores++;
      }
    }

    // Obtener estadísticas finales
    const totalProyectosDB = await Proyecto.countDocuments();
    const tiposProyectos = await Proyecto.aggregate([
      { $group: { _id: '$tipo', cantidad: { $sum: 1 } } },
      { $sort: { cantidad: -1 } }
    ]);

    console.log('[SYNC-PROYECTOS] Sincronización completada');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sincronización de proyectos completada',
        estadisticas: {
          diputadosProcesados: diputados.length,
          proyectosProcesados,
          proyectosNuevos,
          errores,
          totalProyectosEnDB: totalProyectosDB,
          tiposProyectos: tiposProyectos.map(t => ({ tipo: t._id, cantidad: t.cantidad }))
        },
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[SYNC-PROYECTOS] Error general:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error en la sincronización de proyectos',
        details: error instanceof Error ? error.message : 'Error desconocido'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
