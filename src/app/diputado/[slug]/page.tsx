'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface Diputado {
  _id: string;
  nombre: string;
  distrito: string;
  bloque: string;
  profesion?: string;
  fechaNacimiento?: Date;
  email?: string;
  foto?: string;
  proyectosLeyFirmante?: number;
  proyectosLeyCofirmante?: number;
}

interface Proyecto {
  _id: string;
  expediente: string;
  tipo: string;
  sumario: string;
  fecha: string;
  enlace: string;
  tipoFirmante: string;
}

interface EstadisticasTipo {
  tipo: string;
  cantidad: number;
}

export default function PerfilDiputadoPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [diputado, setDiputado] = useState<Diputado | null>(null);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [tiposDisponibles, setTiposDisponibles] = useState<string[]>([]);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);

        // Cargar datos del diputado
        const responseDiputado = await fetch(`/api/diputado-db/${slug}`, {
          headers: {
            'x-api-key': 'dev-997e7e8d-982bd538-63c9431c'
          }
        });

        if (!responseDiputado.ok) {
          throw new Error('Error al cargar datos del diputado');
        }

        const dataDiputado = await responseDiputado.json();
        setDiputado(dataDiputado.data);

        // Cargar proyectos del diputado
        const responseProyectos = await fetch(`/api/proyectos?diputadoSlug=${slug}&limit=0`, {
          headers: {
            'x-api-key': 'dev-997e7e8d-982bd538-63c9431c'
          }
        });

        if (!responseProyectos.ok) {
          throw new Error('Error al cargar proyectos');
        }

        const dataProyectos = await responseProyectos.json();
        setProyectos(dataProyectos.data || []);

        // Extraer tipos únicos para el filtro
        const tipos = [...new Set(dataProyectos.data?.map((p: Proyecto) => p.tipo as string) || [])].sort() as string[];
        setTiposDisponibles(tipos);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      cargarDatos();
    }
  }, [slug]);

  // Filtrar proyectos
  const proyectosFiltrados = proyectos.filter(proyecto => {
    return !filtroTipo || proyecto.tipo === filtroTipo;
  });

  // Calcular estadísticas de tipos
  const estadisticasTipos: EstadisticasTipo[] = tiposDisponibles.map(tipo => ({
    tipo,
    cantidad: proyectos.filter(p => p.tipo === tipo).length
  })).sort((a, b) => b.cantidad - a.cantidad);

  // Datos para gráfico de tipos
  const tiposData = {
    labels: estadisticasTipos.map(stat => stat.tipo),
    datasets: [
      {
        data: estadisticasTipos.map(stat => stat.cantidad),
        backgroundColor: [
          '#10B981', '#059669', '#34D399', '#6EE7B7', '#A7F3D0',
          '#D1FAE5', '#F0FDF4', '#22C55E', '#16A34A', '#15803D'
        ],
        borderColor: '#065F46',
        borderWidth: 2,
      },
    ],
  };

  // Estadísticas por año
  const proyectosPorAño = proyectos.reduce((acc, proyecto) => {
    const año = new Date(proyecto.fecha).getFullYear();
    acc[año] = (acc[año] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const añosData = {
    labels: Object.keys(proyectosPorAño).sort(),
    datasets: [
      {
        label: 'Proyectos por Año',
        data: Object.keys(proyectosPorAño).sort().map(año => proyectosPorAño[parseInt(año)]),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#10B981',
          font: {
            family: 'monospace',
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#10B981',
        bodyColor: '#10B981',
        borderColor: '#10B981',
        borderWidth: 1,
      },
    },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#10B981',
        bodyColor: '#10B981',
        borderColor: '#10B981',
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        ticks: { color: '#10B981' },
        grid: { color: 'rgba(16, 185, 129, 0.1)' },
      },
      x: {
        ticks: { color: '#10B981' },
        grid: { color: 'rgba(16, 185, 129, 0.1)' },
      },
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-green-400 font-mono">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Cargando perfil del diputado...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-green-400 font-mono">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-900/20 border border-red-400 p-4 rounded">
            <p className="text-red-400">Error: {error}</p>
            <Link href="/" className="text-green-400 hover:text-green-300 underline">
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!diputado) {
    return (
      <div className="min-h-screen bg-black text-green-400 font-mono">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p>Diputado no encontrado</p>
            <Link href="/" className="text-green-400 hover:text-green-300 underline">
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-green-400 hover:text-green-300 text-sm mb-4 inline-block">
            ← Volver al inicio
          </Link>
          <h1 className="font-orbitron text-3xl font-bold mb-2 neon-text">
            [PERFIL.DIPUTADO]
          </h1>
        </div>

        {/* Información del diputado */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-1">
            <div className="bg-gray-900/50 border border-green-400 p-6 rounded">
              {diputado.foto && (
                <div className="mb-4 text-center">
                  <Image
                    src={diputado.foto}
                    alt={`Foto de ${diputado.nombre}`}
                    width={200}
                    height={200}
                    className="mx-auto rounded border border-green-400"
                  />
                </div>
              )}
              <h2 className="font-orbitron text-xl font-bold text-green-300 mb-4">
                {diputado.nombre}
              </h2>
              <div className="space-y-2 text-sm">
                <p><span className="text-green-300 font-bold">DISTRITO:</span> {diputado.distrito}</p>
                <p><span className="text-green-300 font-bold">BLOQUE:</span> {diputado.bloque}</p>
                {diputado.profesion && (
                  <p><span className="text-green-300 font-bold">PROFESIÓN:</span> {diputado.profesion}</p>
                )}
                {diputado.email && (
                  <p><span className="text-green-300 font-bold">EMAIL:</span> {diputado.email}</p>
                )}
                {diputado.fechaNacimiento && (
                  <p><span className="text-green-300 font-bold">NACIMIENTO:</span> {new Date(diputado.fechaNacimiento).toLocaleDateString()}</p>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-900/50 border border-green-400 p-4 rounded text-center">
                <div className="text-2xl font-bold text-green-300">
                  {proyectos.length}
                </div>
                <div className="text-sm">TOTAL PROYECTOS</div>
              </div>
              <div className="bg-gray-900/50 border border-green-400 p-4 rounded text-center">
                <div className="text-2xl font-bold text-green-300">
                  {tiposDisponibles.length}
                </div>
                <div className="text-sm">TIPOS DE PROYECTOS</div>
              </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-900/50 border border-green-400 p-4 rounded">
                <h3 className="font-orbitron text-lg font-bold mb-4 text-green-300">
                  TIPOS DE PROYECTOS
                </h3>
                <div className="h-64">
                  <Pie data={tiposData} options={chartOptions} />
                </div>
              </div>

              <div className="bg-gray-900/50 border border-green-400 p-4 rounded">
                <h3 className="font-orbitron text-lg font-bold mb-4 text-green-300">
                  PROYECTOS POR AÑO
                </h3>
                <div className="h-64">
                  <Bar data={añosData} options={barOptions} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-6">
          <label className="block text-sm font-bold mb-2">
            FILTRAR POR TIPO:
          </label>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="bg-black border border-green-400 text-green-400 p-2 retro-input"
          >
            <option value="">Todos los tipos</option>
            {tiposDisponibles.map(tipo => (
              <option key={tipo} value={tipo}>{tipo}</option>
            ))}
          </select>
        </div>

        {/* Lista de proyectos */}
        <div className="bg-gray-900/50 border border-green-400 p-6 rounded">
          <h3 className="font-orbitron text-xl font-bold mb-4 text-green-300">
            PROYECTOS ({proyectosFiltrados.length})
          </h3>

          {proyectosFiltrados.length === 0 ? (
            <p className="text-center text-gray-400">No hay proyectos para mostrar</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-green-400">
                    <th className="text-left p-2">EXPEDIENTE</th>
                    <th className="text-left p-2">TIPO</th>
                    <th className="text-left p-2">SUMARIO</th>
                    <th className="text-left p-2">FECHA</th>
                    <th className="text-left p-2">FIRMANTE</th>
                    <th className="text-left p-2">ENLACE</th>
                  </tr>
                </thead>
                <tbody>
                  {proyectosFiltrados.map((proyecto) => (
                    <tr key={proyecto._id} className="border-b border-green-400/30 hover:bg-green-400/10">
                      <td className="p-2 text-green-300 font-mono">{proyecto.expediente}</td>
                      <td className="p-2">
                        <span className="px-2 py-1 bg-green-400/20 text-green-300 rounded text-xs">
                          {proyecto.tipo}
                        </span>
                      </td>
                      <td className="p-2 max-w-md truncate" title={proyecto.sumario}>
                        {proyecto.sumario}
                      </td>
                      <td className="p-2">{new Date(proyecto.fecha).toLocaleDateString()}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${proyecto.tipoFirmante === 'firmante'
                          ? 'bg-blue-400/20 text-blue-300'
                          : 'bg-purple-400/20 text-purple-300'
                          }`}>
                          {proyecto.tipoFirmante}
                        </span>
                      </td>
                      <td className="p-2">
                        <a
                          href={proyecto.enlace}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-400 hover:text-green-300 underline"
                        >
                          Ver →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
