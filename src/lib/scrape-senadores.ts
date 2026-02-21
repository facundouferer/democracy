import { load } from 'cheerio';
import { isAllowedHost } from '@/lib/security';

const SENADO_BASE_URL = 'https://www.senado.gob.ar';
const SENADO_LIST_URL = `${SENADO_BASE_URL}/senadores/listados/listaSenadoRes`;
const SENADO_ALLOWED_HOSTS = ['senado.gob.ar', 'www.senado.gob.ar'];

export type ScrapedSenador = {
  nombre: string;
  distrito: string;
  bloque: string;
  mandato: string;
  total_proyectos: number;
  foto: string;
  link: string;
  email: string;
};

export type ScrapeSenadoresProgressEvent =
  | {
      type: 'senators_list_loaded';
      total: number;
    }
  | {
      type: 'senator_start';
      index: number;
      total: number;
      senador: Pick<ScrapedSenador, 'nombre' | 'link'>;
    }
  | {
      type: 'senator_done';
      index: number;
      total: number;
      senador: Pick<ScrapedSenador, 'nombre' | 'link'>;
      total_proyectos: number;
    }
  | {
      type: 'senator_error';
      index: number;
      total: number;
      senador: Pick<ScrapedSenador, 'nombre' | 'link'>;
      error: string;
    };

type ScrapeSenadoresOptions = {
  onProgress?: (event: ScrapeSenadoresProgressEvent) => Promise<void> | void;
  projectConcurrency?: number;
};

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function toAbsoluteUrl(url: string | undefined): string {
  if (!url) {
    return '';
  }
  try {
    return new URL(url, SENADO_BASE_URL).toString();
  } catch {
    return url;
  }
}

function getProjectRowsCount(html: string): number {
  const $ = load(html);
  const tbodyRows = $('#3 table tbody tr');
  if (tbodyRows.length > 0) {
    return tbodyRows.length;
  }

  const table = $('#3 table').first();
  if (!table.length) {
    return 0;
  }

  const rows = table.find('tr');
  if (!rows.length) {
    return 0;
  }

  // Descuenta la cabecera.
  return Math.max(0, rows.length - 1);
}

function getLastProjectsPage(html: string): number {
  const pages = Array.from(html.matchAll(/ProyectosSenador=(\d+)/g))
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (pages.length === 0) {
    return 1;
  }

  return Math.max(...pages);
}

async function fetchProjectsCountForSenador(profileUrl: string): Promise<number> {
  if (!isAllowedHost(profileUrl, SENADO_ALLOWED_HOSTS)) {
    return 0;
  }

  const firstResponse = await fetch(profileUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; DemocracyBot/1.0)',
    },
    cache: 'no-store',
  });

  if (!firstResponse.ok) {
    return 0;
  }

  const firstHtml = await firstResponse.text();
  const firstPageCount = getProjectRowsCount(firstHtml);
  const lastPage = getLastProjectsPage(firstHtml);

  if (lastPage <= 1) {
    return firstPageCount;
  }

  const lastPageUrl = new URL(profileUrl);
  lastPageUrl.searchParams.set('ProyectosSenador', String(lastPage));

  const lastResponse = await fetch(lastPageUrl.toString(), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; DemocracyBot/1.0)',
    },
    cache: 'no-store',
  });

  if (!lastResponse.ok) {
    return firstPageCount;
  }

  const lastHtml = await lastResponse.text();
  const lastPageCount = getProjectRowsCount(lastHtml);

  return (lastPage - 1) * firstPageCount + lastPageCount;
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

export async function scrapeSenadores(
  options: ScrapeSenadoresOptions = {}
): Promise<ScrapedSenador[]> {
  const { onProgress, projectConcurrency = 5 } = options;
  const response = await fetch(SENADO_LIST_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; DemocracyBot/1.0)',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`No se pudo acceder al listado del Senado: HTTP ${response.status}`);
  }

  const html = await response.text();
  const $ = load(html);
  const rows = $('#senadoresTabla tbody tr');

  const senadores: ScrapedSenador[] = [];

  rows.each((_, row) => {
    const columns = $(row).find('td');
    if (columns.length < 6) {
      return;
    }

    const anchorSenador = $(columns[1]).find('a').first();
    const nombre = normalizeSpace(anchorSenador.text());
    const link = toAbsoluteUrl(anchorSenador.attr('href'));
    const distrito = normalizeSpace($(columns[2]).text());
    const bloque = normalizeSpace($(columns[3]).text()) || 'Sin bloque';

    const mandatoTokens = $(columns[4])
      .text()
      .split(/\r?\n/)
      .map((item) => normalizeSpace(item))
      .filter(Boolean);
    const mandato = mandatoTokens.length >= 2 ? `${mandatoTokens[0]} - ${mandatoTokens[1]}` : normalizeSpace($(columns[4]).text());

    const email = normalizeSpace($(columns[5]).find('a[href^="mailto:"]').first().text());

    const fotoNode = $(columns[0]).find('img').first();
    const foto = toAbsoluteUrl(fotoNode.attr('data-src') || fotoNode.attr('src'));

    if (!nombre || !distrito || !mandato || !foto || !link) {
      return;
    }

    if (!isAllowedHost(link, SENADO_ALLOWED_HOSTS)) {
      return;
    }

    senadores.push({
      nombre,
      distrito,
      bloque,
      mandato,
      total_proyectos: 0,
      foto,
      link,
      email,
    });
  });

  await onProgress?.({
    type: 'senators_list_loaded',
    total: senadores.length,
  });

  await withConcurrencyLimit(senadores, projectConcurrency, async (senador, rowIndex) => {
    const index = rowIndex + 1;
    await onProgress?.({
      type: 'senator_start',
      index,
      total: senadores.length,
      senador: {
        nombre: senador.nombre,
        link: senador.link,
      },
    });

    try {
      senador.total_proyectos = await fetchProjectsCountForSenador(senador.link);
      await onProgress?.({
        type: 'senator_done',
        index,
        total: senadores.length,
        senador: {
          nombre: senador.nombre,
          link: senador.link,
        },
        total_proyectos: senador.total_proyectos,
      });
    } catch (error) {
      senador.total_proyectos = 0;
      await onProgress?.({
        type: 'senator_error',
        index,
        total: senadores.length,
        senador: {
          nombre: senador.nombre,
          link: senador.link,
        },
        error: error instanceof Error ? error.message : 'Error al contar proyectos',
      });
    }
  });

  return senadores;
}
