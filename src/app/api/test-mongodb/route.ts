import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    console.log('🔌 Intentando conectar a MongoDB...');
    console.log('📍 MONGODB_URI configurado:', process.env.MONGODB_URI ? 'SÍ' : 'NO');

    if (!process.env.MONGODB_URI) {
      return Response.json(
        {
          success: false,
          error: 'MONGODB_URI no está configurado',
          variables: Object.keys(process.env).filter(key => key.includes('MONGO'))
        },
        { status: 500 }
      );
    }

    const db = await connectDB();
    console.log('✅ Conexión exitosa a MongoDB');

    // Test básico: obtener info de la conexión
    const admin = db.connection.db.admin();
    const info = await admin.ping();

    return Response.json({
      success: true,
      message: 'Conexión MongoDB exitosa',
      database: db.connection.name,
      readyState: db.connection.readyState,
      host: db.connection.host,
      ping: info
    });

  } catch (error: any) {
    console.error('❌ Error conectando a MongoDB:', error.message);

    return Response.json(
      {
        success: false,
        error: 'Error de conexión MongoDB',
        details: error.message,
        mongoUri: process.env.MONGODB_URI ? 'Configurado' : 'No configurado'
      },
      { status: 500 }
    );
  }
}
