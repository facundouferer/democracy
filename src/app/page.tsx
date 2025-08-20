'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface Diputado {
  _id?: string;
  slug: string;
  foto: string;
  nombre: string;
  distrito: string;
  mandato: string;
  inicioMandato: string;
  finMandato: string;
  bloque: string;
  profesion?: string;
  email?: string;
  proyectosLeyFirmante?: number;
  proyectosLeyCofirmante?: number;
  fechaActualizacion: string;
}

interface Estadisticas {
  general: {
    totalActivos: number;
    totalProyectosFirmante: number;
    totalProyectosCofirmante: number;
    promedioProyectosFirmante: number;
    diputadosConProyectos: number;
  };
  porDistrito: Array<{ _id: string; count: number; totalProyectos: number }>;
  porBloque: Array<{ _id: string; count: number; totalProyectos: number }>;
}

interface ApiResponse {
  success: boolean;
  data: Diputado[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  stats: Estadisticas;
  filters: {
    distrito: string;
    bloque: string;
    search: string;
    sort: string;
    direction: string;
  };
}

export default function Home() {
  const [apiData, setApiData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros y parámetros
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrito, setSelectedDistrito] = useState('');
  const [selectedBloque, setSelectedBloque] = useState('');
  const [sortField, setSortField] = useState('nombre');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const fetchDiputados = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        sort: sortField,
        direction: sortDirection,
      });

      if (searchTerm) params.append('search', searchTerm);
      if (selectedDistrito) params.append('distrito', selectedDistrito);
      if (selectedBloque) params.append('bloque', selectedBloque);

      const response = await fetch(`/api/diputados-publico?${params}`);
      const result = await response.json();

      if (result.success) {
        setApiData(result);
      } else {
        setError(result.error || 'Error al cargar los datos');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, sortField, sortDirection, searchTerm, selectedDistrito, selectedBloque]);

  // Cargar datos iniciales
  useEffect(() => {
    fetchDiputados();
  }, [fetchDiputados]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchDiputados();
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const changePage = (newPage: number) => {
    setCurrentPage(newPage);
  };

  return (
    <div className="min-h-screen fade-in">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8 slide-in">
          <p className="text-sm terminal-cursor" style={{ color: '#00ff41' }}>
            DATOS SINCRONIZADOS DESDE www.hcdn.gob.ar
          </p>
        </header>

        {/* Estadísticas generales */}
        {apiData?.stats && (
          <div className="retro-card rounded-lg p-6 mb-6 neon-border fade-in">
            <h2 className="text-xl font-semibold mb-4 neon-text"
              style={{ fontFamily: "'Orbitron', monospace", color: '#00ff41' }}>
              📊 ESTADÍSTICAS
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center retro-card p-4 border border-green-400/30">
                <div className="text-2xl font-bold neon-text" style={{ color: '#00d4ff' }}>
                  {apiData.stats.general.totalActivos}
                </div>
                <div className="text-xs" style={{ color: '#00ff41' }}>ACTIVOS</div>
              </div>
              <div className="text-center retro-card p-4 border border-green-400/30">
                <div className="text-2xl font-bold neon-text" style={{ color: '#00ff41' }}>
                  {apiData.stats.general.totalProyectosFirmante}
                </div>
                <div className="text-xs" style={{ color: '#00ff41' }}>FIRMADOS</div>
              </div>
              <div className="text-center retro-card p-4 border border-green-400/30">
                <div className="text-2xl font-bold neon-text" style={{ color: '#ff0080' }}>
                  {apiData.stats.general.totalProyectosCofirmante}
                </div>
                <div className="text-xs" style={{ color: '#00ff41' }}>COFIRMADOS</div>
              </div>
              <div className="text-center retro-card p-4 border border-green-400/30">
                <div className="text-2xl font-bold neon-text" style={{ color: '#ffff00' }}>
                  {Math.round(apiData.stats.general.promedioProyectosFirmante || 0)}
                </div>
                <div className="text-xs" style={{ color: '#00ff41' }}>PROMEDIO</div>
              </div>
              <div className="text-center retro-card p-4 border border-green-400/30">
                <div className="text-2xl font-bold neon-text" style={{ color: '#8000ff' }}>
                  {apiData.stats.general.diputadosConProyectos}
                </div>
                <div className="text-xs" style={{ color: '#00ff41' }}>CON PROYECTOS</div>
              </div>
            </div>
          </div>
        )}

        {/* Filtros y búsqueda */}
        <div className="retro-card rounded-lg p-6 mb-6 neon-border fade-in">
          <h2 className="text-xl font-semibold mb-4 neon-text"
            style={{ fontFamily: "'Orbitron', monospace", color: '#00ff41' }}>
            🔍 TERMINAL DE BÚSQUEDA
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#00d4ff' }}>
                &gt; BUSCAR:
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nombre, distrito, bloque..."
                className="retro-input w-full p-2 rounded"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#00d4ff' }}>
                &gt; DISTRITO:
              </label>
              <select
                value={selectedDistrito}
                onChange={(e) => setSelectedDistrito(e.target.value)}
                className="retro-select w-full p-2 rounded"
              >
                <option value="">TODOS</option>
                {apiData?.stats.porDistrito.slice(0, 10).map((distrito) => (
                  <option key={distrito._id} value={distrito._id}>
                    {distrito._id} ({distrito.count})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#00d4ff' }}>
                &gt; BLOQUE:
              </label>
              <select
                value={selectedBloque}
                onChange={(e) => setSelectedBloque(e.target.value)}
                className="retro-select w-full p-2 rounded"
              >
                <option value="">TODOS</option>
                {apiData?.stats.porBloque.slice(0, 10).map((bloque) => (
                  <option key={bloque._id} value={bloque._id}>
                    {bloque._id} ({bloque.count})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#00d4ff' }}>
                &gt; REGISTROS:
              </label>
              <select
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="retro-select w-full p-2 rounded"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={loading}
            className="retro-button px-6 py-2 font-bold transition-all duration-300"
            style={{ fontFamily: "'Orbitron', monospace" }}
          >
            {loading ? '⚡ PROCESANDO...' : '🚀 EJECUTAR BÚSQUEDA'}
          </button>
        </div>

        {error && (
          <div className="retro-card p-4 mb-4 border-2 border-red-500 neon-glow"
            style={{ background: 'rgba(255, 0, 128, 0.1)' }}>
            <div className="text-red-400 font-mono">❌ ERROR: {error}</div>
          </div>
        )}

        {/* Tabla de diputados */}
        {apiData?.data && (
          <div className="retro-card rounded-lg overflow-hidden neon-border fade-in">
            <div className="retro-card p-6 border-b-2 border-green-400 flex justify-between items-center">
              <h2 className="text-xl font-semibold neon-text"
                style={{ fontFamily: "'Orbitron', monospace", color: '#00ff41' }}>
                💾 DIPUTADOS ENCONTRADOS ({apiData.pagination.total})
              </h2>
              <div className="text-sm" style={{ color: '#00d4ff' }}>
                [PÁG {apiData.pagination.page}/{apiData.pagination.totalPages}]
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="retro-table w-full">
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, rgba(0, 255, 65, 0.2), rgba(0, 212, 255, 0.2))' }}>
                    <th className="px-4 py-3 text-left" style={{ color: '#00ff41', fontFamily: "'Orbitron', monospace" }}>
                      FOTO
                    </th>
                    <th
                      className="px-4 py-3 text-left cursor-pointer hover:bg-green-400/20 transition-colors"
                      onClick={() => handleSort('nombre')}
                      style={{ color: '#00ff41', fontFamily: "'Orbitron', monospace" }}
                    >
                      NOMBRE {sortField === 'nombre' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="px-4 py-3 text-left cursor-pointer hover:bg-green-400/20 transition-colors"
                      onClick={() => handleSort('distrito')}
                      style={{ color: '#00ff41', fontFamily: "'Orbitron', monospace" }}
                    >
                      DISTRITO {sortField === 'distrito' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="px-4 py-3 text-left cursor-pointer hover:bg-green-400/20 transition-colors"
                      onClick={() => handleSort('bloque')}
                      style={{ color: '#00ff41', fontFamily: "'Orbitron', monospace" }}
                    >
                      BLOQUE {sortField === 'bloque' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-3 text-left" style={{ color: '#00ff41', fontFamily: "'Orbitron', monospace" }}>
                      PROFESIÓN
                    </th>
                    <th className="px-4 py-3 text-left" style={{ color: '#00ff41', fontFamily: "'Orbitron', monospace" }}>
                      PROYECTOS
                    </th>
                    <th className="px-4 py-3 text-left" style={{ color: '#00ff41', fontFamily: "'Orbitron', monospace" }}>
                      MANDATO
                    </th>
                    <th className="px-4 py-3 text-left" style={{ color: '#00ff41', fontFamily: "'Orbitron', monospace" }}>
                      EMAIL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {apiData.data.map((diputado, index) => (
                    <tr key={diputado.slug}
                      className="border-b border-green-400/30 hover:bg-green-400/10 transition-all duration-200"
                      style={{
                        animation: `fadeIn 0.5s ease-in-out ${index * 0.1}s both`
                      }}>
                      <td className="px-4 py-3">
                        <div className="retro-card p-1 border border-green-400/30">
                          <Image
                            src={diputado.foto}
                            alt={diputado.nombre}
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded object-cover"
                            unoptimized
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium neon-text" style={{ color: '#00d4ff' }}>
                          {diputado.nombre}
                        </div>
                      </td>
                      <td className="px-4 py-3" style={{ color: '#00ff41' }}>
                        {diputado.distrito}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: '#ffff00' }}>
                        {diputado.bloque}
                      </td>
                      <td className="px-4 py-3">
                        <span style={{ color: diputado.profesion ? '#00d4ff' : '#666' }}>
                          {diputado.profesion || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold" style={{ color: '#00ff41' }}>F:</span>
                            <span className="font-medium" style={{
                              color: diputado.proyectosLeyFirmante ? '#00ff41' : '#666'
                            }}>
                              {diputado.proyectosLeyFirmante || 0}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold" style={{ color: '#00d4ff' }}>C:</span>
                            <span className="font-medium" style={{
                              color: diputado.proyectosLeyCofirmante ? '#00d4ff' : '#666'
                            }}>
                              {diputado.proyectosLeyCofirmante || 0}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <div className="font-medium" style={{ color: '#ff0080' }}>
                            {diputado.mandato}
                          </div>
                          <div style={{ color: '#666', fontSize: '10px' }}>
                            {new Date(diputado.inicioMandato).toLocaleDateString()} -
                            {new Date(diputado.finMandato).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {diputado.email ? (
                          <a
                            href={`mailto:${diputado.email}`}
                            className="text-blue-400 hover:text-blue-300 underline text-sm neon-text"
                          >
                            {diputado.email}
                          </a>
                        ) : (
                          <span className="text-gray-500 text-sm">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="retro-card p-6 border-t-2 border-green-400 flex justify-between items-center">
              <div className="text-sm" style={{ color: '#00d4ff' }}>
                &gt; MOSTRANDO {((apiData.pagination.page - 1) * apiData.pagination.limit) + 1} - {Math.min(apiData.pagination.page * apiData.pagination.limit, apiData.pagination.total)} DE {apiData.pagination.total}
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => changePage(apiData.pagination.page - 1)}
                  disabled={!apiData.pagination.hasPrevPage || loading}
                  className="retro-button px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ◀ PREV
                </button>

                <span className="px-3 py-1" style={{ color: '#00ff41', fontFamily: "'Orbitron', monospace" }}>
                  [{apiData.pagination.page}/{apiData.pagination.totalPages}]
                </span>

                <button
                  onClick={() => changePage(apiData.pagination.page + 1)}
                  disabled={!apiData.pagination.hasNextPage || loading}
                  className="retro-button px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  NEXT ▶
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-8 text-center fade-in" style={{ color: '#00d4ff' }}>
          <div className="retro-card p-6 border border-green-400/30">
            <p className="mb-2">
              📡 <strong style={{ color: '#00ff41' }}>API ENDPOINT:</strong>
              <code className="retro-card px-2 py-1 mx-2 border border-green-400/30" style={{ color: '#ffff00' }}>
                /api/diputados-publico
              </code>
            </p>
            <p className="text-sm mb-2">
              🔗 DATOS DESDE: <a
                href="https://www.hcdn.gob.ar/diputados/"
                target="_blank"
                rel="noopener noreferrer"
                className="neon-text hover:text-green-300 underline"
                style={{ color: '#00ff41' }}
              >
                www.hcdn.gob.ar
              </a>
            </p>
            <p className="text-xs terminal-cursor" style={{ color: '#666' }}>
              ÚLTIMA SYNC: {apiData?.data[0]?.fechaActualizacion ? new Date(apiData.data[0].fechaActualizacion).toLocaleString() : 'N/A'}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
