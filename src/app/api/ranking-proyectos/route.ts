import connectDB from '@/lib/mongodb';
import Diputado from '@/models/Diputado';

export async function GET() {
  try {
    await connectDB();

    // Obtener ranking de diputados por cantidad de proyectos
    const rankingDiputados = await Diputado.aggregate([
      {
        $addFields: {
          totalProyectos: {
            $add: [
              { $ifNull: ['$proyectosLeyFirmante', 0] },
              { $ifNull: ['$proyectosLeyCofirmante', 0] }
            ]
          }
        }
      },
      {
        $match: {
          totalProyectos: { $gt: 0 }
        }
      },
      {
        $sort: { totalProyectos: -1 }
      },
      {
        $project: {
          nombre: 1,
          distrito: 1,
          bloque: 1,
          proyectosLeyFirmante: { $ifNull: ['$proyectosLeyFirmante', 0] },
          proyectosLeyCofirmante: { $ifNull: ['$proyectosLeyCofirmante', 0] },
          totalProyectos: 1,
          foto: 1
        }
      },
      {
        $limit: 50 // Top 50 diputados
      }
    ]);

    // Obtener estadísticas por bloque
    const estadisticasBloques = await Diputado.aggregate([
      {
        $match: {
          $and: [
            { bloque: { $exists: true } },
            { bloque: { $ne: null } },
            { bloque: { $ne: '' } }
          ]
        }
      },
      {
        $group: {
          _id: '$bloque',
          cantidadDiputados: { $sum: 1 },
          totalProyectosFirmante: {
            $sum: { $ifNull: ['$proyectosLeyFirmante', 0] }
          },
          totalProyectosCofirmante: {
            $sum: { $ifNull: ['$proyectosLeyCofirmante', 0] }
          }
        }
      },
      {
        $addFields: {
          totalProyectos: {
            $add: ['$totalProyectosFirmante', '$totalProyectosCofirmante']
          }
        }
      },
      {
        $sort: { totalProyectos: -1 }
      },
      {
        $project: {
          bloque: '$_id',
          cantidadDiputados: 1,
          totalProyectosFirmante: 1,
          totalProyectosCofirmante: 1,
          totalProyectos: 1,
          promedioProyectos: {
            $round: [
              { $divide: ['$totalProyectos', '$cantidadDiputados'] },
              2
            ]
          }
        }
      }
    ]);

    // Calcular estadísticas generales
    const estadisticasGenerales = await Diputado.aggregate([
      {
        $group: {
          _id: null,
          totalDiputados: { $sum: 1 },
          totalProyectosFirmante: {
            $sum: { $ifNull: ['$proyectosLeyFirmante', 0] }
          },
          totalProyectosCofirmante: {
            $sum: { $ifNull: ['$proyectosLeyCofirmante', 0] }
          },
          maxProyectosFirmante: {
            $max: { $ifNull: ['$proyectosLeyFirmante', 0] }
          },
          maxProyectosCofirmante: {
            $max: { $ifNull: ['$proyectosLeyCofirmante', 0] }
          }
        }
      },
      {
        $addFields: {
          totalProyectosGeneral: {
            $add: ['$totalProyectosFirmante', '$totalProyectosCofirmante']
          }
        }
      }
    ]);

    return Response.json({
      success: true,
      data: {
        ranking: rankingDiputados,
        bloques: estadisticasBloques,
        estadisticas: estadisticasGenerales[0] || {
          totalDiputados: 0,
          totalProyectosFirmante: 0,
          totalProyectosCofirmante: 0,
          totalProyectosGeneral: 0,
          maxProyectosFirmante: 0,
          maxProyectosCofirmante: 0
        }
      }
    });

  } catch (error) {
    console.error('Error al obtener ranking de proyectos:', error);

    return Response.json(
      {
        success: false,
        error: 'Error al obtener ranking de proyectos',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
