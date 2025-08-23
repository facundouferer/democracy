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

// Función para obtener todos los diputados desde la página oficial
async function obtenerTodosLosDiputados(): Promise<DiputadoScrapeado[]> {
  const url = 'https://www.diputados.gov.ar/diputados/';

  console.log('🔍 Obteniendo lista completa de diputados desde:', url);

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
    throw new Error(`Error HTTP ${response.status} al obtener la lista de diputados`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const diputados: DiputadoScrapeado[] = [];

  // Buscar todas las filas de la tabla de diputados
  $('#tablaDiputados tbody tr').each((index, element) => {
    try {
      const $row = $(element);

      // Extraer foto
      const foto = $row.find('td:nth-child(1) img').attr('src') || '';

      // Extraer nombre y link
      const nombreLink = $row.find('td:nth-child(2) a');
      const nombre = nombreLink.text().trim().replace(/\s+/g, ' ');
      const link = nombreLink.attr('href') || '';

      // Extraer distrito
      const distrito = $row.find('td:nth-child(3)').text().trim();

      // Extraer mandato
      const mandato = $row.find('td:nth-child(4)').text().trim();

      // Extraer fechas de mandato
      const inicioMandatoTexto = $row.find('td:nth-child(5)').text().trim();
      const finMandatoTexto = $row.find('td:nth-child(6)').text().trim();

      // Extraer bloque
      const bloque = $row.find('td:nth-child(7)').text().trim();

      // Generar slug desde el link
      const slug = link.replace('/diputados/', '').replace('/', '');

      // Parsear fechas
      const inicioMandato = parsearFecha(inicioMandatoTexto);
      const finMandato = parsearFecha(finMandatoTexto);

      // Solo agregar si tiene datos válidos
      if (nombre && link && slug) {
        diputados.push({
          foto,
          nombre,
          link: `https://www.diputados.gov.ar${link}`,
          distrito,
          mandato,
          inicioMandato,
          finMandato,
          bloque,
          slug
        });
      }
    } catch (error) {
      console.error('Error procesando fila de diputado:', error);
    }
  });

  console.log(`✅ Extraídos ${diputados.length} diputados de la página oficial`);
  return diputados;
}

// Función para parsear fechas en formato DD/MM/YYYY
function parsearFecha(fechaTexto: string): Date {
  if (!fechaTexto || fechaTexto.trim() === '') {
    return new Date();
  }

  // Formato esperado: DD/MM/YYYY
  const partes = fechaTexto.trim().split('/');
  if (partes.length === 3) {
    const dia = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1; // Los meses en JavaScript van de 0-11
    const año = parseInt(partes[2], 10);

    if (!isNaN(dia) && !isNaN(mes) && !isNaN(año)) {
      return new Date(año, mes, dia);
    }
  }

  // Fallback si no se puede parsear
  return new Date();
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
        // Parsear fecha de nacimiento (formato DD/MM/YYYY)
        const partesNacimiento = fechaNacimientoTexto.split('/');
        if (partesNacimiento.length === 3) {
          const diaNac = parseInt(partesNacimiento[0], 10);
          const mesNac = parseInt(partesNacimiento[1], 10) - 1;
          const añoNac = parseInt(partesNacimiento[2], 10);

          if (!isNaN(diaNac) && !isNaN(mesNac) && !isNaN(añoNac)) {
            fechaNacimiento = new Date(añoNac, mesNac, diaNac);
          }
        }
      }

      // Extraer email
      let email = '';
      const emailElement = $('a[href^="mailto:"]').first();
      if (emailElement.length > 0) {
        email = emailElement.attr('href')?.replace('mailto:', '') || '';
      }

      // Extraer foto completa
      let fotoCompleta = '';
      const imgElement = $('.encabezadoFoto img').first();
      if (imgElement.length > 0) {
        fotoCompleta = imgElement.attr('src') || '';
        if (fotoCompleta && !fotoCompleta.startsWith('http')) {
          fotoCompleta = `https://www.diputados.gov.ar${fotoCompleta}`;
        }
      }

      // Extraer contadores de proyectos de ley
      let proyectosLeyFirmante = 0;
      let proyectosLeyCofirmante = 0;

      // Buscar enlaces a proyectos para contar
      const proyectosLinks = $('a[href*="listado-proyectos.html"]');
      proyectosLinks.each((i, el) => {
        const href = $(el).attr('href') || '';
        const texto = $(el).text().trim();

        if (href.includes('tipoFirmante=firmante') && href.includes('tipoProyecto=LEY')) {
          const match = texto.match(/(\d+)/);
          if (match) {
            proyectosLeyFirmante = parseInt(match[1], 10);
          }
        } else if (href.includes('tipoFirmante=cofirmante') && href.includes('tipoProyecto=LEY')) {
          const match = texto.match(/(\d+)/);
          if (match) {
            proyectosLeyCofirmante = parseInt(match[1], 10);
          }
        }
      });

      return {
        fotoCompleta,
        profesion,
        fechaNacimiento,
        email,
        proyectosLeyFirmante,
        proyectosLeyCofirmante
      };

    } catch (error) {
      console.error(`Error en intento ${intento}/${reintentos} para ${linkDiputado}:`, error);
      if (intento === reintentos) {
        console.error(`Error final al obtener detalles de ${linkDiputado}:`, error);
        return {}; // Devolver objeto vacío para continuar
      }
    }
  }

  return {}; // Fallback
}

export async function GET(request: NextRequest) {
  try {
    // Validar API key
    const isValidApiKey = await validateApiKey(request);
    if (!isValidApiKey) {
      return createUnauthorizedResponse();
    }

    await connectDB();

    console.log('🚀 Iniciando sincronización completa de diputados...');

    // Obtener todos los diputados desde la página oficial
    const diputadosScrapear = await obtenerTodosLosDiputados();

    let diputadosActualizados = 0;
    let diputadosCreados = 0;
    let errores = 0;

    console.log(`📊 Procesando ${diputadosScrapear.length} diputados...`);

    // Procesar cada diputado con delay para evitar rate limiting
    for (let i = 0; i < diputadosScrapear.length; i++) {
      const diputadoData = diputadosScrapear[i];

      try {
        console.log(`🔄 Procesando ${i + 1}/${diputadosScrapear.length}: ${diputadoData.nombre} (${diputadoData.slug})`);

        // Buscar si el diputado ya existe en la base de datos
        const diputadoExistente = await Diputado.findOne({ slug: diputadoData.slug });

        // Obtener detalles adicionales del diputado
        const detalles = await obtenerDetallesDiputado(diputadoData.link);

        // Combinar datos básicos con detalles
        const datosCompletos = {
          ...diputadoData,
          ...detalles
        };

        if (diputadoExistente) {
          // Actualizar diputado existente
          await Diputado.findByIdAndUpdate(
            diputadoExistente._id,
            datosCompletos,
            { new: true }
          );
          diputadosActualizados++;
          console.log(`✅ Actualizado: ${diputadoData.nombre}`);
        } else {
          // Crear nuevo diputado
          await Diputado.create(datosCompletos);
          diputadosCreados++;
          console.log(`✨ Creado: ${diputadoData.nombre}`);
        }

        // Delay entre requests para evitar rate limiting
        if (i < diputadosScrapear.length - 1) {
          const delay = 500 + Math.random() * 1000; // 0.5-1.5 segundos
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (error) {
        console.error(`❌ Error procesando ${diputadoData.nombre}:`, error);
        errores++;
      }
    }

    const totalDiputados = await Diputado.countDocuments();

    const resultado = {
      success: true,
      message: 'Sincronización completa de diputados finalizada',
      data: {
        diputadosEncontrados: diputadosScrapear.length,
        diputadosCreados,
        diputadosActualizados,
        errores,
        totalEnDB: totalDiputados
      }
    };

    console.log('🎉 Sincronización completada:', resultado.data);

    return new Response(JSON.stringify(resultado), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Error en sync-diputados-completo:', error);
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
