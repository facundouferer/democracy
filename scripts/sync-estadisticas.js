// Script para sincronizar estadísticas de diputados
// node scripts/sync-estadisticas.js

const mongoose = require('mongoose');

// Configurar conexión a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://facundouferer:YsGCSm0ibByivoYW@cluster0.p0tiuea.mongodb.net/monitor?retryWrites=true&w=majority&appName=Cluster0';

console.log('🔄 Iniciando sincronización de estadísticas...');
console.log('🔗 MongoDB URI:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));

// Schemas simplificados para el script
const DiputadoSchema = new mongoose.Schema({
  slug: String,
  nombre: String,
  proyectosLeyFirmante: { type: Number, default: 0 },
  proyectosLeyCofirmante: { type: Number, default: 0 },
  estado: String,
  fechaActualizacion: Date
}, { collection: 'diputados' });

const ProyectoSchema = new mongoose.Schema({
  diputadoSlug: String,
  tipoFirmante: String,
  expediente: String
}, { collection: 'proyectos' });

async function syncEstadisticas() {
  try {
    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    const Diputado = mongoose.model('Diputado', DiputadoSchema);
    const Proyecto = mongoose.model('Proyecto', ProyectoSchema);

    // Primero verificar cuántos proyectos hay
    const totalProyectos = await Proyecto.countDocuments();
    console.log(`📊 Total de proyectos en la base de datos: ${totalProyectos}`);

    if (totalProyectos === 0) {
      console.log('⚠️  No hay proyectos en la base de datos. No se pueden calcular estadísticas.');
      await mongoose.disconnect();
      return;
    }

    console.log('📊 Calculando estadísticas de proyectos...');

    // Obtener conteos de proyectos por diputado y tipo de firmante
    const estadisticasProyectos = await Proyecto.aggregate([
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

    console.log(`📈 Encontradas estadísticas para ${estadisticasProyectos.length} diputados con proyectos`);

    let actualizados = 0;
    let errores = 0;

    // Actualizar cada diputado
    for (const estadistica of estadisticasProyectos) {
      try {
        const slug = estadistica._id;

        // Calcular conteos por tipo
        const firmante = estadistica.proyectos.find(p => p.tipo === 'firmante')?.cantidad || 0;
        const cofirmante = estadistica.proyectos.find(p => p.tipo === 'cofirmante')?.cantidad || 0;

        // Actualizar el diputado
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
          if (actualizados <= 10) { // Solo mostrar los primeros 10 para no abrumar
            console.log(`✅ ${slug}: ${firmante} firmante, ${cofirmante} cofirmante`);
          }
        } else {
          console.log(`⚠️  No se encontró diputado con slug: ${slug}`);
        }

      } catch (error) {
        errores++;
        console.error(`❌ Error actualizando ${estadistica._id}:`, error.message);
      }
    }

    console.log(`✅ Actualizados ${actualizados} diputados con proyectos`);

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

    console.log(`🔄 Reseteo ${resultadoReset.modifiedCount} diputados sin proyectos`);

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

    console.log('\n🎉 Sincronización completada!');
    console.log('📊 Resumen:');
    console.log(`   - Diputados actualizados: ${actualizados}`);
    console.log(`   - Diputados resetados: ${resultadoReset.modifiedCount}`);
    console.log(`   - Errores: ${errores}`);
    console.log('\n📈 Estadísticas generales:');
    console.log(`   - Total activos: ${estadisticasGenerales.totalActivos}`);
    console.log(`   - Total proyectos firmante: ${estadisticasGenerales.totalProyectosFirmante}`);
    console.log(`   - Total proyectos cofirmante: ${estadisticasGenerales.totalProyectosCofirmante}`);
    console.log(`   - Promedio proyectos: ${Math.round(estadisticasGenerales.promedioProyectosFirmante || 0)}`);
    console.log(`   - Diputados con proyectos: ${estadisticasGenerales.diputadosConProyectos}`);

    await mongoose.disconnect();
    console.log('\n✅ Desconectado de MongoDB');

  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  syncEstadisticas();
}

module.exports = { syncEstadisticas };
