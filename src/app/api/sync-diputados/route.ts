import { NextRequest } from 'next/server';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Diputado from '@/models/Diputado';
import * as cheerio from 'cheerio';

interface DiputadoScrapeado {
  foto: string;
  nombre: string;
  link: string;
  distrito: string;
  mandato: string;
  inicioMandato: Date;
  finMandato: Date;
  bloque: string;
  slug: string;
  fotoCompleta?: string;
  profesion?: string;
  fechaNacimiento?: Date;
  email?: string;
  proyectosLeyFirmante?: number;
  proyectosLeyCofirmante?: number;
}

// Función para obtener detalles individuales del diputado con reintentos
async function obtenerDetallesDiputado(linkDiputado: string, reintentos = 3): Promise<{
  fotoCompleta?: string;
  profesion?: string;
  fechaNacimiento?: Date;
  email?: string;
  proyectosLeyFirmante?: number;
  proyectosLeyCofirmante?: number;
}> {
  for (let intento = 1; intento <= reintentos; intento++) {
    try {
      // Agregar delay aleatorio entre 1-3 segundos para evitar rate limiting
      if (intento > 1) {
        const delay = 1000 + Math.random() * 2000; // 1-3 segundos
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const response = await fetch(linkDiputado, {
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
        if (response.status === 403 && intento < reintentos) {
          console.warn(`Error HTTP ${response.status} al obtener detalles de ${linkDiputado} - Intento ${intento}/${reintentos}, reintentando...`);
          continue; // Reintentar
        } else {
          console.warn(`Error HTTP ${response.status} al obtener detalles de ${linkDiputado} - Saltando diputado`);
          return {}; // Devolver objeto vacío para continuar con otros diputados
        }
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Extraer profesión
      let profesion = '';
      const profesionSpan = $('.encabezadoProfesion span').first();

      if (profesionSpan.length > 0) {
        // Si existe el span de profesión, obtener su contenido
        const profesionTexto = profesionSpan.text().trim();
        if (profesionTexto && profesionTexto.length > 0) {
          profesion = profesionTexto;
        } else {
          profesion = 'Sin información';
        }
      } else {
        // Fallback para estructura HTML diferente
        const profesionFallback = $('strong:contains("Profesión:")').siblings('span').first().text().trim();
        if (profesionFallback && profesionFallback.length > 0) {
          profesion = profesionFallback;
        } else {
          profesion = 'Sin información';
        }
      }

      // Extraer fecha de nacimiento
      let fechaNacimiento: Date | undefined;
      let fechaNacimientoTexto = '';

      const fechaSpan = $('.encabezadoFecha span').first();
      if (fechaSpan.length > 0) {
        fechaNacimientoTexto = fechaSpan.text().trim();
      } else {
        // Fallback para estructura HTML diferente
        fechaNacimientoTexto = $('strong:contains("Fecha de Nac.")').siblings('span').first().text().trim();
      }

      if (fechaNacimientoTexto && fechaNacimientoTexto.length > 0) {
        // Limpiar la fecha de espacios y caracteres innecesarios
        const fechaLimpia = fechaNacimientoTexto.replace(/^\s+|\s+$/g, '');
        // Verificar que tenga formato de fecha (dd/mm/yyyy)
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fechaLimpia)) {
          const [dia, mes, año] = fechaLimpia.split('/');
          const fecha = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia));
          if (!isNaN(fecha.getTime()) && fecha.getFullYear() > 1900 && fecha.getFullYear() < 2010) {
            fechaNacimiento = fecha;
          }
        }
      }

      // Extraer email
      const email = $('a[href^="mailto:"]').attr('href')?.replace('mailto:', '').toLowerCase() || '';

      // Extraer foto completa
      let fotoCompleta = $('.foto-diputado img').attr('src') ||
        $('img[alt*="foto"], img[src*="diputado"]').first().attr('src') || '';

      if (fotoCompleta && !fotoCompleta.startsWith('http')) {
        fotoCompleta = `https://www.hcdn.gob.ar${fotoCompleta}`;
      }

      // Obtener proyectos de LEY
      const slug = linkDiputado.split('/').filter(Boolean).pop() || '';
      const proyectos = await obtenerProyectosLey(linkDiputado, slug);

      return {
        profesion: profesion || 'Sin información',
        fechaNacimiento,
        email: email || undefined,
        fotoCompleta: fotoCompleta || undefined,
        proyectosLeyFirmante: proyectos.proyectosLeyFirmante,
        proyectosLeyCofirmante: proyectos.proyectosLeyCofirmante
      };

    } catch (error) {
      if (intento < reintentos) {
        console.warn(`Error en intento ${intento}/${reintentos} para ${linkDiputado}:`, error);
        continue; // Reintentar
      } else {
        console.warn(`Error final al obtener detalles del diputado ${linkDiputado}:`, error);
        return {}; // Devolver objeto vacío en el último intento
      }
    }
  }

  // Si llegamos aquí, todos los reintentos fallaron
  return {};
}

// Función para obtener cantidad de proyectos de LEY con URLs correctas
async function obtenerProyectosLey(linkDiputado: string, slug: string): Promise<{
  proyectosLeyFirmante?: number;
  proyectosLeyCofirmante?: number;
}> {
  try {
    console.log(`[PROYECTOS] Obteniendo proyectos para: ${slug}`);

    // URLs correctas basadas en el patrón del sitio web
    const urlFirmante = `https://www.hcdn.gob.ar/diputados/${slug}/listado-proyectos.html?tipoFirmante=firmante`;
    const urlCofirmante = `https://www.hcdn.gob.ar/diputados/${slug}/listado-proyectos.html?tipoFirmante=cofirmante`;

    console.log(`[PROYECTOS] URLs corregidas: 
    - Firmante: ${urlFirmante}
    - Cofirmante: ${urlCofirmante}`);

    const [responseFirmante, responseCofirmante] = await Promise.all([
      fetch(urlFirmante, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Referer': linkDiputado,
          'Cache-Control': 'no-cache'
        }
      }).catch(err => {
        console.warn(`Error al obtener proyectos firmante para ${slug}:`, err.message);
        return { ok: false };
      }),
      fetch(urlCofirmante, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Referer': linkDiputado,
          'Cache-Control': 'no-cache'
        }
      }).catch(err => {
        console.warn(`Error al obtener proyectos cofirmante para ${slug}:`, err.message);
        return { ok: false };
      })
    ]);

    let proyectosLeyFirmante = 0;
    let proyectosLeyCofirmante = 0;

    // Procesar respuesta de proyectos como firmante
    if (responseFirmante && 'text' in responseFirmante && responseFirmante.ok) {
      try {
        const htmlFirmante = await responseFirmante.text();
        const $firmante = cheerio.load(htmlFirmante);

        // Estrategia principal: buscar texto "X Proyectos Encontrados"
        const textoPaginador = $firmante('.textoPaginador').text();
        const matchFirmante = textoPaginador.match(/(\d+)\s+Proyectos?\s+Encontrados?/i);

        if (matchFirmante) {
          proyectosLeyFirmante = parseInt(matchFirmante[1], 10);
          console.log(`[PROYECTOS] Firmante - Encontrados por paginador: ${proyectosLeyFirmante} proyectos`);
        } else {
          // Fallback: contar filas de la tabla
          const filasTabla = $firmante('table tbody tr').length;
          if (filasTabla > 0) {
            proyectosLeyFirmante = filasTabla;
            console.log(`[PROYECTOS] Firmante - Conteo por tabla: ${proyectosLeyFirmante} proyectos`);
          } else {
            console.log(`[PROYECTOS] Firmante - No se encontraron proyectos o estructura desconocida`);
          }
        }

      } catch (error) {
        console.warn(`Error procesando proyectos firmante para ${slug}:`, error);
      }
    } else {
      console.warn(`[PROYECTOS] No se pudo obtener respuesta válida para proyectos firmante de ${slug}`);
    }

    // Procesar respuesta de proyectos como cofirmante
    if (responseCofirmante && 'text' in responseCofirmante && responseCofirmante.ok) {
      try {
        const htmlCofirmante = await responseCofirmante.text();
        const $cofirmante = cheerio.load(htmlCofirmante);

        // Estrategia principal: buscar texto "X Proyectos Encontrados"
        const textoPaginador = $cofirmante('.textoPaginador').text();
        const matchCofirmante = textoPaginador.match(/(\d+)\s+Proyectos?\s+Encontrados?/i);

        if (matchCofirmante) {
          proyectosLeyCofirmante = parseInt(matchCofirmante[1], 10);
          console.log(`[PROYECTOS] Cofirmante - Encontrados por paginador: ${proyectosLeyCofirmante} proyectos`);
        } else {
          // Fallback: contar filas de la tabla
          const filasTabla = $cofirmante('table tbody tr').length;
          if (filasTabla > 0) {
            proyectosLeyCofirmante = filasTabla;
            console.log(`[PROYECTOS] Cofirmante - Conteo por tabla: ${proyectosLeyCofirmante} proyectos`);
          } else {
            console.log(`[PROYECTOS] Cofirmante - No se encontraron proyectos o estructura desconocida`);
          }
        }

      } catch (error) {
        console.warn(`Error procesando proyectos cofirmante para ${slug}:`, error);
      }
    } else {
      console.warn(`[PROYECTOS] No se pudo obtener respuesta válida para proyectos cofirmante de ${slug}`);
    }

    console.log(`[PROYECTOS] RESUMEN para ${slug}: Firmante=${proyectosLeyFirmante}, Cofirmante=${proyectosLeyCofirmante}`);

    return {
      proyectosLeyFirmante: proyectosLeyFirmante || 0,
      proyectosLeyCofirmante: proyectosLeyCofirmante || 0
    };
  } catch (error) {
    console.warn(`Error al obtener proyectos de LEY para ${slug}:`, error);
    return {
      proyectosLeyFirmante: 0,
      proyectosLeyCofirmante: 0
    };
  }
}

// Función para procesar fechas de mandato a partir de campos separados
function procesarFechasMandatoSeparadas(inicioTexto: string, finTexto: string): { inicioMandato: Date; finMandato: Date } {
  let inicioMandato = new Date();
  let finMandato = new Date();

  try {
    // Intentar parsear las fechas directamente si están en formato DD/MM/YYYY
    if (inicioTexto && inicioTexto.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const [dia, mes, año] = inicioTexto.split('/');
      inicioMandato = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia));
    }

    if (finTexto && finTexto.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const [dia, mes, año] = finTexto.split('/');
      finMandato = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia));
    }
  } catch (error) {
    console.warn('Error parseando fechas de mandato:', error);
    // Usar fechas por defecto
    inicioMandato = new Date();
    finMandato = new Date();
  }

  return { inicioMandato, finMandato };
}

export async function GET(request: NextRequest) {
  // Validar API Key
  if (!validateApiKey(request)) {
    return createUnauthorizedResponse();
  }

  try {
    console.log('[SYNC] Iniciando sincronización completa de diputados...');

    // Conectar a MongoDB
    await connectDB();

    const url = 'https://www.hcdn.gob.ar/diputados/';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const diputadosParaProcesar: DiputadoScrapeado[] = [];
    let contadorProcesados = 0;

    // Extraer información básica de todos los diputados
    console.log('[SYNC] Extrayendo información básica...');

    $('#tablaDiputados tbody tr').each((index, element) => {
      const $row = $(element);

      const foto = $row.find('td:nth-child(1) img').attr('src') || '';
      const nombreElement = $row.find('td:nth-child(2) a');
      const nombre = nombreElement.text().trim();
      const link = nombreElement.attr('href') || '';
      const distrito = $row.find('td:nth-child(3)').text().trim();
      const mandato = $row.find('td:nth-child(4)').text().trim();
      const inicio = $row.find('td:nth-child(5)').text().trim();
      const fin = $row.find('td:nth-child(6)').text().trim();
      const bloque = $row.find('td:nth-child(7)').text().trim();

      if (nombre && link) {
        const linkCompleto = link.startsWith('http') ? link : `https://www.hcdn.gob.ar${link}`;
        const fotoCompleta = foto.startsWith('http') ? foto : `https://www.hcdn.gob.ar${foto}`;
        const slug = link.split('/').filter(Boolean).pop() || '';

        const { inicioMandato, finMandato } = procesarFechasMandatoSeparadas(inicio, fin);

        diputadosParaProcesar.push({
          foto: fotoCompleta,
          nombre,
          link: linkCompleto,
          distrito,
          mandato,
          inicioMandato,
          finMandato,
          bloque,
          slug
        });
      }
    });

    console.log(`[SYNC] Encontrados ${diputadosParaProcesar.length} diputados para procesar`);

    // Procesar cada diputado (con detalles individuales)
    const diputadosCompletos: DiputadoScrapeado[] = [];
    const BATCH_SIZE = 3; // Reducido a 3 para ser más respetuosos con el servidor

    for (let i = 0; i < diputadosParaProcesar.length; i += BATCH_SIZE) {
      const lote = diputadosParaProcesar.slice(i, i + BATCH_SIZE);

      console.log(`[SYNC] Procesando lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(diputadosParaProcesar.length / BATCH_SIZE)} (${lote.length} diputados)`);

      const loteConDetalles = await Promise.all(
        lote.map(async (diputado, index) => {
          try {
            // Agregar delay escalonado dentro del lote para evitar requests simultáneos
            if (index > 0) {
              await new Promise(resolve => setTimeout(resolve, 500 * index)); // 0.5s, 1s, 1.5s...
            }

            const detalles = await obtenerDetallesDiputado(diputado.link);
            contadorProcesados++;

            return {
              ...diputado,
              ...detalles
            };
          } catch (error) {
            console.warn(`Error procesando ${diputado.nombre}:`, error);
            contadorProcesados++;
            return diputado; // Devolver solo datos básicos si fallan los detalles
          }
        })
      );

      diputadosCompletos.push(...loteConDetalles);

      // Pausa más larga entre lotes para ser más respetuosos con el servidor
      if (i + BATCH_SIZE < diputadosParaProcesar.length) {
        console.log('[SYNC] Pausa entre lotes...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 segundos entre lotes
      }
    }

    console.log(`[SYNC] Procesamiento completo. Guardando ${diputadosCompletos.length} diputados en BD...`);

    // Guardar en base de datos usando upsert (actualizar si existe, insertar si no)
    let insertados = 0;
    let actualizados = 0;
    const errores: string[] = [];

    for (const diputado of diputadosCompletos) {
      try {
        const resultado = await Diputado.findOneAndUpdate(
          { slug: diputado.slug }, // Buscar por slug único
          {
            ...diputado,
            fechaActualizacion: new Date(),
            estado: 'activo'
          },
          {
            upsert: true,
            new: true,
            runValidators: true
          }
        );

        if (resultado.isNew) {
          insertados++;
        } else {
          actualizados++;
        }

      } catch (error) {
        const mensaje = `Error guardando ${diputado.nombre}: ${error instanceof Error ? error.message : 'Error desconocido'}`;
        errores.push(mensaje);
        console.error(mensaje);
      }
    }

    // Marcar como inactivos los diputados que ya no están en la lista actual
    const slugsActuales = diputadosCompletos.map(d => d.slug);
    const inactivados = await Diputado.updateMany(
      {
        slug: { $nin: slugsActuales },
        estado: 'activo'
      },
      {
        estado: 'inactivo',
        fechaActualizacion: new Date()
      }
    );

    const tiempoFinal = new Date();
    console.log(`[SYNC] Sincronización completada exitosamente`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sincronización completada exitosamente',
        estadisticas: {
          totalEncontrados: diputadosParaProcesar.length,
          totalProcesados: contadorProcesados,
          insertados,
          actualizados,
          inactivados: inactivados.modifiedCount,
          errores: errores.length,
          tiempoFinalizacion: tiempoFinal.toISOString()
        },
        errores: errores.length > 0 ? errores.slice(0, 10) : [] // Solo primeros 10 errores
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('[SYNC] Error en sincronización:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error en la sincronización',
        details: error instanceof Error ? error.message : 'Error desconocido'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}
