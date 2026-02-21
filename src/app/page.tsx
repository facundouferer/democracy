import Image from 'next/image';

import connectDB from '@/lib/mongodb';
import Diputado from '@/models/Diputado';

export const dynamic = 'force-dynamic';

async function getDiputados() {
  await connectDB();
  return Diputado.find({}).sort({ apellido: 1, nombre: 1 }).lean();
}

export default async function HomePage() {
  const diputados = await getDiputados();

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">República Argentina</p>
        <h1>Diputados Nacionales</h1>
      </section>

      <section className="list-section">
        <div className="list-header">
          <span>{diputados.length} diputados</span>
        </div>

        <div className="cards-grid">
          {diputados.map((diputado) => (
            <article key={diputado.slug} className="dip-card">
              <div className="card-photo">
                <Image
                  src={diputado.foto}
                  alt={`${diputado.nombre} ${diputado.apellido}`}
                  width={130}
                  height={130}
                />
              </div>
              <h3>
                {diputado.apellido}, {diputado.nombre}
              </h3>
              <p>
                <strong>Distrito:</strong> {diputado.distrito}
              </p>
              <p>
                <strong>Bloque:</strong> {diputado.bloque}
              </p>
              <p>
                <strong>Mandato:</strong> {diputado.mandato}
              </p>
              <p>
                <strong>Profesión:</strong> {diputado.profesion || 'N/D'}
              </p>
              <p>
                <strong>Fecha de Nac.:</strong> {diputado.fecha_nacimiento || 'N/D'}
              </p>
              <p>
                <strong>Total proyectos:</strong> {diputado.total_proyectos ?? 0}
              </p>
              <a href={diputado.link} target="_blank" rel="noreferrer">
                Ver perfil oficial
              </a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
