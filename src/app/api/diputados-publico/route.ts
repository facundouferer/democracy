import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Diputado from '@/models/Diputado';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parámetros de consulta
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Máximo 100 por página
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const distrito = searchParams.get('distrito') || '';
    const bloque = searchParams.get('bloque') || '';
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'nombre';
    const direction = searchParams.get('direction') === 'desc' ? -1 : 1;

    // Conectar a MongoDB
    await connectDB();

    // Construir filtros
    const filtros: any = {
      estado: 'activo' // Solo diputados activos por defecto
    };

    if (distrito) {
      filtros.distrito = { $regex: distrito, $options: 'i' };
    }

    if (bloque) {
      filtros.bloque = { $regex: bloque, $options: 'i' };
    }

    if (search) {
      filtros.$or = [
        { nombre: { $regex: search, $options: 'i' } },
        { distrito: { $regex: search, $options: 'i' } },
        { bloque: { $regex: search, $options: 'i' } },
        { profesion: { $regex: search, $options: 'i' } }
      ];
    }

    // Calcular skip
    const skip = (page - 1) * limit;

    // Ejecutar consulta con agregación para obtener datos y estadísticas
    const [diputados, totalCount, estadisticas] = await Promise.all([
      // Consulta principal de diputados
      Diputado.find(filtros)
        .select({
          slug: 1,
          foto: 1,
          nombre: 1,
          distrito: 1,
          bloque: 1,
          mandato: 1,
          inicioMandato: 1,
          finMandato: 1,
          profesion: 1,
          email: 1,
          proyectosLeyFirmante: 1,
          proyectosLeyCofirmante: 1,
          fechaActualizacion: 1
        })
        .sort({ [sort]: direction })
        .skip(skip)
        .limit(limit)
        .lean(),

      // Conteo total
      Diputado.countDocuments(filtros),

      // Estadísticas generales
      Diputado.aggregate([
        { $match: { estado: 'activo' } },
        {
          $group: {
            _id: null,
            totalActivos: { $sum: 1 },
            totalProyectosFirmante: { $sum: '$proyectosLeyFirmante' },
            totalProyectosCofirmante: { $sum: '$proyectosLeyCofirmante' },
            promedioProyectosFirmante: { $avg: '$proyectosLeyFirmante' },
            diputadosConProyectos: {
              $sum: {
                $cond: [{ $gt: ['$proyectosLeyFirmante', 0] }, 1, 0]
              }
            }
          }
        }
      ])
    ]);

    // Estadísticas por distrito y bloque
    const [porDistrito, porBloque] = await Promise.all([
      Diputado.aggregate([
        { $match: { estado: 'activo' } },
        {
          $group: {
            _id: '$distrito',
            count: { $sum: 1 },
            totalProyectos: { $sum: '$proyectosLeyFirmante' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),

      Diputado.aggregate([
        { $match: { estado: 'activo' } },
        {
          $group: {
            _id: '$bloque',
            count: { $sum: 1 },
            totalProyectos: { $sum: '$proyectosLeyFirmante' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    // Calcular páginas
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return Response.json({
      success: true,
      data: diputados,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPrevPage
      },
      stats: {
        general: estadisticas[0] || {
          totalActivos: 0,
          totalProyectosFirmante: 0,
          totalProyectosCofirmante: 0,
          promedioProyectosFirmante: 0,
          diputadosConProyectos: 0
        },
        porDistrito,
        porBloque
      },
      filters: {
        distrito,
        bloque,
        search,
        sort,
        direction: direction === 1 ? 'asc' : 'desc'
      }
    });

  } catch (error) {
    console.error('[PÚBLICO] Error en consulta de diputados:', error);

    return Response.json(
      {
        success: false,
        error: 'Error interno del servidor',
        message: 'No se pudieron obtener los datos de los diputados'
      },
      { status: 500 }
    );
  }
}
