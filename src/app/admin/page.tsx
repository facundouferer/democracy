import Image from 'next/image';
import { redirect } from 'next/navigation';

import AdminPanelClient from './AdminPanelClient';
import { getAdminSession } from '@/lib/admin-auth';
import connectDB from '@/lib/mongodb';
import Diputado from '@/models/Diputado';
import Senador from '@/models/Senador';

export const dynamic = 'force-dynamic';

async function getDiputados() {
  await connectDB();
  return Diputado.find({}).sort({ apellido: 1, nombre: 1 }).lean();
}

async function getSenadores() {
  await connectDB();
  return Senador.find({}).sort({ nombre: 1 }).lean();
}

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect('/admin/login');
  }

  const [diputados, senadores] = await Promise.all([getDiputados(), getSenadores()]);

  return (
    <main className="admin-shell">
      <section className="admin-hero">
        <p className="eyebrow">Administrador</p>
        <h1>Diputados y Senadores Nacionales</h1>
        <p>
          Usuario autenticado: <strong>{session.email}</strong>
        </p>
        <AdminPanelClient />
      </section>

      <section className="admin-table-wrap">
        <div className="list-header">
          <h2>Diputados en base</h2>
          <span>{diputados.length} registros</span>
        </div>

        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Foto</th>
                <th>Apellido</th>
                <th>Nombre</th>
                <th>Distrito</th>
                <th>Bloque</th>
                <th>Mandato</th>
                <th>Profesión</th>
                <th>Fecha de Nac.</th>
                <th>Total proyectos</th>
              </tr>
            </thead>
            <tbody>
              {diputados.map((diputado) => (
                <tr key={diputado.slug}>
                  <td>
                    <Image
                      src={diputado.foto}
                      alt={`${diputado.nombre} ${diputado.apellido}`}
                      width={54}
                      height={54}
                    />
                  </td>
                  <td>{diputado.apellido}</td>
                  <td>{diputado.nombre}</td>
                  <td>{diputado.distrito}</td>
                  <td>{diputado.bloque}</td>
                  <td>{diputado.mandato}</td>
                  <td>{diputado.profesion || 'N/D'}</td>
                  <td>{diputado.fecha_nacimiento || 'N/D'}</td>
                  <td>{diputado.total_proyectos ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-table-wrap">
        <div className="list-header">
          <h2>Senadores en base</h2>
          <span>{senadores.length} registros</span>
        </div>

        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Foto</th>
                <th>Nombre</th>
                <th>Distrito</th>
                <th>Bloque</th>
                <th>Mandato</th>
                <th>Total proyectos</th>
              </tr>
            </thead>
            <tbody>
              {senadores.map((senador) => (
                <tr key={senador.link}>
                  <td>
                    <Image
                      src={senador.foto}
                      alt={senador.nombre}
                      width={54}
                      height={54}
                    />
                  </td>
                  <td>{senador.nombre}</td>
                  <td>{senador.distrito}</td>
                  <td>{senador.bloque}</td>
                  <td>{senador.mandato}</td>
                  <td>{senador.total_proyectos ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
