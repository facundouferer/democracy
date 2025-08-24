import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Diputado from '@/models/Diputado';
import Proyecto from '@/models/Proyecto';

// Interfaces para tipado
interface ProyectoTipo {
  tipo: 'firmante' | 'cofirmante';
  cantidad: number;
}

interface EstadisticaProyecto {
  _id: string;
  proyectos: ProyectoTipo[];
}

export async function POST(request: NextRequest) {
  try {
    // Verificar API key
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey || !['dev-997e7e8d-982bd538-63c9431c', 'prod-key-placeholder'].includes(apiKey)) {
      return Response.json({
        success: false,
        error: 'API key requerida o inválida'
      }, { status: 401 });
    }

    await connectDB();

    console.log('[SYNC-ESTADISTICAS] Iniciando sincronización de estadísticas de diputados...');

    // Obtener conteos de proyectos por diputado y tipo de firmante
    const estadisticasProyectos: EstadisticaProyecto[] = await Proyecto.aggregate([
      {
        $group: {
          _id: {
            diputadoSlug: '$diputadoSlug',
            tipoFirmante: '$tipoFirmante'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.diputadoSlug',
          proyectos: {
            $push: {
              tipo: '$_id.tipoFirmante',
              cantidad: '$count'
            }
          }
        }
      }
    ]);

    console.log(`[SYNC-ESTADISTICAS] Encontradas estadísticas para ${estadisticasProyectos.length} diputados`);

    let actualizados = 0;
    let errores = 0;

    // Actualizar cada diputado
    for (const estadistica of estadisticasProyectos) {
      try {
        const slug = estadistica._id;

        // Calcular conteos por tipo
        const firmante = estadistica.proyectos.find((p: ProyectoTipo) => p.tipo === 'firmante')?.cantidad || 0;
        const cofirmante = estadistica.proyectos.find((p: ProyectoTipo) => p.tipo === 'cofirmante')?.cantidad || 0;        // Actualizar el diputado
        const resultado = await Diputado.updateOne(
          { slug: slug },
          {
            $set: {
              proyectosLeyFirmante: firmante,
              proyectosLeyCofirmante: cofirmante,
              fechaActualizacion: new Date()
            }
          }
        );

        if (resultado.matchedCount > 0) {
          actualizados++;
          console.log(`[SYNC-ESTADISTICAS] Actualizado ${slug}: ${firmante} firmante, ${cofirmante} cofirmante`);
        } else {
          console.log(`[SYNC-ESTADISTICAS] No se encontró diputado con slug: ${slug}`);
        }

      } catch (error) {
        errores++;
        console.error(`[SYNC-ESTADISTICAS] Error actualizando estadísticas para ${estadistica._id}:`, error);
      }
    }

    // También resetear diputados sin proyectos a 0
    const resultadoReset = await Diputado.updateMany(
      {
        slug: { $nin: estadisticasProyectos.map(e => e._id) }
      },
      {
        $set: {
          proyectosLeyFirmante: 0,
          proyectosLeyCofirmante: 0,
          fechaActualizacion: new Date()
        }
      }
    );

    console.log(`[SYNC-ESTADISTICAS] Reseteo ${resultadoReset.modifiedCount} diputados sin proyectos`);

    // Calcular estadísticas finales
    const estadisticasFinales = await Diputado.aggregate([
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
    ]);

    const estadisticasGenerales = estadisticasFinales[0] || {
      totalActivos: 0,
      totalProyectosFirmante: 0,
      totalProyectosCofirmante: 0,
      promedioProyectosFirmante: 0,
      diputadosConProyectos: 0
    };

    console.log('[SYNC-ESTADISTICAS] Sincronización completada');
    console.log('[SYNC-ESTADISTICAS] Estadísticas actualizadas:', estadisticasGenerales);

    return Response.json({
      success: true,
      message: 'Estadísticas de diputados sincronizadas exitosamente',
      resultado: {
        diputadosActualizados: actualizados,
        diputadosResetados: resultadoReset.modifiedCount,
        errores: errores,
        estadisticasGenerales
      }
    });

  } catch (error) {
    console.error('[SYNC-ESTADISTICAS] Error en sincronización:', error);

    return Response.json({
      success: false,
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
