import LegislatorsGridClient, {
  LegislatorCard,
} from '@/components/legislators-grid-client';
import SectionNav from '@/components/section-nav';
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
      <SectionNav />

      <section className="hero">
        <p className="eyebrow">República Argentina</p>
        <h1>Elegidos por el Pueblo</h1>
      </section>

      <section className="list-section">
        <div className="list-header">
          <h2>Diputados de los Reinos Unidos</h2>
          <span>{diputados.length} diputados</span>
        </div>

        <LegislatorsGridClient
          items={diputados.map((diputado) => ({
            tipo: 'diputado',
            slug: diputado.slug,
            nombre: diputado.nombre,
            apellido: diputado.apellido,
            distrito: diputado.distrito,
            bloque: diputado.bloque,
            mandato: diputado.mandato,
            profesion: diputado.profesion,
            fecha_nacimiento: diputado.fecha_nacimiento,
            total_proyectos: diputado.total_proyectos ?? 0,
            foto: diputado.foto,
            link: diputado.link,
            resumen: diputado.resumen,
          })) satisfies LegislatorCard[]}
        />
      </section>
    </main>
  );
}
