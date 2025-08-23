import { NextRequest } from 'next/server';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Diputado from '@/models/Diputado';

export async function GET(request: NextRequest) {
  // Validar API Key
  if (!validateApiKey(request)) {
    return createUnauthorizedResponse();
  }

  try {
    await connectDB();

    const url = new URL(request.url);
    const slug = url.pathname.split('/').pop();

    if (!slug) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Slug de diputado requerido'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Buscar diputado por slug
    const diputado = await Diputado.findOne({ slug }).lean();

    if (!diputado) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Diputado no encontrado'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: diputado
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[DIPUTADO-DB] Error consultando diputado:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error al consultar diputado',
        details: error instanceof Error ? error.message : 'Error desconocido'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
