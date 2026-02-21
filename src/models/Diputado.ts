import mongoose, { Document, Schema } from 'mongoose';

export interface IDiputado extends Document {
  nombre: string;
  apellido: string;
  distrito: string;
  bloque: string;
  mandato: string;
  profesion?: string;
  fecha_nacimiento?: string;
  total_proyectos: number;
  resumen?: string;
  foto: string;
  link: string;
  slug: string;
  fechaActualizacion: Date;
}

const DiputadoSchema = new Schema<IDiputado>(
  {
    nombre: { type: String, required: true, index: true },
    apellido: { type: String, required: true, index: true },
    distrito: { type: String, required: true, index: true },
    bloque: { type: String, required: true, index: true },
    mandato: { type: String, required: true, index: true },
    profesion: { type: String, default: '' },
    fecha_nacimiento: { type: String, default: '' },
    total_proyectos: { type: Number, required: true, default: 0, index: true },
    resumen: { type: String, default: '' },
    foto: { type: String, required: true },
    link: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true, index: true },
    fechaActualizacion: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
    collection: 'diputados-nacionales',
  }
);

DiputadoSchema.index({ apellido: 1, nombre: 1 });
DiputadoSchema.index({ distrito: 1, bloque: 1 });

const Diputado =
  mongoose.models.Diputado || mongoose.model<IDiputado>('Diputado', DiputadoSchema);

export default Diputado;
