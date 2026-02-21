import mongoose, { Document, Schema } from 'mongoose';

export interface ISenador extends Document {
  nombre: string;
  distrito: string;
  bloque: string;
  mandato: string;
  total_proyectos: number;
  foto: string;
  link: string;
  resumen?: string;
  fechaActualizacion: Date;
}

const SenadorSchema = new Schema<ISenador>(
  {
    nombre: { type: String, required: true, index: true },
    distrito: { type: String, required: true, index: true },
    bloque: { type: String, required: true, index: true },
    mandato: { type: String, required: true, index: true },
    total_proyectos: { type: Number, required: true, default: 0, index: true },
    foto: { type: String, required: true },
    link: { type: String, required: true, unique: true, index: true },
    resumen: { type: String, default: '' },
    fechaActualizacion: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
    collection: 'senadores-nacionales',
  }
);

SenadorSchema.index({ nombre: 1, distrito: 1 });

const Senador = mongoose.models.Senador || mongoose.model<ISenador>('Senador', SenadorSchema);

export default Senador;
