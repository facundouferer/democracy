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

interface ResultadoScraping {
  proyectos: ProyectoScrapeado[];
  totalPaginas: number;
  totalProyectos: number;
}

// Función mejorada para obtener proyectos de una página con manejo de errores robusto
async function obtenerProyectosPagina(
  slug: string,
  tipoFirmante: 'firmante' | 'cofirmante',
  pagina: number,
  reintentos = 3
): Promise<ResultadoScraping> {
  for (let intento = 1; intento <= reintentos; intento++) {
    try {
      // Delay progresivo en caso de reintentos
      if (intento > 1) {
        const delay = intento * 2000 + Math.random() * 1000; // 2-3s, 4-5s, 6-7s
        console.log(`⏱️ Esperando ${delay}ms antes del intento ${intento}...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const url = `https://www.diputados.gov.ar/diputados/${slug}/listado-proyectos.html?tipoFirmante=${tipoFirmante}&pagina=${pagina}`;

      console.log(`🔍 Obteniendo página ${pagina} de ${tipoFirmante} para ${slug} (intento ${intento}/${reintentos})`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        signal: AbortSignal.timeout(30000) // 30 segundos timeout
      });

      if (!response.ok) {
        if (response.status === 429) { // Rate limit
          throw new Error(`Rate limit - Status ${response.status}`);
        } else if (response.status === 403 || response.status === 502 || response.status === 503) {
          throw new Error(`Server error - Status ${response.status}`);
        } else {
          throw new Error(`HTTP error - Status ${response.status}`);
        }
      }

      const html = await response.text();

      if (!html || html.length < 100) {
        throw new Error('Respuesta HTML vacía o muy corta');
      }

      const $ = cheerio.load(html);

      // Verificar si hay contenido válido
      const tablaProyectos = $('#listadoDeProyectos, table');
      if (tablaProyectos.length === 0) {
        console.warn(`⚠️ No se encontró tabla de proyectos en página ${pagina}`);
        return { proyectos: [], totalPaginas: 1, totalProyectos: 0 };
      }

      // Extraer información de paginación
      let totalProyectos = 0;
      let totalPaginas = 1;

      // Buscar información de paginación en diferentes lugares
      const paginacionTexto = $('.paginador, .pagination, .page-info').text();
      const proyectosMatch = paginacionTexto.match(/(\d+)\s*proyectos?/i);
      const paginasMatch = paginacionTexto.match(/(\d+)\s*páginas?/i);

      if (proyectosMatch) {
        totalProyectos = parseInt(proyectosMatch[1], 10);
      }

      if (paginasMatch) {
        totalPaginas = parseInt(paginasMatch[1], 10);
      }

      // Fallback: contar enlaces de paginación
      if (totalPaginas === 1) {
        const enlacesPagina = $('.paginador a, .pagination a').length;
        if (enlacesPagina > 0) {
          totalPaginas = Math.max(totalPaginas, enlacesPagina);
        }
      }

      const proyectos: ProyectoScrapeado[] = [];

      // Extraer proyectos de la tabla
      $('table tr').each((index, element) => {
        try {
          const $row = $(element);

          // Saltar headers
          if ($row.find('th').length > 0) {
            return;
          }

          const celdas = $row.find('td');
          if (celdas.length < 4) {
            return;
          }

          // Extraer datos según la estructura de la tabla
          const expediente = $(celdas[0]).text().trim();
          const tipo = $(celdas[1]).text().trim();
          const sumario = $(celdas[2]).text().trim();
          const fechaTexto = $(celdas[3]).text().trim();

          // Validar que tenemos datos mínimos
          if (!expediente || !tipo || !sumario) {
            return;
          }

          // Parsear fecha
          let fecha = new Date();
          if (fechaTexto) {
            const partesfecha = fechaTexto.split('/');
            if (partesfecha.length === 3) {
              const dia = parseInt(partesfecha[0], 10);
              const mes = parseInt(partesfecha[1], 10) - 1;
              const año = parseInt(partesfecha[2], 10);

              if (!isNaN(dia) && !isNaN(mes) && !isNaN(año)) {
                fecha = new Date(año, mes, dia);
              }
            }
          }

          // Extraer enlace
          let enlace = '';
          const linkElement = $row.find('a').first();
          if (linkElement.length > 0) {
            enlace = linkElement.attr('href') || '';
            if (enlace && !enlace.startsWith('http')) {
              enlace = `https://www.diputados.gov.ar${enlace}`;
            }
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
          console.warn('Error procesando fila de proyecto:', error);
        }
      });

      console.log(`✅ Página ${pagina}: ${proyectos.length} proyectos extraídos`);

      return { proyectos, totalPaginas, totalProyectos };

    } catch (error) {
      console.error(`❌ Error en intento ${intento}/${reintentos} para página ${pagina}:`, error);

      if (intento === reintentos) {
        console.error(`💥 Error final en página ${pagina} después de ${reintentos} intentos`);
        return { proyectos: [], totalPaginas: 1, totalProyectos: 0 };
      }
    }
  }

  return { proyectos: [], totalPaginas: 1, totalProyectos: 0 };
}

// Función mejorada para obtener todos los proyectos de un diputado con manejo inteligente de paginación
async function obtenerProyectosDiputadoCompleto(
  slug: string,
  diputadoId: string,
  diputadoNombre: string,
  maxPaginas = 100 // Límite de seguridad
): Promise<ProyectoScrapeado[]> {
  console.log(`🚀 Iniciando scraping completo para ${diputadoNombre} (${slug})`);

  const proyectos: ProyectoScrapeado[] = [];
  const tiposFirmante: ('firmante' | 'cofirmante')[] = ['firmante', 'cofirmante'];

  for (const tipoFirmante of tiposFirmante) {
    try {
      console.log(`📋 Procesando ${tipoFirmante} para ${diputadoNombre}...`);

      // Obtener primera página para conocer el total
      const primeraPagina = await obtenerProyectosPagina(slug, tipoFirmante, 1);

      if (primeraPagina.totalProyectos === 0) {
        console.log(`ℹ️ No hay proyectos como ${tipoFirmante} para ${diputadoNombre}`);
        continue;
      }

      const totalPaginas = Math.min(primeraPagina.totalPaginas, maxPaginas);
      console.log(`📊 ${diputadoNombre} - ${tipoFirmante}: ${primeraPagina.totalProyectos} proyectos en ${totalPaginas} páginas`);

      // Agregar proyectos de la primera página
      proyectos.push(...primeraPagina.proyectos);

      // Procesar páginas restantes con control de rate limiting inteligente
      for (let pagina = 2; pagina <= totalPaginas; pagina++) {
        try {
          // Delay progresivo para diputados con muchas páginas
          let delay = 1000; // Base 1 segundo
          if (totalPaginas > 20) {
            delay = 1500; // 1.5 segundos para casos medianos
          }
          if (totalPaginas > 50) {
            delay = 2000; // 2 segundos para casos grandes
          }
          if (totalPaginas > 80) {
            delay = 3000; // 3 segundos para casos muy grandes
          }

          // Añadir variabilidad aleatoria
          delay += Math.random() * 500;

          console.log(`⏳ Esperando ${delay}ms antes de página ${pagina}/${totalPaginas}...`);
          await new Promise(resolve => setTimeout(resolve, delay));

          const paginaData = await obtenerProyectosPagina(slug, tipoFirmante, pagina);
          proyectos.push(...paginaData.proyectos);

          // Log de progreso cada 10 páginas
          if (pagina % 10 === 0) {
            const proyectosTipo = proyectos.filter(p => p.tipoFirmante === tipoFirmante);
            console.log(`📈 Progreso ${tipoFirmante}: ${pagina}/${totalPaginas} páginas, ${proyectosTipo.length} proyectos`);
          }

        } catch (error) {
          console.error(`❌ Error en página ${pagina} para ${diputadoNombre} (${tipoFirmante}):`, error);
          // Continuar con la siguiente página
        }
      }

      const proyectosTipo = proyectos.filter(p => p.tipoFirmante === tipoFirmante);
      console.log(`✅ Completado ${tipoFirmante} para ${diputadoNombre}: ${proyectosTipo.length} proyectos`);

      // Delay entre tipos de firmante
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`💥 Error procesando ${tipoFirmante} para ${diputadoNombre}:`, error);
    }
  }

  console.log(`🎉 Scraping completo para ${diputadoNombre}: ${proyectos.length} proyectos totales`);
  return proyectos;
}

export async function POST(request: NextRequest) {
  try {
    // Validar API key
    const isValidApiKey = await validateApiKey(request);
    if (!isValidApiKey) {
      return createUnauthorizedResponse();
    }

    await connectDB();

    console.log('🚀 Iniciando sincronización mejorada de proyectos...');

    // Obtener parámetros
    const body = await request.json().catch(() => ({}));
    const {
      limiteDiputados = 5,
      soloActivos = true,
      diputadoEspecifico = null,
      maxPaginasPorDiputado = 100
    } = body;

    let diputados;

    if (diputadoEspecifico) {
      // Procesar diputado específico
      diputados = await Diputado.find({
        $or: [
          { slug: diputadoEspecifico },
          { nombre: { $regex: diputadoEspecifico, $options: 'i' } }
        ]
      }).select('_id nombre slug').limit(1).lean();
    } else {
      // Procesar múltiples diputados
      interface FiltrosDiputados {
        estado?: string;
      }
      const filtros: FiltrosDiputados = {};
      if (soloActivos) {
        filtros.estado = 'activo';
      }

      diputados = await Diputado.find(filtros)
        .select('_id nombre slug')
        .limit(limiteDiputados)
        .lean();
    }

    if (diputados.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No se encontraron diputados para procesar'
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Procesando ${diputados.length} diputados...`);

    let proyectosProcesados = 0;
    let proyectosNuevos = 0;
    let errores = 0;

    // Procesar cada diputado
    for (let i = 0; i < diputados.length; i++) {
      const diputado = diputados[i];

      try {
        console.log(`\n🔄 [${i + 1}/${diputados.length}] Procesando: ${diputado.nombre}`);

        // Obtener proyectos del diputado
        const proyectosObtenidos = await obtenerProyectosDiputadoCompleto(
          diputado.slug,
          String(diputado._id),
          diputado.nombre,
          maxPaginasPorDiputado
        );

        console.log(`💾 Guardando ${proyectosObtenidos.length} proyectos para ${diputado.nombre}...`);

        // Guardar proyectos en la base de datos
        for (const proyectoData of proyectosObtenidos) {
          try {
            // Verificar si el proyecto ya existe
            const proyectoExistente = await Proyecto.findOne({
              expediente: proyectoData.expediente,
              diputadoId: diputado._id,
              tipoFirmante: proyectoData.tipoFirmante
            });

            if (!proyectoExistente) {
              await Proyecto.create({
                ...proyectoData,
                diputadoId: diputado._id,
                diputadoNombre: diputado.nombre
              });
              proyectosNuevos++;
            }

            proyectosProcesados++;

          } catch (error) {
            console.error(`❌ Error guardando proyecto ${proyectoData.expediente}:`, error);
            errores++;
          }
        }

        console.log(`✅ Finalizado ${diputado.nombre}: ${proyectosObtenidos.length} proyectos procesados`);

        // Delay entre diputados (más largo para evitar bloqueos)
        if (i < diputados.length - 1) {
          const delay = 3000 + Math.random() * 2000; // 3-5 segundos
          console.log(`⏳ Esperando ${delay}ms antes del siguiente diputado...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (error) {
        console.error(`💥 Error procesando ${diputado.nombre}:`, error);
        errores++;
      }
    }

    const resultado = {
      success: true,
      message: 'Sincronización de proyectos completada',
      data: {
        diputadosProcesados: diputados.length,
        proyectosProcesados,
        proyectosNuevos,
        errores,
        totalProyectosEnDB: await Proyecto.countDocuments()
      }
    };

    console.log('\n🎉 Sincronización completada:', resultado.data);

    return new Response(JSON.stringify(resultado), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Error en sync-proyectos-mejorado:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
