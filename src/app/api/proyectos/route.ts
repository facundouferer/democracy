import { NextRequest } from 'next/server';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Proyecto from '@/models/Proyecto';

export async function GET(request: NextRequest) {
  // Validar API Key
  if (!validateApiKey(request)) {
    return createUnauthorizedResponse();
  }

  try {
    await connectDB();

    const url = new URL(request.url);
    const limite = parseInt(url.searchParams.get('limit') || '50');
    const pagina = parseInt(url.searchParams.get('page') || '1');
    const tipo = url.searchParams.get('tipo');
    const diputadoId = url.searchParams.get('diputadoId');
    const diputadoSlug = url.searchParams.get('diputadoSlug');
    const ordenar = url.searchParams.get('sort') || 'fecha';
    const direccion = url.searchParams.get('direction') || 'desc';

    // Construir filtros
    interface FiltroConsulta {
      tipo?: RegExp;
      diputadoId?: string;
      diputadoSlug?: string;
    }

    const filtros: FiltroConsulta = {};

    if (tipo) {
      filtros.tipo = new RegExp(tipo, 'i');
    }

    if (diputadoId) {
      filtros.diputadoId = diputadoId;
    }

    if (diputadoSlug) {
      filtros.diputadoSlug = diputadoSlug;
    }

    // Construir query
    let query = Proyecto.find(filtros);

    // Aplicar ordenamiento
    const sortDirection = direccion === 'desc' ? -1 : 1;
    query = query.sort({ [ordenar]: sortDirection });

    // Aplicar paginación
    if (limite > 0) {
      const skip = (pagina - 1) * limite;
      query = query.skip(skip).limit(limite);
    }

    // Ejecutar consulta
    const proyectos = await query.exec();

    // Obtener estadísticas
    const total = await Proyecto.countDocuments(filtros);

    // Estadísticas por tipo
    const porTipo = await Proyecto.aggregate([
      { $match: filtros },
      { $group: { _id: '$tipo', cantidad: { $sum: 1 } } },
      { $sort: { cantidad: -1 } }
    ]);

    // Estadísticas por año
    const porAño = await Proyecto.aggregate([
      { $match: filtros },
      {
        $group: {
          _id: { $year: '$fecha' },
          cantidad: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        data: proyectos,
        paginacion: {
          total,
          pagina,
          limite,
          totalPaginas: limite > 0 ? Math.ceil(total / limite) : 1
        },
        estadisticas: {
          porTipo: porTipo.map(t => ({ tipo: t._id, cantidad: t.cantidad })),
          porAño: porAño.map(a => ({ año: a._id, cantidad: a.cantidad }))
        },
        filtros: {
          tipo,
          diputadoId,
          diputadoSlug,
          ordenar,
          direccion
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[PROYECTOS] Error consultando proyectos:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error al consultar proyectos',
        details: error instanceof Error ? error.message : 'Error desconocido'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
