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

interface DistritoStat {
  _id: string;
  distrito: string;
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
  rankingFirmantes: Diputado[];
  rankingCofirmantes: Diputado[];
  rankingMenores: Diputado[];
  bloques: BloqueStat[];
  distritos: DistritoStat[];
  estadisticas: EstadisticasGenerales;
}

export default function RankingPage() {
  const [data, setData] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'ranking' | 'firmantes' | 'cofirmantes' | 'menores' | 'bloques' | 'distritos'>('ranking');

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

  // Datos para ranking de firmantes
  const firmantesData = {
    labels: data.rankingFirmantes.slice(0, 10).map(d => d.nombre),
    datasets: [
      {
        label: 'Proyectos como Firmante',
        data: data.rankingFirmantes.slice(0, 10).map(d => d.proyectosLeyFirmante),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Datos para ranking de cofirmantes
  const cofirmantesData = {
    labels: data.rankingCofirmantes.slice(0, 10).map(d => d.nombre),
    datasets: [
      {
        label: 'Proyectos como Cofirmante',
        data: data.rankingCofirmantes.slice(0, 10).map(d => d.proyectosLeyCofirmante),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Datos para ranking de menores proyectos
  const menoresData = {
    labels: data.rankingMenores.map(d => d.nombre),
    datasets: [
      {
        label: 'Total de Proyectos',
        data: data.rankingMenores.map(d => d.totalProyectos),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Datos para análisis por distritos
  const distritosData = {
    labels: data.distritos.slice(0, 10).map(d => d.distrito),
    datasets: [
      {
        data: data.distritos.slice(0, 10).map(d => d.cantidadDiputados),
        backgroundColor: [
          '#10B981', '#059669', '#34D399', '#6EE7B7', '#A7F3D0',
          '#D1FAE5', '#F0FDF4', '#22C55E', '#16A34A', '#15803D'
        ],
        borderColor: '#065F46',
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
    <div className="container mx-auto px-4 py-8 fade-in">
      <div className="mb-8 slide-in">
        <h1 className="text-4xl font-bold neon-text mb-4 glitch"
          data-text="📊 RANKING SYSTEM v2.0"
          style={{
            fontFamily: "'Orbitron', monospace",
            color: '#00ff41',
            textShadow: '0 0 20px #00ff41'
          }}>
          📊 RANKING SYSTEM v2.0
        </h1>

        {/* Estadísticas generales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="retro-card rounded-lg p-6 neon-border">
            <div className="text-3xl font-bold neon-text" style={{ color: '#00d4ff' }}>
              {data.estadisticas.totalDiputados}
            </div>
            <div style={{ color: '#00ff41', fontSize: '12px' }}>TOTAL DIPUTADOS</div>
          </div>
          <div className="retro-card rounded-lg p-6 neon-border">
            <div className="text-3xl font-bold neon-text" style={{ color: '#00ff41' }}>
              {data.estadisticas.totalProyectosGeneral}
            </div>
            <div style={{ color: '#00ff41', fontSize: '12px' }}>TOTAL PROYECTOS</div>
          </div>
          <div className="retro-card rounded-lg p-6 neon-border">
            <div className="text-3xl font-bold neon-text" style={{ color: '#ff0080' }}>
              {data.estadisticas.totalProyectosFirmante}
            </div>
            <div style={{ color: '#00ff41', fontSize: '12px' }}>COMO FIRMANTE</div>
          </div>
          <div className="retro-card rounded-lg p-6 neon-border">
            <div className="text-3xl font-bold neon-text" style={{ color: '#ffff00' }}>
              {data.estadisticas.totalProyectosCofirmante}
            </div>
            <div style={{ color: '#00ff41', fontSize: '12px' }}>COMO COFIRMANTE</div>
          </div>
        </div>

        {/* Botones de navegación */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <button
            onClick={() => setViewMode('ranking')}
            className={`retro-button px-4 py-3 font-bold transition-all duration-300 text-sm ${viewMode === 'ranking' ? 'neon-glow' : ''
              }`}
            style={{ fontFamily: "'Orbitron', monospace" }}
          >
            💾 RANKING TOTAL
          </button>
          <button
            onClick={() => setViewMode('firmantes')}
            className={`retro-button px-4 py-3 font-bold transition-all duration-300 text-sm ${viewMode === 'firmantes' ? 'neon-glow' : ''
              }`}
            style={{ fontFamily: "'Orbitron', monospace" }}
          >
            📝 FIRMANTES
          </button>
          <button
            onClick={() => setViewMode('cofirmantes')}
            className={`retro-button px-4 py-3 font-bold transition-all duration-300 text-sm ${viewMode === 'cofirmantes' ? 'neon-glow' : ''
              }`}
            style={{ fontFamily: "'Orbitron', monospace" }}
          >
            ✍️ COFIRMANTES
          </button>
          <button
            onClick={() => setViewMode('menores')}
            className={`retro-button px-4 py-3 font-bold transition-all duration-300 text-sm ${viewMode === 'menores' ? 'neon-glow' : ''
              }`}
            style={{ fontFamily: "'Orbitron', monospace" }}
          >
            📉 MENORES
          </button>
          <button
            onClick={() => setViewMode('bloques')}
            className={`retro-button px-4 py-3 font-bold transition-all duration-300 text-sm ${viewMode === 'bloques' ? 'neon-glow' : ''
              }`}
            style={{ fontFamily: "'Orbitron', monospace" }}
          >
            🚀 BLOQUES
          </button>
          <button
            onClick={() => setViewMode('distritos')}
            className={`retro-button px-4 py-3 font-bold transition-all duration-300 text-sm ${viewMode === 'distritos' ? 'neon-glow' : ''
              }`}
            style={{ fontFamily: "'Orbitron', monospace" }}
          >
            🗺️ DISTRITOS
          </button>
        </div>
      </div>      {viewMode === 'ranking' && (
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

      {/* Vista de Ranking de Firmantes */}
      {viewMode === 'firmantes' && (
        <div>
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-semibold mb-4">Top 10 Firmantes de Proyectos</h3>
            <Bar data={firmantesData} options={barOptions} />
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-6">Ranking Completo de Firmantes</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="pb-3 text-gray-300">Posición</th>
                    <th className="pb-3 text-gray-300">Diputado</th>
                    <th className="pb-3 text-gray-300">Distrito</th>
                    <th className="pb-3 text-gray-300">Bloque</th>
                    <th className="pb-3 text-gray-300">Proyectos Firmante</th>
                    <th className="pb-3 text-gray-300">Proyectos Cofirmante</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rankingFirmantes.map((diputado, index) => (
                    <tr key={diputado._id} className="border-b border-gray-700">
                      <td className="py-3 font-bold text-green-400">#{index + 1}</td>
                      <td className="py-3 font-medium">{diputado.nombre}</td>
                      <td className="py-3 text-gray-400">{diputado.distrito}</td>
                      <td className="py-3 text-gray-400">{diputado.bloque}</td>
                      <td className="py-3 text-blue-400 font-bold">{diputado.proyectosLeyFirmante}</td>
                      <td className="py-3 text-purple-400">{diputado.proyectosLeyCofirmante}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Vista de Ranking de Cofirmantes */}
      {viewMode === 'cofirmantes' && (
        <div>
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-semibold mb-4">Top 10 Cofirmantes de Proyectos</h3>
            <Bar data={cofirmantesData} options={barOptions} />
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-6">Ranking Completo de Cofirmantes</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="pb-3 text-gray-300">Posición</th>
                    <th className="pb-3 text-gray-300">Diputado</th>
                    <th className="pb-3 text-gray-300">Distrito</th>
                    <th className="pb-3 text-gray-300">Bloque</th>
                    <th className="pb-3 text-gray-300">Proyectos Cofirmante</th>
                    <th className="pb-3 text-gray-300">Proyectos Firmante</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rankingCofirmantes.map((diputado, index) => (
                    <tr key={diputado._id} className="border-b border-gray-700">
                      <td className="py-3 font-bold text-green-400">#{index + 1}</td>
                      <td className="py-3 font-medium">{diputado.nombre}</td>
                      <td className="py-3 text-gray-400">{diputado.distrito}</td>
                      <td className="py-3 text-gray-400">{diputado.bloque}</td>
                      <td className="py-3 text-purple-400 font-bold">{diputado.proyectosLeyCofirmante}</td>
                      <td className="py-3 text-blue-400">{diputado.proyectosLeyFirmante}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Vista de Top 10 con Menos Proyectos */}
      {viewMode === 'menores' && (
        <div>
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-semibold mb-4">Top 10 Diputados con Menos Proyectos</h3>
            <Bar data={menoresData} options={barOptions} />
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-6">Diputados con Menor Actividad Legislativa</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="pb-3 text-gray-300">Posición</th>
                    <th className="pb-3 text-gray-300">Diputado</th>
                    <th className="pb-3 text-gray-300">Distrito</th>
                    <th className="pb-3 text-gray-300">Bloque</th>
                    <th className="pb-3 text-gray-300">Total Proyectos</th>
                    <th className="pb-3 text-gray-300">Como Firmante</th>
                    <th className="pb-3 text-gray-300">Como Cofirmante</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rankingMenores.map((diputado, index) => (
                    <tr key={diputado._id} className="border-b border-gray-700">
                      <td className="py-3 font-bold text-red-400">#{index + 1}</td>
                      <td className="py-3 font-medium">{diputado.nombre}</td>
                      <td className="py-3 text-gray-400">{diputado.distrito}</td>
                      <td className="py-3 text-gray-400">{diputado.bloque}</td>
                      <td className="py-3 text-red-400 font-bold">{diputado.totalProyectos}</td>
                      <td className="py-3 text-blue-400">{diputado.proyectosLeyFirmante}</td>
                      <td className="py-3 text-purple-400">{diputado.proyectosLeyCofirmante}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Vista de Análisis por Distritos */}
      {viewMode === 'distritos' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Top 10 Distritos por Cantidad de Diputados</h3>
              <Pie data={distritosData} options={pieOptions} />
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Estadísticas por Distrito</h3>
              <div className="space-y-3">
                {data.distritos.slice(0, 5).map((distrito) => (
                  <div key={distrito._id} className="flex justify-between items-center p-3 bg-gray-700 rounded">
                    <div>
                      <div className="font-medium">{distrito.distrito}</div>
                      <div className="text-sm text-gray-400">
                        {distrito.cantidadDiputados} diputados
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-400">
                        {distrito.totalProyectos} proyectos
                      </div>
                      <div className="text-sm text-gray-400">
                        {distrito.promedioProyectos} promedio
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-6">Todos los Distritos</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="pb-3 text-gray-300">Distrito</th>
                    <th className="pb-3 text-gray-300">Diputados</th>
                    <th className="pb-3 text-gray-300">Total Proyectos</th>
                    <th className="pb-3 text-gray-300">Como Firmante</th>
                    <th className="pb-3 text-gray-300">Como Cofirmante</th>
                    <th className="pb-3 text-gray-300">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {data.distritos.map((distrito) => (
                    <tr key={distrito._id} className="border-b border-gray-700">
                      <td className="py-3 font-medium">{distrito.distrito}</td>
                      <td className="py-3 text-gray-400">{distrito.cantidadDiputados}</td>
                      <td className="py-3 text-green-400 font-bold">{distrito.totalProyectos}</td>
                      <td className="py-3 text-blue-400">{distrito.totalProyectosFirmante}</td>
                      <td className="py-3 text-purple-400">{distrito.totalProyectosCofirmante}</td>
                      <td className="py-3 text-yellow-400">{distrito.promedioProyectos}</td>
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
