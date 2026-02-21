import Image from 'next/image';
import Link from 'next/link';

import { scrapeSenadores } from '@/lib/scrape-senadores';

export const dynamic = 'force-dynamic';

function getBloqueInitial(bloque: string): string {
  const normalized = (bloque || '').trim();
  if (!normalized) {
    return '?';
  }

  const match = normalized.match(/[A-Za-zÁÉÍÓÚÜÑ]/);
  return (match?.[0] || normalized[0]).toUpperCase();
}

export default async function SenadoPage() {
  const senadores = await scrapeSenadores();

  return (
    <main className="page-shell">
      <header className="site-nav">
        <nav>
          <Link href="/">Diputados</Link>
          <Link href="/senado" className="active">
            Senadores
          </Link>
        </nav>
      </header>

      <section className="hero">
        <p className="eyebrow">Honorable Senado de la Nación</p>
        <h1>Senadores Nacionales</h1>
      </section>

      <section className="list-section">
        <div className="list-header">
          <h2>Cámara Alta</h2>
          <span>{senadores.length} senadores</span>
        </div>

        <div className="cards-grid">
          {senadores.map((senador) => (
            <article key={senador.link} className="dip-card ornate-border">
              <div className="block-badge" aria-hidden="true">
                <Image src="/img/escudo.svg" alt="" width={52} height={52} />
                <span>{getBloqueInitial(senador.bloque)}</span>
              </div>

              <div className="card-photo gold-rim">
                <Image src={senador.foto} alt={senador.nombre} width={176} height={176} />
              </div>

              <h3>{senador.nombre}</h3>

              <div className="card-meta">
                <p>
                  <strong>Distrito</strong>
                  <span>{senador.distrito}</span>
                </p>
                <p>
                  <strong>Bloque</strong>
                  <span>{senador.bloque}</span>
                </p>
                <p>
                  <strong>Mandato</strong>
                  <span>{senador.mandato}</span>
                </p>
                <p>
                  <strong>Email</strong>
                  <span>{senador.email || 'N/D'}</span>
                </p>
              </div>

              <div className="quests-wrap">
                <span className="quests-label">Proyectos</span>
                <div className="rhombus">
                  <span className="rhombus-content">{senador.total_proyectos ?? 0}</span>
                </div>
              </div>

              <a className="wood-plaque" href={senador.link} target="_blank" rel="noreferrer">
                Ver perfil oficial
              </a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
