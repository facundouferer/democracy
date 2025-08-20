import mongoose, { Schema, Document } from 'mongoose';

export interface IDiputado extends Document {
  // Información básica
  foto: string;
  nombre: string;
  link: string;
  distrito: string;
  mandato: string;
  inicioMandato: Date;
  finMandato: Date;
  bloque: string;

  // Detalles individuales
  fotoCompleta?: string;
  profesion?: string;
  fechaNacimiento?: Date;
  email?: string;

  // Actividad legislativa
  proyectosLeyFirmante?: number;
  proyectosLeyCofirmante?: number;

  // Metadatos
  slug: string; // Identificador único extraído del link
  fechaActualizacion: Date;
  estado: 'activo' | 'inactivo';
}

const DiputadoSchema: Schema = new Schema({
  // Información básica
  foto: { type: String, required: true },
  nombre: { type: String, required: true, index: true },
  link: { type: String, required: true, unique: true },
  distrito: { type: String, required: true, index: true },
  mandato: { type: String, required: true },
  inicioMandato: { type: Date, required: true },
  finMandato: { type: Date, required: true },
  bloque: { type: String, required: true, index: true },

  // Detalles individuales
  fotoCompleta: { type: String },
  profesion: { type: String },
  fechaNacimiento: { type: Date },
  email: { type: String, lowercase: true },

  // Actividad legislativa
  proyectosLeyFirmante: { type: Number, default: 0 },
  proyectosLeyCofirmante: { type: Number, default: 0 },

  // Metadatos
  slug: { type: String, required: true, unique: true, index: true },
  fechaActualizacion: { type: Date, default: Date.now },
  estado: { type: String, enum: ['activo', 'inactivo'], default: 'activo' }
}, {
  timestamps: true,
  collection: 'diputados'
});

// Índices compuestos para consultas eficientes
DiputadoSchema.index({ distrito: 1, bloque: 1 });
DiputadoSchema.index({ mandato: 1, estado: 1 });
DiputadoSchema.index({ fechaActualizacion: -1 });

export default mongoose.models.Diputado || mongoose.model<IDiputado>('Diputado', DiputadoSchema);
