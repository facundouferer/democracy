import { NextRequest } from 'next/server';

// Obtener API Keys desde variables de entorno (en tiempo de ejecución)
function getValidApiKeys(): string[] {
  const apiKeys = process.env.API_KEYS;
  if (!apiKeys) {
    // No lanzar durante import/build; devolver lista vacía y manejar autorización en tiempo de ejecución
    return [];
  }
  return apiKeys.split(',').map(key => key.trim()).filter(key => key.length > 0);
}

export function validateApiKey(request: NextRequest): boolean {
  const validKeys = getValidApiKeys();

  // Si no hay keys configuradas, siempre devolver false (401) — no lanzar error para permitir build en Vercel
  if (validKeys.length === 0) {
    return false;
  }

  // Verificar en el header Authorization
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const apiKey = authHeader.substring(7);
    if (validKeys.includes(apiKey)) {
      return true;
    }
  }

  // Verificar en el header X-API-Key
  const apiKeyHeader = request.headers.get('x-api-key');
  if (apiKeyHeader && validKeys.includes(apiKeyHeader)) {
    return true;
  }

  // Verificar en query parameter
  try {
    const url = new URL(request.url);
    const apiKeyParam = url.searchParams.get('apikey') || url.searchParams.get('api_key');
    if (apiKeyParam && validKeys.includes(apiKeyParam)) {
      return true;
    }
  } catch {
    // Si la URL no se puede parsear, no autorizamos
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
