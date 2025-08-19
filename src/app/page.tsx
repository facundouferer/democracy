'use client';

import { useState } from 'react';

interface Diputado {
  foto: string;
  fotoCompleta?: string;
  nombre: string;
  link: string;
  distrito: string;
  mandato: string;
  inicioMandato: string;
  finMandato: string;
  bloque: string;
  profesion?: string;
  fechaNacimiento?: string;
  email?: string;
  ubicacionOficina?: string;
  proyectosLeyFirmante?: number;
  proyectosLeyCofirmante?: number;
}

export default function Home() {
  const [diputados, setDiputados] = useState<Diputado[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(5);
  const [includeDetails, setIncludeDetails] = useState(true);
  const [apiKey, setApiKey] = useState(''); // API Key (debe configurarse)
  const [apiResponse, setApiResponse] = useState<{
    message?: string;
    count?: number;
    detailedCount?: number;
  } | null>(null);

  const fetchDiputados = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (includeDetails) {
        params.append('limit', limit.toString());
      } else {
        params.append('details', 'false');
      }

      const response = await fetch(`/api/diputados?${params}`, {
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();

      if (data.success) {
        setDiputados(data.data);
        setApiResponse(data);
      } else {
        setError(data.error || 'Error al cargar los datos');
        if (data.instructions) {
          console.log('Instrucciones de autenticación:', data.instructions);
        }
      }
    } catch (error) {
      setError('Error de conexión');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }; return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          Diputados de Argentina - Scraping HCDN
        </h1>

        <div className="bg-gray-500 p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">Configuración del Scraping</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              API Key (requerida):
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Ingresa tu API Key"
              className="w-full p-2 border rounded"
            />
            <p className="text-xs text-gray-500 mt-1">
              Genera tu API Key con: <code>node scripts/generate-api-keys.js</code>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                <input
                  type="checkbox"
                  checked={includeDetails}
                  onChange={(e) => setIncludeDetails(e.target.checked)}
                  className="mr-2"
                />
                Incluir detalles individuales
              </label>
            </div>

            {includeDetails && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Límite de perfiles detallados:
                </label>
                <select
                  value={limit}
                  onChange={(e) => setLimit(parseInt(e.target.value))}
                  className="w-full p-2 border rounded"
                >
                  <option value={5}>5 diputados</option>
                  <option value={10}>10 diputados</option>
                  <option value={20}>20 diputados</option>
                  <option value={50}>50 diputados</option>
                  <option value={999}>Todos (¡Cuidado, puede tardar mucho!)</option>
                </select>
              </div>
            )}

            <div className="flex items-end">
              <button
                onClick={fetchDiputados}
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded w-full"
              >
                {loading ? 'Cargando...' : 'Obtener Diputados'}
              </button>
            </div>
          </div>

          {apiResponse && (
            <div className="bg-gray-100 p-3 rounded text-sm">
              <strong>Estado:</strong> {apiResponse.message} <br />
              <strong>Total:</strong> {apiResponse.count} diputados |
              <strong> Con detalles:</strong> {apiResponse.detailedCount || 0}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-400 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {diputados.length > 0 && (
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b">
              <h2 className="text-xl font-semibold">
                Total de Diputados: {diputados.length}
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Foto</th>
                    <th className="px-4 py-2 text-left">Nombre</th>
                    <th className="px-4 py-2 text-left">Distrito</th>
                    <th className="px-4 py-2 text-left">Profesión</th>
                    <th className="px-4 py-2 text-left">Nac.</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Proyectos LEY</th>
                    <th className="px-4 py-2 text-left">Mandato</th>
                    <th className="px-4 py-2 text-left">Bloque</th>
                  </tr>
                </thead>
                <tbody>
                  {diputados.map((diputado, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <div className="flex flex-col items-center space-y-1">
                          <img
                            src={diputado.fotoCompleta || diputado.foto}
                            alt={diputado.nombre}
                            className="w-12 h-12 rounded-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = diputado.foto;
                            }}
                          />
                          {diputado.fotoCompleta && (
                            <span className="text-xs text-green-600">✓</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <a
                          href={diputado.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          {diputado.nombre}
                        </a>
                      </td>
                      <td className="px-4 py-2">{diputado.distrito}</td>
                      <td className="px-4 py-2">
                        <span className={diputado.profesion ? 'text-green-600' : 'text-gray-400'}>
                          {diputado.profesion || 'No disponible'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className={diputado.fechaNacimiento ? 'text-green-600' : 'text-gray-400'}>
                          {diputado.fechaNacimiento || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {diputado.email ? (
                          <a
                            href={`mailto:${diputado.email}`}
                            className="text-blue-600 hover:text-blue-800 underline text-sm"
                          >
                            {diputado.email}
                          </a>
                        ) : (
                          <span className="text-gray-400">No disponible</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="text-sm">
                          {(diputado.proyectosLeyFirmante !== undefined || diputado.proyectosLeyCofirmante !== undefined) ? (
                            <>
                              <div className="flex items-center space-x-2">
                                <span className="text-green-600 font-semibold">F:</span>
                                <span className={diputado.proyectosLeyFirmante ? 'text-green-600' : 'text-gray-400'}>
                                  {diputado.proyectosLeyFirmante ?? 'N/A'}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-blue-600 font-semibold">C:</span>
                                <span className={diputado.proyectosLeyCofirmante ? 'text-blue-600' : 'text-gray-400'}>
                                  {diputado.proyectosLeyCofirmante ?? 'N/A'}
                                </span>
                              </div>
                            </>
                          ) : (
                            <span className="text-gray-400">Sin datos</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="text-sm">
                          <div>{diputado.mandato}</div>
                          <div className="text-gray-500">
                            {diputado.inicioMandato} - {diputado.finMandato}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm">{diputado.bloque}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-gray-600">
          <p>API Endpoint: <code className="bg-gray-100 px-2 py-1 rounded">/api/diputados</code></p>
          <p className="mt-2 text-sm">Haz clic en &quot;Obtener Diputados&quot; para hacer scraping de https://www.hcdn.gob.ar/diputados/</p>
        </div>
      </div>
    </div>
  );
}
