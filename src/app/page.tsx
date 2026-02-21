import Image from 'next/image';
import Link from 'next/link';

import connectDB from '@/lib/mongodb';
import Diputado from '@/models/Diputado';

export const dynamic = 'force-dynamic';

function getBloqueInitial(bloque: string): string {
  const normalized = (bloque || '').trim();
  if (!normalized) {
    return '?';
  }

  const match = normalized.match(/[A-Za-zÁÉÍÓÚÜÑ]/);
  return (match?.[0] || normalized[0]).toUpperCase();
}

async function getDiputados() {
  await connectDB();
  return Diputado.find({}).sort({ apellido: 1, nombre: 1 }).lean();
}

export default async function HomePage() {
  const diputados = await getDiputados();

  return (
    <main className="page-shell">
      <header className="site-nav">
        <nav>
          <Link href="/" className="active">
            Diputados
          </Link>
          <Link href="/senado">Senadores</Link>
        </nav>
      </header>

      <section className="hero">
        <p className="eyebrow">República Argentina</p>
        <h1>Elegidos por el Pueblo</h1>
      </section>

      <section className="list-section">
        <div className="list-header">
          <h2>Diputados de los Reinos Unidos</h2>
          <span>{diputados.length} diputados</span>
        </div>

        <div className="cards-grid">
          {diputados.map((diputado) => (
            <article key={diputado.slug} className="dip-card ornate-border">
              <div className="block-badge" aria-hidden="true">
                <Image src="/img/escudo.svg" alt="" width={52} height={52} />
                <span>{getBloqueInitial(diputado.bloque)}</span>
              </div>

              <div className="card-photo gold-rim">
                <Image
                  src={diputado.foto}
                  alt={`${diputado.nombre} ${diputado.apellido}`}
                  width={176}
                  height={176}
                />
              </div>
              <h3>
                {diputado.apellido}, {diputado.nombre}
              </h3>

              <div className="card-meta">
                <p>
                  <strong>Reino</strong>
                  <span>{diputado.distrito}</span>
                </p>
                <p>
                  <strong>Bloque</strong>
                  <span>{diputado.bloque}</span>
                </p>
                <p>
                  <strong>Mandato</strong>
                  <span>{diputado.mandato}</span>
                </p>
                <p>
                  <strong>Clase</strong>
                  <span>{diputado.profesion || 'N/D'}</span>
                </p>
                <p>
                  <strong>Nacimiento</strong>
                  <span>{diputado.fecha_nacimiento || 'N/D'}</span>
                </p>
              </div>

              <div className="quests-wrap">
                <span className="quests-label">Proyectos</span>
                <div className="rhombus">
                  <span className="rhombus-content">{diputado.total_proyectos ?? 0}</span>
                </div>
              </div>

              <a className="wood-plaque" href={diputado.link} target="_blank" rel="noreferrer">
                Ver perfil oficial
              </a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
