import mongoose from 'mongoose';

const ProyectoSchema = new mongoose.Schema({
  expediente: {
    type: String,
    required: true
  },
  tipo: {
    type: String,
    required: true,
    index: true
  },
  sumario: {
    type: String,
    required: true
  },
  fecha: {
    type: Date,
    required: true,
    index: true
  },
  enlace: {
    type: String,
    required: true
  },
  diputadoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Diputado',
    required: true,
    index: true
  },
  diputadoNombre: {
    type: String,
    required: true,
    index: true
  },
  diputadoSlug: {
    type: String,
    required: true,
    index: true
  },
  tipoFirmante: {
    type: String,
    enum: ['firmante', 'cofirmante'],
    required: true,
    index: true
  },
  fechaCreacion: {
    type: Date,
    default: Date.now,
    index: true
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices compuestos para optimizar consultas
ProyectoSchema.index({ diputadoId: 1, expediente: 1 }, { unique: true });
ProyectoSchema.index({ tipo: 1, fecha: -1 });
ProyectoSchema.index({ diputadoSlug: 1, fecha: -1 });
ProyectoSchema.index({ expediente: 1 }, { unique: true });

// Middleware para actualizar fechaActualizacion
ProyectoSchema.pre('save', function (next) {
  this.fechaActualizacion = new Date();
  next();
});

const Proyecto = mongoose.models.Proyecto || mongoose.model('Proyecto', ProyectoSchema);

export default Proyecto;
