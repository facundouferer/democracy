type LegislatorType = 'diputado' | 'senador';

type SummaryInput = {
  tipo: LegislatorType;
  nombre: string;
  apellido?: string;
  distrito: string;
  bloque: string;
  mandato: string;
  profesion?: string;
  fecha_nacimiento?: string;
  total_proyectos?: number;
};

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeLabel(value: string): string {
  return normalizeText(value).normalize('NFC');
}

function toTitleCase(value: string): string {
  return normalizeLabel(value)
    .toLocaleLowerCase('es-AR')
    .replace(/\b([a-záéíóúüñ])/gi, (char) => char.toUpperCase());
}

function formatBloque(value: string): string {
  const acronyms = new Set(['UCR', 'PRO', 'PJ', 'ARI', 'MST', 'FIT']);
  return toTitleCase(value)
    .split(' ')
    .map((token) => {
      const plain = token.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '').toUpperCase();
      if (acronyms.has(plain)) {
        return token.replace(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+/g, plain);
      }
      return token;
    })
    .join(' ');
}

function toDisplayName(input: SummaryInput): string {
  if (input.tipo === 'diputado') {
    const apellido = normalizeText(input.apellido ?? '');
    const nombre = normalizeText(input.nombre);
    return [nombre, apellido].filter(Boolean).join(' ');
  }
  return normalizeText(input.nombre);
}

function clampToMaxChars(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }

  const sliced = text.slice(0, maxChars);
  const lastSentenceEnd = Math.max(sliced.lastIndexOf('.'), sliced.lastIndexOf('!'), sliced.lastIndexOf('?'));
  if (lastSentenceEnd > 250) {
    return sliced.slice(0, lastSentenceEnd + 1).trim();
  }

  return sliced.trimEnd() + '...';
}

export async function generateResumenWithGemini(input: SummaryInput): Promise<string> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Falta GOOGLE_GEMINI_API_KEY');
  }

  const models = ['gemini-2.5-flash', 'gemini-flash-latest'];
  const minChars = 400;
  const maxChars = 1000;
  const actor = toDisplayName(input);
  const provincia = toTitleCase(input.distrito);
  const bloque = formatBloque(input.bloque);

  const cargo = input.tipo === 'diputado' ? 'diputada o diputado nacional' : 'senadora o senador nacional';
  const prompt = `
Escribí un resumen en español rioplatense con tono institucional claro, sin frases teatrales ni arcaicas.
Longitud objetivo entre 450 y 800 caracteres (mínimo absoluto 400, máximo 1000).
No inventes datos. No uses listas ni encabezados.
No empieces con fórmulas como "Oíd", "Escuchad", "Aquí", "Gentes de bien" o similares.
No uses comillas.
Debe ser un único párrafo.

Datos:
- Cargo: ${cargo}
- Nombre: ${actor}
- Provincia: ${provincia}
- Bloque: ${bloque}
- Mandato: ${normalizeText(input.mandato)}
${input.profesion ? `- Profesión: ${normalizeText(input.profesion)}` : ''}
${input.fecha_nacimiento ? `- Fecha de nacimiento: ${normalizeText(input.fecha_nacimiento)}` : ''}
${typeof input.total_proyectos === 'number' ? `- Total de proyectos: ${input.total_proyectos}` : ''}
  `.trim();

  let lastError = 'Gemini no devolvió respuesta';
  console.log('[Gemini] Iniciando consulta', {
    tipo: input.tipo,
    actor,
    distrito: provincia,
    bloque,
  });
  console.log('[Gemini] Prompt:', prompt);

  for (const model of models) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    console.log('[Gemini] Intento con modelo:', model);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 420,
        },
      }),
      cache: 'no-store',
    });

    console.log('[Gemini] HTTP status', { model, status: response.status });

    if (!response.ok) {
      const detail = await response.text();
      console.log('[Gemini] Error body:', detail);
      lastError = `Gemini ${model} HTTP ${response.status}: ${detail.slice(0, 180)}`;
      continue;
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const text =
      data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join(' ') ?? '';
    const cleaned = normalizeText(text);
    console.log('[Gemini] Respuesta cruda:', text);
    console.log('[Gemini] Respuesta normalizada:', cleaned);
    if (cleaned) {
      const startsForbidden = /^(o[ií]d|escuchad|aqu[ií]|gentes de bien)\b/i.test(cleaned);
      const clamped = clampToMaxChars(cleaned, maxChars);
      if (!startsForbidden && clamped.length >= minChars) {
        return clamped;
      }

      console.log('[Gemini] Respuesta descartada por formato/longitud', {
        startsForbidden,
        length: cleaned.length,
      });

      const expandPrompt = `
Reescribí y expandí el siguiente texto para que tenga entre 450 y 800 caracteres.
Mantené tono institucional claro y un único párrafo.
No agregues datos que no estén en el texto original.

Texto original:
${cleaned}
      `.trim();

      console.log('[Gemini] Reintento de expansión con el mismo modelo:', model);
      const expandResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: expandPrompt }] }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 520,
          },
        }),
        cache: 'no-store',
      });

      console.log('[Gemini] HTTP status expansión', { model, status: expandResponse.status });

      if (expandResponse.ok) {
        const expandData = (await expandResponse.json()) as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
        };

        const expandedText =
          expandData.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join(' ') ??
          '';
        const expandedClean = normalizeText(expandedText);
        const expandedStartsForbidden = /^(o[ií]d|escuchad|aqu[ií]|gentes de bien)\b/i.test(
          expandedClean
        );
        const expandedClamped = clampToMaxChars(expandedClean, maxChars);
        console.log('[Gemini] Respuesta expansión:', expandedClean);
        if (!expandedStartsForbidden && expandedClamped.length >= minChars) {
          return expandedClamped;
        }
      } else {
        const expandError = await expandResponse.text();
        console.log('[Gemini] Error expansión body:', expandError);
      }
    }

    lastError = `Gemini ${model} devolvió un resumen inválido por longitud o estilo`;
  }

  throw new Error(lastError);
}
