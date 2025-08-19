import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Información de autenticación para la API de Diputados',
    authentication: {
      required: true,
      methods: [
        {
          type: 'Header Authorization',
          format: 'Authorization: Bearer YOUR_API_KEY',
          example: 'Authorization: Bearer YOUR_API_KEY'
        },
        {
          type: 'Header X-API-Key',
          format: 'X-API-Key: YOUR_API_KEY',
          example: 'X-API-Key: YOUR_API_KEY'
        },
        {
          type: 'Query Parameter',
          format: '?apikey=YOUR_API_KEY',
          example: '/api/diputados?apikey=YOUR_API_KEY'
        }
      ],
      keyGeneration: {
        instruction: 'Genera API Keys seguras usando:',
        command: 'node scripts/generate-api-keys.js --count 3 --prefix "your-app"',
        note: 'Configura las keys generadas en variables de entorno API_KEYS'
      }
    },
    endpoints: [
      {
        path: '/api/diputados',
        method: 'GET',
        description: 'Obtiene lista de diputados con detalles opcionales',
        authRequired: true
      },
      {
        path: '/api/diputados/[slug]',
        method: 'GET',
        description: 'Obtiene detalles de un diputado específico',
        authRequired: true
      },
      {
        path: '/api/auth/info',
        method: 'GET',
        description: 'Información sobre autenticación (endpoint público)',
        authRequired: false
      }
    ],
    examples: {
      curl: [
        'curl -H "X-API-Key: YOUR_API_KEY" http://localhost:3001/api/diputados',
        'curl -H "Authorization: Bearer YOUR_API_KEY" http://localhost:3001/api/diputados?limit=5',
        'curl "http://localhost:3001/api/diputados?apikey=YOUR_API_KEY&details=false"'
      ]
    }
  });
}
