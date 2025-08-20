'use client';

import { useState, useEffect } from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title
} from 'chart.js';

// Registrar componentes de Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, Title);

interface Diputado {
  _id: string;
  nombre: string;
  bloque: string;
  distrito: string;
  profesion?: string;
}

interface EstadisticasProfesion {
  profesion: string;
  cantidad: number;
  porcentaje: number;
}

export default function EstadisticasPage() {
  const [diputados, setDiputados] = useState<Diputado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para filtros
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState<string>('');
  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState<string>('');

  // Estados para opciones de filtro
  const [bloques, setBloques] = useState<string[]>([]);
  const [provincias, setProvincias] = useState<string[]>([]);

  // Cargar datos
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/diputados-bd', {
          headers: {
            'x-api-key': 'dev-997e7e8d-982bd538-63c9431c'
          }
        });

        if (!response.ok) {
          throw new Error('Error al cargar los datos');
        }

        const result = await response.json();
        const data = result.data || [];
        setDiputados(data);

        // Extraer bloques únicos
        const bloquesUnicos = [...new Set(data.map((d: Diputado) => d.bloque))].filter(Boolean).sort() as string[];
        setBloques(bloquesUnicos);

        // Extraer provincias únicas
        const provinciasUnicas = [...new Set(data.map((d: Diputado) => d.distrito))].filter(Boolean).sort() as string[];
        setProvincias(provinciasUnicas);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  // Filtrar diputados según selección
  const diputadosFiltrados = diputados.filter(diputado => {
    const cumpleBloque = !bloqueSeleccionado || diputado.bloque === bloqueSeleccionado;
    const cumpleProvincia = !provinciaSeleccionada || diputado.distrito === provinciaSeleccionada;
    return cumpleBloque && cumpleProvincia;
  });

  // Calcular estadísticas de profesiones
  const calcularEstadisticasProfesiones = (): EstadisticasProfesion[] => {
    const conteo: { [key: string]: number } = {};
    const total = diputadosFiltrados.length;

    diputadosFiltrados.forEach(diputado => {
      let profesion = diputado.profesion?.trim() || '';

      // Normalizar casos vacíos o sin información
      if (!profesion || profesion === '' || profesion.toLowerCase() === 'sin especificar') {
        profesion = 'Sin información';
      }

      conteo[profesion] = (conteo[profesion] || 0) + 1;
    });

    return Object.entries(conteo)
      .map(([profesion, cantidad]) => ({
        profesion,
        cantidad,
        porcentaje: (cantidad / total) * 100
      }))
      .sort((a, b) => b.cantidad - a.cantidad);
  };

  const estadisticasProfesiones = calcularEstadisticasProfesiones();

  // Configuración del gráfico de torta
  const chartData = {
    labels: estadisticasProfesiones.slice(0, 10).map(stat => stat.profesion),
    datasets: [
      {
        data: estadisticasProfesiones.slice(0, 10).map(stat => stat.cantidad),
        backgroundColor: [
          '#10B981', // Verde principal
          '#059669', // Verde oscuro
          '#34D399', // Verde claro
          '#6EE7B7', // Verde muy claro
          '#A7F3D0', // Verde pastel
          '#D1FAE5', // Verde muy pastel
          '#F0FDF4', // Verde casi blanco
          '#22C55E', // Verde lima
          '#16A34A', // Verde medio
          '#15803D', // Verde bosque
        ],
        borderColor: '#065F46',
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: '#10B981',
          font: {
            family: 'monospace',
            size: 12,
          },
          usePointStyle: true,
          pointStyle: 'rect',
        },
      },
      title: {
        display: true,
        text: 'Distribución de Profesiones',
        color: '#10B981',
        font: {
          family: 'Orbitron',
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#10B981',
        bodyColor: '#10B981',
        borderColor: '#10B981',
        borderWidth: 1,
        callbacks: {
          label: (context: { label: string; parsed: number }) => {
            const porcentaje = ((context.parsed / diputadosFiltrados.length) * 100).toFixed(1);
            return `${context.label}: ${context.parsed} (${porcentaje}%)`;
          },
        },
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
              <p>Cargando estadísticas...</p>
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
          <h1 className="font-orbitron text-3xl font-bold mb-2 neon-text">
            [ESTADÍSTICAS.SYS]
          </h1>
          <p className="text-green-300">
            Análisis de profesiones de diputados de la Nación
          </p>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div>
            <label className="block text-sm font-bold mb-2">
              FILTRAR POR BLOQUE:
            </label>
            <select
              value={bloqueSeleccionado}
              onChange={(e) => setBloqueSeleccionado(e.target.value)}
              className="w-full bg-black border border-green-400 text-green-400 p-2 retro-input"
            >
              <option value="">Todos los bloques</option>
              {bloques.map(bloque => (
                <option key={bloque} value={bloque}>{bloque}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">
              FILTRAR POR PROVINCIA:
            </label>
            <select
              value={provinciaSeleccionada}
              onChange={(e) => setProvinciaSeleccionada(e.target.value)}
              className="w-full bg-black border border-green-400 text-green-400 p-2 retro-input"
            >
              <option value="">Todas las provincias</option>
              {provincias.map(provincia => (
                <option key={provincia} value={provincia}>{provincia}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Información de filtros activos */}
        {(bloqueSeleccionado || provinciaSeleccionada) && (
          <div className="mb-6 p-4 bg-green-400/10 border border-green-400 rounded">
            <p className="text-sm">
              <span className="font-bold">FILTROS ACTIVOS:</span>
              {bloqueSeleccionado && (
                <span className="ml-2">Bloque: {bloqueSeleccionado}</span>
              )}
              {provinciaSeleccionada && (
                <span className="ml-2">Provincia: {provinciaSeleccionada}</span>
              )}
            </p>
            <p className="text-sm mt-1">
              Mostrando {diputadosFiltrados.length} de {diputados.length} diputados
            </p>
          </div>
        )}

        {/* Gráfico de torta */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-900/50 border border-green-400 p-6 rounded">
            <div className="h-96">
              <Pie data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* Tabla de estadísticas */}
          <div className="bg-gray-900/50 border border-green-400 p-6 rounded">
            <h3 className="font-orbitron text-xl font-bold mb-4 text-green-300">
              DESGLOSE DETALLADO
            </h3>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-900">
                  <tr className="border-b border-green-400">
                    <th className="text-left p-2">PROFESIÓN</th>
                    <th className="text-right p-2">CANTIDAD</th>
                    <th className="text-right p-2">%</th>
                  </tr>
                </thead>
                <tbody>
                  {estadisticasProfesiones.map((stat, index) => (
                    <tr key={index} className="border-b border-green-400/30 hover:bg-green-400/10">
                      <td className="p-2 text-green-300">{stat.profesion}</td>
                      <td className="p-2 text-right">{stat.cantidad}</td>
                      <td className="p-2 text-right">{stat.porcentaje.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Resumen estadístico */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900/50 border border-green-400 p-4 rounded text-center">
            <div className="text-2xl font-bold text-green-300">
              {diputadosFiltrados.length}
            </div>
            <div className="text-sm">DIPUTADOS ANALIZADOS</div>
          </div>
          <div className="bg-gray-900/50 border border-green-400 p-4 rounded text-center">
            <div className="text-2xl font-bold text-green-300">
              {estadisticasProfesiones.length}
            </div>
            <div className="text-sm">PROFESIONES ÚNICAS</div>
          </div>
          <div className="bg-gray-900/50 border border-green-400 p-4 rounded text-center">
            <div className="text-2xl font-bold text-green-300">
              {estadisticasProfesiones[0]?.profesion?.substring(0, 15) + '...' || 'N/A'}
            </div>
            <div className="text-sm">PROFESIÓN MÁS COMÚN</div>
          </div>
        </div>
      </div>
    </div>
  );
}
