import { load } from 'cheerio';
import { isAllowedHost } from '@/lib/security';

const BASE_URL = 'https://www.diputados.gov.ar';
const LIST_URL = `${BASE_URL}/diputados/`;
const DIPUTADOS_ALLOWED_HOSTS = ['diputados.gov.ar', 'www.diputados.gov.ar'];

export type ScrapedDiputado = {
  nombre: string;
  apellido: string;
  distrito: string;
  bloque: string;
  mandato: string;
  profesion: string;
  fecha_nacimiento: string;
  total_proyectos: number;
  foto: string;
  link: string;
  slug: string;
};

export type ScrapeProgressEvent =
  | {
      type: 'list_loaded';
      total: number;
    }
  | {
      type: 'deputy_start';
      index: number;
      total: number;
      diputado: Pick<ScrapedDiputado, 'nombre' | 'apellido' | 'slug'>;
    }
  | {
      type: 'deputy_done';
      index: number;
      total: number;
      diputado: Pick<ScrapedDiputado, 'nombre' | 'apellido' | 'slug'>;
      total_proyectos: number;
      profesion: string;
      fecha_nacimiento: string;
    }
  | {
      type: 'deputy_error';
      index: number;
      total: number;
      diputado: Pick<ScrapedDiputado, 'nombre' | 'apellido' | 'slug'>;
      error: string;
    };

type ScrapeOptions = {
  onProgress?: (event: ScrapeProgressEvent) => Promise<void> | void;
  projectConcurrency?: number;
};

const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function splitNombreCompleto(fullName: string): { apellido: string; nombre: string } {
  const [apellidoPart, ...nombreParts] = fullName.split(',');
  const apellido = normalizeSpace(apellidoPart ?? '');
  const nombre = normalizeSpace(nombreParts.join(','));

  if (apellido && nombre) {
    return { apellido, nombre };
  }

  const tokens = normalizeSpace(fullName).split(' ');
  const apellidoFallback = tokens.shift() ?? '';
  return {
    apellido: apellidoFallback,
    nombre: tokens.join(' '),
  };
}

function toAbsoluteUrl(url: string | undefined): string {
  if (!url) {
    return '';
  }
  try {
    return new URL(url, BASE_URL).toString();
  } catch {
    return url;
  }
}

function normalizePhotoUrl(url: string): string {
  return url.replace('_small.', '_medium.');
}

async function validatePhotoUrl(url: string): Promise<boolean> {
  if (!url) {
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    let response = await fetch(url, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DemocracyBot/1.0)',
      },
    });

    if (!response.ok && (response.status === 405 || response.status === 403)) {
      response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DemocracyBot/1.0)',
        },
      });
      response.body?.cancel();
    }

    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveValidPhotoUrl(profilePhoto: string, listPhoto: string): Promise<string> {
  const candidates = [profilePhoto, listPhoto, normalizePhotoUrl(listPhoto)]
    .map((url) => normalizePhotoUrl(url))
    .filter((url, index, arr) => Boolean(url) && arr.indexOf(url) === index);

  for (const candidate of candidates) {
    if (await validatePhotoUrl(candidate)) {
      return candidate;
    }
  }

  return normalizePhotoUrl(listPhoto);
}

async function fetchWithRetry(url: string): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DemocracyBot/1.0)',
        },
        cache: 'no-store',
        signal: controller.signal,
      });

      if (response.ok) {
        return response;
      }

      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Error de red en scraping');
}

function parseProjectCountFromText(text: string): number | null {
  const normalized = normalizeSpace(text);
  const match = normalized.match(/([\d.]+)\s+Proyecto(?:s)?\s+Encontrado(?:s)?/i);
  if (!match) {
    return null;
  }
  const amount = Number(match[1].replace(/\./g, ''));
  return Number.isFinite(amount) ? amount : null;
}

function buildProjectsUrl(profileUrl: string): string {
  const normalized = profileUrl.endsWith('/') ? profileUrl : `${profileUrl}/`;
  return `${normalized}listado-proyectos.html`;
}

async function fetchProjectCountForDiputado(profileUrl: string): Promise<number> {
  if (!isAllowedHost(profileUrl, DIPUTADOS_ALLOWED_HOSTS)) {
    return 0;
  }

  const projectsUrl = buildProjectsUrl(profileUrl);
  const response = await fetchWithRetry(projectsUrl);

  const html = await response.text();
  const $ = load(html);

  const paginatorText = $('.textoPaginador').first().text();
  const fromPaginator = parseProjectCountFromText(paginatorText);
  if (fromPaginator !== null) {
    return fromPaginator;
  }

  return $('table#tablesorter tbody tr').length;
}

async function fetchProfileDetailsForDiputado(
  profileUrl: string
): Promise<Pick<ScrapedDiputado, 'profesion' | 'fecha_nacimiento' | 'foto'>> {
  if (!isAllowedHost(profileUrl, DIPUTADOS_ALLOWED_HOSTS)) {
    return { profesion: '', fecha_nacimiento: '', foto: '' };
  }

  const response = await fetchWithRetry(profileUrl);

  const html = await response.text();
  const $ = load(html);

  const profesion = normalizeSpace($('.encabezadoProfesion span').first().text());
  const fechaNac = normalizeSpace($('.encabezadoFecha span').first().text());
  const fotoPerfil = toAbsoluteUrl(
    $('.siteDiputadoPerfil .box1 img').first().attr('src') ??
      $('img[title*="Foto Diputado"]').first().attr('src')
  );

  return {
    profesion,
    fecha_nacimiento: fechaNac,
    foto: normalizePhotoUrl(fotoPerfil),
  };
}

async function withConcurrencyLimit<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  const safeLimit = Math.max(1, limit);
  let index = 0;

  async function runWorker() {
    while (index < items.length) {
      const current = index++;
      await worker(items[current], current);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(safeLimit, items.length) }, () => runWorker())
  );
}

export async function scrapeDiputados(options: ScrapeOptions = {}): Promise<ScrapedDiputado[]> {
  const { onProgress, projectConcurrency = 8 } = options;
  const response = await fetch(LIST_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; DemocracyBot/1.0)',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`No se pudo acceder al listado: HTTP ${response.status}`);
  }

  const html = await response.text();
  const $ = load(html);
  const rows = $('#tablaDiputados tbody tr');

  const diputados: ScrapedDiputado[] = [];

  rows.each((_, row) => {
    const columns = $(row).find('td');
    if (columns.length < 5) {
      return;
    }

    const foto = toAbsoluteUrl($(columns[0]).find('img').attr('src'));
    const anchor = $(columns[1]).find('a');
    const nombreCompleto = normalizeSpace(anchor.text());
    const link = toAbsoluteUrl(anchor.attr('href'));
    const distrito = normalizeSpace($(columns[2]).text());
    const bloque = normalizeSpace($(columns[3]).text());
    const mandato = normalizeSpace($(columns[4]).text());
    const slug = link.split('/').filter(Boolean).pop() ?? '';

    const { apellido, nombre } = splitNombreCompleto(nombreCompleto);

    if (!nombre || !apellido || !distrito || !bloque || !mandato || !foto || !link || !slug) {
      return;
    }

    if (!isAllowedHost(link, DIPUTADOS_ALLOWED_HOSTS)) {
      return;
    }

    diputados.push({
      nombre,
      apellido,
      distrito,
      bloque,
      mandato,
      profesion: '',
      fecha_nacimiento: '',
      total_proyectos: 0,
      foto,
      link,
      slug,
    });
  });

  await onProgress?.({
    type: 'list_loaded',
    total: diputados.length,
  });

  if (onProgress) {
    for (let i = 0; i < diputados.length; i += 1) {
      const diputado = diputados[i];
      const index = i + 1;

      await onProgress({
        type: 'deputy_start',
        index,
        total: diputados.length,
        diputado: {
          nombre: diputado.nombre,
          apellido: diputado.apellido,
          slug: diputado.slug,
        },
      });

      try {
        const [totalResult, detailsResult] = await Promise.allSettled([
          fetchProjectCountForDiputado(diputado.link),
          fetchProfileDetailsForDiputado(diputado.link),
        ]);

        if (totalResult.status === 'fulfilled') {
          diputado.total_proyectos = totalResult.value;
        } else {
          diputado.total_proyectos = 0;
        }

        if (detailsResult.status === 'fulfilled') {
          diputado.profesion = detailsResult.value.profesion;
          diputado.fecha_nacimiento = detailsResult.value.fecha_nacimiento;
          diputado.foto = await resolveValidPhotoUrl(
            detailsResult.value.foto,
            diputado.foto
          );
        } else {
          diputado.profesion = '';
          diputado.fecha_nacimiento = '';
          diputado.foto = await resolveValidPhotoUrl('', diputado.foto);
        }

        await onProgress({
          type: 'deputy_done',
          index,
          total: diputados.length,
          total_proyectos: diputado.total_proyectos,
          profesion: diputado.profesion,
          fecha_nacimiento: diputado.fecha_nacimiento,
          diputado: {
            nombre: diputado.nombre,
            apellido: diputado.apellido,
            slug: diputado.slug,
          },
        });
      } catch (error) {
        diputado.total_proyectos = 0;
        diputado.foto = await resolveValidPhotoUrl('', diputado.foto);
        await onProgress({
          type: 'deputy_error',
          index,
          total: diputados.length,
          error: error instanceof Error ? error.message : 'Error al obtener proyectos',
          diputado: {
            nombre: diputado.nombre,
            apellido: diputado.apellido,
            slug: diputado.slug,
          },
        });
      }
    }
  } else {
    await withConcurrencyLimit(diputados, projectConcurrency, async (diputado) => {
      try {
        const [totalResult, detailsResult] = await Promise.allSettled([
          fetchProjectCountForDiputado(diputado.link),
          fetchProfileDetailsForDiputado(diputado.link),
        ]);

        diputado.total_proyectos = totalResult.status === 'fulfilled' ? totalResult.value : 0;

        if (detailsResult.status === 'fulfilled') {
          diputado.profesion = detailsResult.value.profesion;
          diputado.fecha_nacimiento = detailsResult.value.fecha_nacimiento;
          diputado.foto = await resolveValidPhotoUrl(
            detailsResult.value.foto,
            diputado.foto
          );
        } else {
          diputado.profesion = '';
          diputado.fecha_nacimiento = '';
          diputado.foto = await resolveValidPhotoUrl('', diputado.foto);
        }
      } finally {
        diputado.foto = normalizePhotoUrl(diputado.foto);
      }
    });
  }

  return diputados;
}
