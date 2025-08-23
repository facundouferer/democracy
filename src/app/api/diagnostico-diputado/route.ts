import { NextRequest } from 'next/server';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Diputado from '@/models/Diputado';
import Proyecto from '@/models/Proyecto';
import * as cheerio from 'cheerio';

interface DiagnosticoDetallado {
  diputado: {
    nombre: string;
    slug: string;
    _id: string;
  };
  diagnostico: {
    firmante: {
      paginaPrueba: number;
      totalProyectos: number;
      totalPaginas: number;
      muestraProyectos: Array<{
        expediente: string;
        tipo: string;
        fecha: Date;
      }>;
      tiempoRespuesta: number;
      estado: 'exitoso' | 'error';
      error?: string;
    };
    cofirmante: {
      paginaPrueba: number;
      totalProyectos: number;
      totalPaginas: number;
      muestraProyectos: Array<{
        expediente: string;
        tipo: string;
        fecha: Date;
      }>;
      tiempoRespuesta: number;
      estado: 'exitoso' | 'error';
      error?: string;
    };
  };
  proyectosEnBD: {
    totalFirmante: number;
    totalCofirmante: number;
    totalGeneral: number;
  };
  recomendaciones: string[];
}

// Función de diagnóstico para una página específica
async function diagnosticarPagina(
  slug: string,
  tipoFirmante: 'firmante' | 'cofirmante',
  paginaPrueba: number = 1
): Promise<{
  paginaPrueba: number;
  totalProyectos: number;
  totalPaginas: number;
  muestraProyectos: Array<{
    expediente: string;
    tipo: string;
    fecha: Date;
  }>;
  tiempoRespuesta: number;
  estado: 'exitoso' | 'error';
  error?: string;
}> {
  const inicioTiempo = Date.now();

  try {
    const url = `https://www.diputados.gov.ar/diputados/${slug}/listado-proyectos.html?tipoFirmante=${tipoFirmante}&pagina=${paginaPrueba}`;

    console.log(`🔍 Diagnosticando: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: AbortSignal.timeout(30000) // 30 segundos timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extraer información de paginación
    let totalProyectos = 0;
    let totalPaginas = 1;

    // Buscar información de paginación
    const textoCompleto = $('body').text();

    // Buscar patrones como "1884 proyectos en 95 páginas"
    const patronProyectos = textoCompleto.match(/(\d+)\s*proyectos?/i);
    const patronPaginas = textoCompleto.match(/(\d+)\s*páginas?/i);

    if (patronProyectos) {
      totalProyectos = parseInt(patronProyectos[1], 10);
    }

    if (patronPaginas) {
      totalPaginas = parseInt(patronPaginas[1], 10);
    }

    // Extraer muestra de proyectos
    const muestraProyectos: Array<{
      expediente: string;
      tipo: string;
      fecha: Date;
    }> = [];

    $('table tr').slice(1, 6).each((index, element) => { // Tomar solo 5 ejemplos
      try {
        const $row = $(element);
        const celdas = $row.find('td');

        if (celdas.length >= 4) {
          const expediente = $(celdas[0]).text().trim();
          const tipo = $(celdas[1]).text().trim();
          const fechaTexto = $(celdas[3]).text().trim();

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

          if (expediente && tipo) {
            muestraProyectos.push({ expediente, tipo, fecha });
          }
        }
      } catch (error) {
        console.warn('Error procesando fila de muestra:', error);
      }
    });

    const tiempoRespuesta = Date.now() - inicioTiempo;

    return {
      paginaPrueba,
      totalProyectos,
      totalPaginas,
      muestraProyectos,
      tiempoRespuesta,
      estado: 'exitoso'
    };

  } catch (error) {
    const tiempoRespuesta = Date.now() - inicioTiempo;

    return {
      paginaPrueba,
      totalProyectos: 0,
      totalPaginas: 0,
      muestraProyectos: [],
      tiempoRespuesta,
      estado: 'error',
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Validar API key
    const isValidApiKey = await validateApiKey(request);
    if (!isValidApiKey) {
      return createUnauthorizedResponse();
    }

    await connectDB();

    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url);
    const slugDiputado = searchParams.get('slug') || 'mcampagnoli';
    const paginaPrueba = parseInt(searchParams.get('pagina') || '1', 10);

    console.log(`🩺 Iniciando diagnóstico detallado para: ${slugDiputado}`);

    // Buscar diputado en la base de datos
    const diputado = await Diputado.findOne({ slug: slugDiputado }).select('_id nombre slug').lean() as {
      _id: string;
      nombre: string;
      slug: string;
    } | null;

    if (!diputado) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `No se encontró el diputado con slug: ${slugDiputado}`
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`👤 Diputado encontrado: ${diputado.nombre}`);

    // Diagnosticar como firmante
    console.log('🔍 Diagnosticando como firmante...');
    const diagnosticoFirmante = await diagnosticarPagina(slugDiputado, 'firmante', paginaPrueba);

    // Delay entre requests
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Diagnosticar como cofirmante
    console.log('🔍 Diagnosticando como cofirmante...');
    const diagnosticoCofirmante = await diagnosticarPagina(slugDiputado, 'cofirmante', paginaPrueba);

    // Contar proyectos existentes en la base de datos
    const proyectosExistentes = {
      totalFirmante: await Proyecto.countDocuments({
        diputadoId: diputado._id,
        tipoFirmante: 'firmante'
      }),
      totalCofirmante: await Proyecto.countDocuments({
        diputadoId: diputado._id,
        tipoFirmante: 'cofirmante'
      }),
      totalGeneral: await Proyecto.countDocuments({
        diputadoId: diputado._id
      })
    };

    // Generar recomendaciones
    const recomendaciones: string[] = [];

    if (diagnosticoFirmante.estado === 'error') {
      recomendaciones.push('❌ Error al acceder a proyectos como firmante - revisar conectividad y rate limiting');
    } else if (diagnosticoFirmante.totalPaginas > 50) {
      recomendaciones.push(`⚠️ Muchas páginas como firmante (${diagnosticoFirmante.totalPaginas}) - considerar procesamiento por lotes`);
    }

    if (diagnosticoCofirmante.estado === 'error') {
      recomendaciones.push('❌ Error al acceder a proyectos como cofirmante - revisar conectividad y rate limiting');
    } else if (diagnosticoCofirmante.totalPaginas > 50) {
      recomendaciones.push(`⚠️ Muchas páginas como cofirmante (${diagnosticoCofirmante.totalPaginas}) - considerar procesamiento por lotes`);
    }

    const totalPaginasEstimadas = diagnosticoFirmante.totalPaginas + diagnosticoCofirmante.totalPaginas;
    if (totalPaginasEstimadas > 100) {
      recomendaciones.push(`🚨 Total de ${totalPaginasEstimadas} páginas - usar delays largos (3-5 segundos) entre requests`);
    }

    if (diagnosticoFirmante.tiempoRespuesta > 10000 || diagnosticoCofirmante.tiempoRespuesta > 10000) {
      recomendaciones.push('🐌 Respuestas lentas detectadas - aumentar timeouts y considerar processing nocturno');
    }

    const diferenciaBD = (diagnosticoFirmante.totalProyectos + diagnosticoCofirmante.totalProyectos) - proyectosExistentes.totalGeneral;
    if (diferenciaBD > 100) {
      recomendaciones.push(`📊 Diferencia significativa con BD (${diferenciaBD} proyectos) - necesario sincronización completa`);
    }

    const resultado: DiagnosticoDetallado = {
      diputado: {
        nombre: diputado.nombre,
        slug: diputado.slug,
        _id: String(diputado._id)
      },
      diagnostico: {
        firmante: diagnosticoFirmante,
        cofirmante: diagnosticoCofirmante
      },
      proyectosEnBD: proyectosExistentes,
      recomendaciones
    };

    console.log('✅ Diagnóstico completado');

    return new Response(JSON.stringify(resultado, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Error en diagnóstico:', error);
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
