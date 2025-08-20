'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
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
import { Bar, Pie } from 'react-chartjs-2';

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
  proyectosLeyFirmante: number;
  proyectosLeyCofirmante: number;
  totalProyectos: number;
  foto?: string;
}

interface BloqueStat {
  _id: string;
  bloque: string;
  cantidadDiputados: number;
  totalProyectosFirmante: number;
  totalProyectosCofirmante: number;
  totalProyectos: number;
  promedioProyectos: number;
}

interface EstadisticasGenerales {
  totalDiputados: number;
  totalProyectosFirmante: number;
  totalProyectosCofirmante: number;
  totalProyectosGeneral: number;
  maxProyectosFirmante: number;
  maxProyectosCofirmante: number;
}

interface RankingData {
  ranking: Diputado[];
  bloques: BloqueStat[];
  estadisticas: EstadisticasGenerales;
}

export default function RankingPage() {
  const [data, setData] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'ranking' | 'bloques'>('ranking');

  useEffect(() => {
    const fetchRankingData = async () => {
      try {
        const response = await fetch('/api/ranking-proyectos');
        const result = await response.json();

        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || 'Error al cargar los datos');
        }
      } catch {
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    };

    fetchRankingData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
          <p className="text-red-400 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-gray-400">
          <p>No hay datos disponibles</p>
        </div>
      </div>
    );
  }

  // Preparar datos para el gráfico de barras (top 10 diputados)
  const top10Data = {
    labels: data.ranking.slice(0, 10).map(d => d.nombre),
    datasets: [
      {
        label: 'Proyectos como Firmante',
        data: data.ranking.slice(0, 10).map(d => d.proyectosLeyFirmante),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
      {
        label: 'Proyectos como Cofirmante',
        data: data.ranking.slice(0, 10).map(d => d.proyectosLeyCofirmante),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Preparar datos para el gráfico circular de bloques
  const bloquesData = {
    labels: data.bloques.map(b => b.bloque),
    datasets: [
      {
        data: data.bloques.map(b => b.cantidadDiputados),
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
          '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
        ],
        borderColor: '#1f2937',
        borderWidth: 2,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#e5e7eb'
        }
      },
      title: {
        display: true,
        text: 'Top 10 Diputados por Proyectos de Ley',
        color: '#e5e7eb'
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#e5e7eb',
          maxRotation: 45,
        },
        grid: {
          color: '#374151'
        }
      },
      y: {
        ticks: {
          color: '#e5e7eb'
        },
        grid: {
          color: '#374151'
        }
      }
    }
  };

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: '#e5e7eb'
        }
      },
      title: {
        display: true,
        text: 'Distribución de Diputados por Bloque',
        color: '#e5e7eb'
      },
    },
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-4">
          Ranking de Proyectos Legislativos
        </h1>

        {/* Estadísticas generales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-2xl font-bold text-blue-400">
              {data.estadisticas.totalDiputados}
            </div>
            <div className="text-gray-400">Total Diputados</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-2xl font-bold text-green-400">
              {data.estadisticas.totalProyectosGeneral}
            </div>
            <div className="text-gray-400">Total Proyectos</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-2xl font-bold text-purple-400">
              {data.estadisticas.totalProyectosFirmante}
            </div>
            <div className="text-gray-400">Como Firmante</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-2xl font-bold text-yellow-400">
              {data.estadisticas.totalProyectosCofirmante}
            </div>
            <div className="text-gray-400">Como Cofirmante</div>
          </div>
        </div>

        {/* Botones de navegación */}
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => setViewMode('ranking')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${viewMode === 'ranking'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
          >
            Ranking Individual
          </button>
          <button
            onClick={() => setViewMode('bloques')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${viewMode === 'bloques'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
          >
            Análisis por Bloques
          </button>
        </div>
      </div>

      {viewMode === 'ranking' && (
        <div>
          {/* Gráfico de barras */}
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <Bar data={top10Data} options={barOptions} />
          </div>

          {/* Lista completa del ranking */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6">Ranking Completo</h2>
            <div className="space-y-4">
              {data.ranking.map((diputado, index) => (
                <div
                  key={diputado._id}
                  className="flex items-center space-x-4 p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <div className="flex-shrink-0 w-8 text-center">
                    <span className="text-lg font-bold text-yellow-400">
                      #{index + 1}
                    </span>
                  </div>

                  {diputado.foto && (
                    <div className="flex-shrink-0">
                      <Image
                        src={diputado.foto}
                        alt={diputado.nombre}
                        width={48}
                        height={48}
                        className="rounded-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex-grow">
                    <h3 className="font-semibold text-white">{diputado.nombre}</h3>
                    <p className="text-sm text-gray-400">
                      {diputado.distrito} - {diputado.bloque}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold text-green-400">
                      {diputado.totalProyectos} proyectos
                    </div>
                    <div className="text-sm text-gray-400">
                      {diputado.proyectosLeyFirmante} firmante • {diputado.proyectosLeyCofirmante} cofirmante
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'bloques' && (
        <div>
          {/* Gráfico circular */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <Pie data={bloquesData} options={pieOptions} />
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Estadísticas por Bloque</h3>
              <div className="space-y-3">
                {data.bloques.slice(0, 5).map((bloque) => (
                  <div key={bloque._id} className="flex justify-between items-center p-3 bg-gray-700 rounded">
                    <div>
                      <div className="font-medium">{bloque.bloque}</div>
                      <div className="text-sm text-gray-400">
                        {bloque.cantidadDiputados} diputados
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-400">
                        {bloque.totalProyectos} proyectos
                      </div>
                      <div className="text-sm text-gray-400">
                        {bloque.promedioProyectos} promedio
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabla completa de bloques */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-6">Todos los Bloques</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="pb-3 text-gray-300">Bloque</th>
                    <th className="pb-3 text-gray-300">Diputados</th>
                    <th className="pb-3 text-gray-300">Total Proyectos</th>
                    <th className="pb-3 text-gray-300">Como Firmante</th>
                    <th className="pb-3 text-gray-300">Como Cofirmante</th>
                    <th className="pb-3 text-gray-300">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bloques.map((bloque) => (
                    <tr key={bloque._id} className="border-b border-gray-700">
                      <td className="py-3 font-medium">{bloque.bloque}</td>
                      <td className="py-3 text-gray-400">{bloque.cantidadDiputados}</td>
                      <td className="py-3 text-green-400 font-bold">{bloque.totalProyectos}</td>
                      <td className="py-3 text-blue-400">{bloque.totalProyectosFirmante}</td>
                      <td className="py-3 text-purple-400">{bloque.totalProyectosCofirmante}</td>
                      <td className="py-3 text-yellow-400">{bloque.promedioProyectos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
