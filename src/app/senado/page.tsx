import LegislatorsGridClient, {
  LegislatorCard,
} from '@/components/legislators-grid-client';
import SectionNav from '@/components/section-nav';
import { scrapeSenadores } from '@/lib/scrape-senadores';

export const dynamic = 'force-dynamic';

export default async function SenadoPage() {
  const senadores = await scrapeSenadores();

  return (
    <main className="page-shell">
      <SectionNav />

      <section className="hero">
        <p className="eyebrow">Honorable Senado de la Nación</p>
        <h1>Senadores Nacionales</h1>
      </section>

      <section className="list-section">
        <div className="list-header">
          <h2>Cámara Alta</h2>
          <span>{senadores.length} senadores</span>
        </div>

        <LegislatorsGridClient
          items={senadores.map((senador) => ({
            tipo: 'senador',
            nombre: senador.nombre,
            distrito: senador.distrito,
            bloque: senador.bloque,
            mandato: senador.mandato,
            total_proyectos: senador.total_proyectos ?? 0,
            foto: senador.foto,
            link: senador.link,
          })) satisfies LegislatorCard[]}
        />
      </section>
    </main>
  );
}
