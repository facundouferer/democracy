import { NextResponse } from 'next/server';

import connectDB from '@/lib/mongodb';
import Diputado from '@/models/Diputado';

export async function GET() {
  try {
    await connectDB();
    const diputados = await Diputado.find({})
      .sort({ apellido: 1, nombre: 1 })
      .lean();

    return NextResponse.json({ ok: true, diputados });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Error al obtener diputados',
      },
      { status: 500 }
    );
  }
}
