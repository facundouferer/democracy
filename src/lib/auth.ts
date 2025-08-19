import { NextRequest } from 'next/server';

// Obtener API Keys desde variables de entorno
function getValidApiKeys(): string[] {
  const apiKeys = process.env.API_KEYS;

  if (!apiKeys) {
    // En desarrollo, mostrar error claro para configurar las keys
    if (process.env.NODE_ENV === 'development') {
      throw new Error('API_KEYS no configurado. Crea un archivo .env.local con: API_KEYS=tu-key-1,tu-key-2');
    }

    // En producción, es obligatorio tener API_KEYS configurado
    throw new Error('API_KEYS no configurado en variables de entorno');
  }  // Dividir por comas y limpiar espacios
  return apiKeys.split(',').map(key => key.trim()).filter(key => key.length > 0);
}

const VALID_API_KEYS = getValidApiKeys();

export function validateApiKey(request: NextRequest): boolean {
  // Verificar en el header Authorization
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const apiKey = authHeader.substring(7);
    if (VALID_API_KEYS.includes(apiKey)) {
      return true;
    }
  }

  // Verificar en el header X-API-Key
  const apiKeyHeader = request.headers.get('x-api-key');
  if (apiKeyHeader && VALID_API_KEYS.includes(apiKeyHeader)) {
    return true;
  }

  // Verificar en query parameter
  const url = new URL(request.url);
  const apiKeyParam = url.searchParams.get('apikey') || url.searchParams.get('api_key');
  if (apiKeyParam && VALID_API_KEYS.includes(apiKeyParam)) {
    return true;
  }

  return false;
}

export function createUnauthorizedResponse() {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'API Key requerida',
      message: 'Acceso no autorizado. Proporciona una API Key válida.',
      instructions: {
        methods: [
          'Header: Authorization: Bearer YOUR_API_KEY',
          'Header: X-API-Key: YOUR_API_KEY',
          'Query param: ?apikey=YOUR_API_KEY'
        ],
        demoKeys: process.env.NODE_ENV === 'development' ? [
          'Configura API_KEYS en .env.local para desarrollo'
        ] : ['Contacta al administrador para obtener una API Key']
      }
    }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer realm="API"'
      }
    }
  );
}
