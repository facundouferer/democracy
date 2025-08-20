import { NextRequest } from 'next/server';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Diputado from '@/models/Diputado';

export async function GET(request: NextRequest) {
  // Validar API Key
  if (!validateApiKey(request)) {
    return createUnauthorizedResponse();
  }

  try {
    // Conectar a MongoDB
    await connectDB();

    // Obtener parámetros de consulta
    const url = new URL(request.url);
    const limite = parseInt(url.searchParams.get('limit') || '0');
    const pagina = parseInt(url.searchParams.get('page') || '1');
    const distrito = url.searchParams.get('distrito');
    const bloque = url.searchParams.get('bloque');
    const estado = url.searchParams.get('estado') || 'activo';
    const ordenar = url.searchParams.get('sort') || 'nombre';
    const direccion = url.searchParams.get('direction') || 'asc';

    // Construir filtros
    interface FiltroConsulta {
      estado: string;
      distrito?: RegExp;
      bloque?: RegExp;
    }

    const filtros: FiltroConsulta = { estado };

    if (distrito) {
      filtros.distrito = new RegExp(distrito, 'i');
    }

    if (bloque) {
      filtros.bloque = new RegExp(bloque, 'i');
    }

    // Construir query
    let query = Diputado.find(filtros);

    // Aplicar ordenamiento
    const sortDirection = direccion === 'desc' ? -1 : 1;
    query = query.sort({ [ordenar]: sortDirection });

    // Aplicar paginación
    if (limite > 0) {
      const skip = (pagina - 1) * limite;
      query = query.skip(skip).limit(limite);
    }

    // Ejecutar consulta
    const diputados = await query.exec();

    // Obtener estadísticas
    const total = await Diputado.countDocuments(filtros);
    const totalActivos = await Diputado.countDocuments({ estado: 'activo' });
    const totalInactivos = await Diputado.countDocuments({ estado: 'inactivo' });

    // Estadísticas por distrito
    const porDistrito = await Diputado.aggregate([
      { $match: { estado: 'activo' } },
      { $group: { _id: '$distrito', cantidad: { $sum: 1 } } },
      { $sort: { cantidad: -1 } },
      { $limit: 10 }
    ]);

    // Estadísticas por bloque
    const porBloque = await Diputado.aggregate([
      { $match: { estado: 'activo' } },
      { $group: { _id: '$bloque', cantidad: { $sum: 1 } } },
      { $sort: { cantidad: -1 } },
      { $limit: 10 }
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Datos obtenidos desde base de datos',
        data: diputados,
        paginacion: {
          total,
          pagina,
          limite,
          totalPaginas: limite > 0 ? Math.ceil(total / limite) : 1
        },
        estadisticas: {
          totalActivos,
          totalInactivos,
          ultimaActualizacion: diputados.length > 0 ?
            Math.max(...diputados.map(d => d.fechaActualizacion?.getTime() || 0)) : null,
          porDistrito: porDistrito.map(d => ({ distrito: d._id, cantidad: d.cantidad })),
          porBloque: porBloque.map(b => ({ bloque: b._id, cantidad: b.cantidad }))
        },
        filtros: {
          distrito,
          bloque,
          estado,
          ordenar,
          direccion
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('[DB] Error consultando datos:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error al consultar la base de datos',
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
