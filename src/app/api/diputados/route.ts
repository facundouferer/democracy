import { NextResponse, NextRequest } from 'next/server';
import * as cheerio from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/auth';

interface Diputado {
  foto: string;
  fotoCompleta?: string;
  nombre: string;
  link: string;
  distrito: string;
  mandato: string;
  inicioMandato: string;
  finMandato: string;
  bloque: string;
  profesion?: string;
  fechaNacimiento?: string;
  email?: string;
  proyectosLeyFirmante?: number;
  proyectosLeyCofirmante?: number;
}

// Función para obtener cantidad de proyectos de LEY
async function obtenerProyectosLey(linkDiputado: string, slug: string): Promise<{
  proyectosLeyFirmante?: number;
  proyectosLeyCofirmante?: number;
}> {
  try {
    const proyectos = {
      proyectosLeyFirmante: 0,
      proyectosLeyCofirmante: 0
    };

    // URLs para firmante y cofirmante
    const urlFirmante = `${linkDiputado}listado-proyectos.html?tipoFirmante=firmante`;
    const urlCofirmante = `${linkDiputado}listado-proyectos.html?tipoFirmante=cofirmante`;

    // Obtener proyectos como firmante
    try {
      const responseFirmante = await fetch(urlFirmante, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (responseFirmante.ok) {
        const htmlFirmante = await responseFirmante.text();
        const $firmante = cheerio.load(htmlFirmante);

        // Contar solo proyectos de tipo "LEY"
        let countFirmante = 0;
        $firmante('#tablesorter tbody tr').each((_, row) => {
          const tipo = $firmante(row).find('td:nth-child(2)').text().trim();
          if (tipo === 'LEY') {
            countFirmante++;
          }
        });

        // Si hay paginación, extraer el total de la información del paginador
        const textoPaginador = $firmante('.textoPaginador').first().text();
        const matchTotal = textoPaginador.match(/(\d+)\s+Proyectos\s+Encontrados/i);

        if (matchTotal) {
          // Si hay paginación, necesitamos calcular cuántos son de tipo LEY del total
          const totalProyectos = parseInt(matchTotal[1]);
          if (totalProyectos > countFirmante) {
            // Estimamos basándose en la proporción de LEY en la primera página
            const totalFilas = $firmante('#tablesorter tbody tr').length;
            if (totalFilas > 0) {
              const proporcionLey = countFirmante / totalFilas;
              proyectos.proyectosLeyFirmante = Math.round(totalProyectos * proporcionLey);
            }
          } else {
            proyectos.proyectosLeyFirmante = countFirmante;
          }
        } else {
          proyectos.proyectosLeyFirmante = countFirmante;
        }
      }
    } catch (error) {
      console.warn(`Error al obtener proyectos firmante para ${slug}:`, error);
    }

    // Obtener proyectos como cofirmante
    try {
      const responseCofirmante = await fetch(urlCofirmante, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (responseCofirmante.ok) {
        const htmlCofirmante = await responseCofirmante.text();
        const $cofirmante = cheerio.load(htmlCofirmante);

        // Contar solo proyectos de tipo "LEY"
        let countCofirmante = 0;
        $cofirmante('#tablesorter tbody tr').each((_, row) => {
          const tipo = $cofirmante(row).find('td:nth-child(2)').text().trim();
          if (tipo === 'LEY') {
            countCofirmante++;
          }
        });

        // Si hay paginación, extraer el total de la información del paginador
        const textoPaginador = $cofirmante('.textoPaginador').first().text();
        const matchTotal = textoPaginador.match(/(\d+)\s+Proyectos\s+Encontrados/i);

        if (matchTotal) {
          const totalProyectos = parseInt(matchTotal[1]);
          if (totalProyectos > countCofirmante) {
            const totalFilas = $cofirmante('#tablesorter tbody tr').length;
            if (totalFilas > 0) {
              const proporcionLey = countCofirmante / totalFilas;
              proyectos.proyectosLeyCofirmante = Math.round(totalProyectos * proporcionLey);
            }
          } else {
            proyectos.proyectosLeyCofirmante = countCofirmante;
          }
        } else {
          proyectos.proyectosLeyCofirmante = countCofirmante;
        }
      }
    } catch (error) {
      console.warn(`Error al obtener proyectos cofirmante para ${slug}:`, error);
    }

    return proyectos;

  } catch (error) {
    console.warn(`Error general al obtener proyectos para ${slug}:`, error);
    return {};
  }
}

// Función para obtener detalles del perfil individual
async function obtenerDetallesDiputado(linkDiputado: string): Promise<{
  profesion?: string;
  fechaNacimiento?: string;
  email?: string;
  fotoCompleta?: string;
  proyectosLeyFirmante?: number;
  proyectosLeyCofirmante?: number;
}> {
  try {
    const response = await fetch(linkDiputado, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.warn(`Error al obtener detalles de ${linkDiputado}: ${response.status}`);
      return {};
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extraer profesión
    const profesion = $('.encabezadoProfesion span').text().trim() ||
      $('p:contains("Profesión:") span').text().trim();

    // Extraer fecha de nacimiento
    const fechaNacimiento = $('.encabezadoFecha span').text().trim() ||
      $('p:contains("Fecha de Nac.:") span').text().trim();

    // Extraer email
    const emailElement = $('a[href^="mailto:"]');
    const email = emailElement.text().trim() ||
      emailElement.attr('href')?.replace('mailto:', '') || '';

    // Extraer foto en tamaño completo
    const fotoCompleta = $('.detalleDip .box1 img').attr('src') ||
      $('.siteDiputado img').first().attr('src') || '';

    // Extraer slug del diputado para obtener proyectos
    const slug = linkDiputado.split('/').filter(Boolean).pop() || '';

    // Obtener información de proyectos
    const proyectos = await obtenerProyectosLey(linkDiputado, slug);

    return {
      profesion: profesion || undefined,
      fechaNacimiento: fechaNacimiento || undefined,
      email: email.toLowerCase() || undefined,
      fotoCompleta: fotoCompleta && fotoCompleta.startsWith('http') ? fotoCompleta :
        fotoCompleta ? `https://www.hcdn.gob.ar${fotoCompleta}` : undefined,
      proyectosLeyFirmante: proyectos.proyectosLeyFirmante,
      proyectosLeyCofirmante: proyectos.proyectosLeyCofirmante
    };

  } catch (error) {
    console.warn(`Error al obtener detalles del diputado ${linkDiputado}:`, error);
    return {};
  }
} export async function GET(request: NextRequest) {
  // Validar API Key antes de procesar la solicitud
  if (!validateApiKey(request)) {
    return createUnauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 10; // Por defecto 10 diputados con detalles
    const includeDetails = searchParams.get('details') !== 'false'; // Por defecto incluir detalles

    console.log(`[AUTH] Solicitud autenticada - Iniciando scraping con límite: ${limit}, detalles: ${includeDetails}`);

    // Realizamos la petición al sitio web
    const response = await fetch('https://www.hcdn.gob.ar/diputados/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const diputadosBasicos: Omit<Diputado, 'profesion' | 'fechaNacimiento' | 'email' | 'fotoCompleta' | 'proyectosLeyFirmante' | 'proyectosLeyCofirmante'>[] = [];

    // Buscamos la tabla de diputados y extraemos la información básica
    $('#tablaDiputados tbody tr').each((index, element) => {
      const $row = $(element);

      // Extraemos la información de cada columna
      const foto = $row.find('td:nth-child(1) img').attr('src') || '';
      const nombreElement = $row.find('td:nth-child(2) a');
      const nombre = nombreElement.text().trim();
      const link = nombreElement.attr('href') || '';
      const distrito = $row.find('td:nth-child(3)').text().trim();
      const mandato = $row.find('td:nth-child(4)').text().trim();
      const inicioMandato = $row.find('td:nth-child(5)').text().trim();
      const finMandato = $row.find('td:nth-child(6)').text().trim();
      const bloque = $row.find('td:nth-child(7)').text().trim();

      // Solo agregamos si tiene información válida
      if (nombre) {
        diputadosBasicos.push({
          foto: foto.startsWith('http') ? foto : `https://www.hcdn.gob.ar${foto}`,
          nombre,
          link: link.startsWith('http') ? link : `https://www.hcdn.gob.ar${link}`,
          distrito,
          mandato,
          inicioMandato,
          finMandato,
          bloque
        });
      }
    });

    console.log(`Obtenidos ${diputadosBasicos.length} diputados de la lista principal`);

    if (!includeDetails) {
      return NextResponse.json({
        success: true,
        count: diputadosBasicos.length,
        detailedCount: 0,
        message: 'Lista básica sin detalles adicionales',
        data: diputadosBasicos
      });
    }

    // Ahora obtenemos los detalles de cada diputado
    const diputadosCompletos: Diputado[] = [];

    // Limitamos la cantidad de diputados con detalles completos
    const limiteDetalles = Math.min(diputadosBasicos.length, limit);

    for (let i = 0; i < limiteDetalles; i++) {
      const diputadoBasico = diputadosBasicos[i];
      console.log(`Obteniendo detalles de ${diputadoBasico.nombre} (${i + 1}/${limiteDetalles})`);

      const detalles = await obtenerDetallesDiputado(diputadoBasico.link);

      diputadosCompletos.push({
        ...diputadoBasico,
        ...detalles
      });

      // Pequeña pausa para no sobrecargar el servidor
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Agregar el resto sin detalles adicionales si hay más
    for (let i = limiteDetalles; i < diputadosBasicos.length; i++) {
      diputadosCompletos.push(diputadosBasicos[i]);
    }

    return NextResponse.json({
      success: true,
      count: diputadosCompletos.length,
      detailedCount: limiteDetalles,
      message: `Se obtuvieron detalles completos de ${limiteDetalles} diputados de ${diputadosBasicos.length} total`,
      data: diputadosCompletos
    });

  } catch (error) {
    console.error('Error en el scraping:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener la información de los diputados',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}