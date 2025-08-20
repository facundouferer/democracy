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

  const fetchDiputados = useCallback(async (resetPage = false) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      params.append('page', (resetPage ? 1 : currentPage).toString());
      params.append('sort', sortField);
      params.append('direction', sortDirection);

      if (searchTerm) params.append('search', searchTerm);
      if (selectedDistrito) params.append('distrito', selectedDistrito);
      if (selectedBloque) params.append('bloque', selectedBloque);

      const response = await fetch(`/api/diputados-publico?${params}`);
      const data = await response.json();

      if (data.success) {
        setApiData(data);
        if (resetPage) setCurrentPage(1);
      } else {
        setError(data.error || 'Error al cargar los datos');
      }
    } catch (error) {
      setError('Error de conexión');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, sortField, sortDirection, searchTerm, selectedDistrito, selectedBloque]);

  // Cargar datos iniciales
  useEffect(() => {
    fetchDiputados();
  }, [currentPage, limit, sortField, sortDirection]);

  const handleSearch = () => {
    fetchDiputados(true);
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
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🏛️ Diputados de Argentina
          </h1>
          <p className="text-lg text-gray-400">
            Datos actualizados desde la Honorable Cámara de Diputados de la Nación
          </p>
        </header>

        {/* Estadísticas generales */}
        {apiData?.stats && (
          <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-white">📊 Estadísticas Generales</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {apiData.stats.general.totalActivos}
                </div>
                <div className="text-sm text-gray-400">Diputados Activos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {apiData.stats.general.totalProyectosFirmante}
                </div>
                <div className="text-sm text-gray-400">Proyectos Firmados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {apiData.stats.general.totalProyectosCofirmante}
                </div>
                <div className="text-sm text-gray-400">Como Cofirmante</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400">
                  {Math.round(apiData.stats.general.promedioProyectosFirmante || 0)}
                </div>
                <div className="text-sm text-gray-400">Promedio Proyectos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">
                  {apiData.stats.general.diputadosConProyectos}
                </div>
                <div className="text-sm text-gray-400">Con Proyectos</div>
              </div>
            </div>
          </div>
        )}

        {/* Filtros y búsqueda */}
        <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-white">🔍 Filtros y Búsqueda</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Buscar:</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nombre, distrito, bloque..."
                className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Distrito:</label>
              <select
                value={selectedDistrito}
                onChange={(e) => setSelectedDistrito(e.target.value)}
                className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Todos los distritos</option>
                {apiData?.stats.porDistrito.slice(0, 10).map((distrito) => (
                  <option key={distrito._id} value={distrito._id}>
                    {distrito._id} ({distrito.count})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Bloque:</label>
              <select
                value={selectedBloque}
                onChange={(e) => setSelectedBloque(e.target.value)}
                className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Todos los bloques</option>
                {apiData?.stats.porBloque.slice(0, 10).map((bloque) => (
                  <option key={bloque._id} value={bloque._id}>
                    {bloque._id} ({bloque.count})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Por página:</label>
              <select
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:border-blue-500 focus:ring-blue-500"
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
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-2 px-6 rounded-md transition-colors"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded mb-4">{error}
          </div>
        )}

        {/* Tabla de diputados */}
        {apiData?.data && (
          <div className="bg-gray-800 shadow-lg rounded-lg overflow-hidden border border-gray-700">
            <div className="bg-gray-700 px-6 py-3 border-b border-gray-600 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">
                Diputados ({apiData.pagination.total} total)
              </h2>
              <div className="text-sm text-gray-400">
                Página {apiData.pagination.page} de {apiData.pagination.totalPages}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-300">Foto</th>
                    <th
                      className="px-4 py-2 text-left cursor-pointer hover:bg-gray-600 text-gray-300"
                      onClick={() => handleSort('nombre')}
                    >
                      Nombre {sortField === 'nombre' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="px-4 py-2 text-left cursor-pointer hover:bg-gray-600 text-gray-300"
                      onClick={() => handleSort('distrito')}
                    >
                      Distrito {sortField === 'distrito' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="px-4 py-2 text-left cursor-pointer hover:bg-gray-600 text-gray-300"
                      onClick={() => handleSort('bloque')}
                    >
                      Bloque {sortField === 'bloque' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-2 text-left text-gray-300">Profesión</th>
                    <th className="px-4 py-2 text-left text-gray-300">Proyectos LEY</th>
                    <th className="px-4 py-2 text-left text-gray-300">Mandato</th>
                    <th className="px-4 py-2 text-left text-gray-300">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {apiData.data.map((diputado) => (
                    <tr key={diputado.slug} className="border-b border-gray-700 hover:bg-gray-700">
                      <td className="px-4 py-2">
                        <Image
                          src={diputado.foto}
                          alt={diputado.nombre}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-full object-cover"
                          onError={() => {
                            // Error handling for image loading is managed by Next.js
                          }}
                          unoptimized
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="font-medium text-white">
                          {diputado.nombre}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-gray-300">{diputado.distrito}</td>
                      <td className="px-4 py-2 text-sm text-gray-300">{diputado.bloque}</td>
                      <td className="px-4 py-2">
                        <span className={diputado.profesion ? 'text-gray-300' : 'text-gray-500'}>
                          {diputado.profesion || 'No disponible'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="text-sm">
                          <div className="flex items-center space-x-2">
                            <span className="text-green-400 font-semibold">F:</span>
                            <span className={diputado.proyectosLeyFirmante ? 'text-green-400 font-medium' : 'text-gray-500'}>
                              {diputado.proyectosLeyFirmante || 0}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-blue-400 font-semibold">C:</span>
                            <span className={diputado.proyectosLeyCofirmante ? 'text-blue-400 font-medium' : 'text-gray-500'}>
                              {diputado.proyectosLeyCofirmante || 0}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="text-sm">
                          <div className="font-medium text-gray-300">{diputado.mandato}</div>
                          <div className="text-gray-500">
                            {new Date(diputado.inicioMandato).toLocaleDateString()} -
                            {new Date(diputado.finMandato).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        {diputado.email ? (
                          <a
                            href={`mailto:${diputado.email}`}
                            className="text-blue-400 hover:text-blue-300 underline text-sm"
                          >
                            {diputado.email}
                          </a>
                        ) : (
                          <span className="text-gray-500 text-sm">No disponible</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="bg-gray-700 px-6 py-3 border-t border-gray-600 flex justify-between items-center">
              <div className="text-sm text-gray-400">
                Mostrando {((apiData.pagination.page - 1) * apiData.pagination.limit) + 1} a{' '}
                {Math.min(apiData.pagination.page * apiData.pagination.limit, apiData.pagination.total)} de{' '}
                {apiData.pagination.total} resultados
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => changePage(apiData.pagination.page - 1)}
                  disabled={!apiData.pagination.hasPrevPage || loading}
                  className="px-3 py-1 border border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed text-white bg-gray-800 hover:bg-gray-700"
                >
                  Anterior
                </button>

                <span className="px-3 py-1 text-gray-300">
                  Página {apiData.pagination.page} de {apiData.pagination.totalPages}
                </span>

                <button
                  onClick={() => changePage(apiData.pagination.page + 1)}
                  disabled={!apiData.pagination.hasNextPage || loading}
                  className="px-3 py-1 border border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed text-white bg-gray-800 hover:bg-gray-700"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-8 text-center text-gray-400">
          <p>📡 <strong>API Público:</strong> <code className="bg-gray-800 px-2 py-1 rounded">/api/diputados-publico</code></p>
          <p className="mt-2 text-sm">
            Datos obtenidos de <a href="https://www.hcdn.gob.ar/diputados/" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">www.hcdn.gob.ar</a>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Última actualización: {apiData?.data[0]?.fechaActualizacion ? new Date(apiData.data[0].fechaActualizacion).toLocaleString() : 'No disponible'}
          </p>
        </footer>
      </div>
    </div>
  );
}
