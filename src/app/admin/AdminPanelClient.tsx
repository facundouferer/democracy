'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sileo } from 'sileo';

type ProgressEvent =
  | {
      type: 'phase_start';
      phase: 'diputados' | 'senadores';
      message: string;
    }
  | {
      type: 'deputies_list_loaded';
      total: number;
    }
  | {
      type: 'senators_list_loaded';
      total: number;
    }
  | {
      type: 'list_loaded';
      total: number;
    }
  | {
      type: 'deputy_start';
      index: number;
      total: number;
      diputado: { nombre: string; apellido: string; slug: string };
    }
  | {
      type: 'deputy_done';
      index: number;
      total: number;
      total_proyectos: number;
      profesion: string;
      fecha_nacimiento: string;
      diputado: { nombre: string; apellido: string; slug: string };
    }
  | {
      type: 'deputy_error';
      index: number;
      total: number;
      error: string;
      diputado: { nombre: string; apellido: string; slug: string };
    }
  | {
      type: 'senator_start';
      index: number;
      total: number;
      senador: { nombre: string; link: string };
    }
  | {
      type: 'senator_done';
      index: number;
      total: number;
      senador: { nombre: string; link: string };
      total_proyectos: number;
    }
  | {
      type: 'senator_error';
      index: number;
      total: number;
      senador: { nombre: string; link: string };
      error: string;
    };

type DonePayload = {
  ok: boolean;
  totalScrapeados: number;
  diputados: {
    totalScrapeados: number;
    creados: number;
    modificados: number;
  };
  senadores: {
    totalScrapeados: number;
    creados: number;
    modificados: number;
  };
  fecha: string;
};

type LogItem = {
  id: string;
  text: string;
};

function getDiputadoLabel(payload: { nombre: string; apellido: string }): string {
  return `${payload.apellido}, ${payload.nombre}`;
}

export default function AdminPanelClient() {
  const router = useRouter();
  const eventSourceRef = useRef<EventSource | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [currentActor, setCurrentActor] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);

  const progressPercent = useMemo(() => {
    if (!total) {
      return 0;
    }
    return Math.round((processed / total) * 100);
  }, [processed, total]);

  function appendLog(text: string) {
    setLogs((prev) => [
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text },
      ...prev,
    ]);
  }

  function closeStream() {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }

  async function handleScrape() {
    if (loading) {
      return;
    }

    closeStream();
    setLoading(true);
    setMessage(null);
    setTotal(0);
    setProcessed(0);
    setCurrentActor(null);
    setLogs([]);

    appendLog('Iniciando proceso de scraping...');
    sileo.show({
      title: 'Obteniendo datos',
      description: 'Conectando con ambas cámaras...',
      duration: 2000,
    });

    const source = new EventSource(`/api/admin/scrape-stream?t=${Date.now()}`);
    eventSourceRef.current = source;

    source.addEventListener('start', (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as { message: string };
      appendLog(payload.message);
      sileo.show({
        title: 'Scraping en progreso',
        description: payload.message,
        duration: 1800,
      });
    });

    source.addEventListener('progress', (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as ProgressEvent;

      if (payload.type === 'list_loaded') {
        setTotal((prev) => prev + payload.total);
        appendLog(`Listado cargado: ${payload.total} diputados.`);
        return;
      }

      if (payload.type === 'phase_start') {
        appendLog(payload.message);
        return;
      }

      if (payload.type === 'deputies_list_loaded') {
        setTotal((prev) => prev + payload.total);
        appendLog(`Listado cargado: ${payload.total} diputados.`);
        return;
      }

      if (payload.type === 'senators_list_loaded') {
        setTotal((prev) => prev + payload.total);
        appendLog(`Listado cargado: ${payload.total} senadores.`);
        return;
      }

      if (payload.type === 'deputy_start') {
        const name = getDiputadoLabel(payload.diputado);
        setCurrentActor(`Diputado: ${name}`);
        appendLog(`[Diputados ${payload.index}/${payload.total}] Scraping: ${name}`);
        const shouldToast =
          payload.index === 1 || payload.index === payload.total || payload.index % 15 === 0;
        if (shouldToast) {
          sileo.show({
            title: `Procesando ${payload.index}/${payload.total}`,
            description: name,
            duration: 1400,
          });
        }
        return;
      }

      if (payload.type === 'deputy_done') {
        const name = getDiputadoLabel(payload.diputado);
        setProcessed((prev) => prev + 1);
        appendLog(
          `[Diputados ${payload.index}/${payload.total}] ${name}: ${payload.total_proyectos} proyectos, profesión: ${payload.profesion || 'N/D'}, fecha nac: ${payload.fecha_nacimiento || 'N/D'}.`
        );
        return;
      }

      if (payload.type === 'deputy_error') {
        const name = getDiputadoLabel(payload.diputado);
        setProcessed((prev) => prev + 1);
        appendLog(`[Diputados ${payload.index}/${payload.total}] Error en ${name}: ${payload.error}`);
        return;
      }

      if (payload.type === 'senator_start') {
        setCurrentActor(`Senador: ${payload.senador.nombre}`);
        appendLog(`[Senadores ${payload.index}/${payload.total}] Scraping: ${payload.senador.nombre}`);
        return;
      }

      if (payload.type === 'senator_done') {
        setProcessed((prev) => prev + 1);
        appendLog(
          `[Senadores ${payload.index}/${payload.total}] ${payload.senador.nombre}: ${payload.total_proyectos} proyectos.`
        );
        return;
      }

      if (payload.type === 'senator_error') {
        setProcessed((prev) => prev + 1);
        appendLog(
          `[Senadores ${payload.index}/${payload.total}] Error en ${payload.senador.nombre}: ${payload.error}`
        );
      }
    });

    source.addEventListener('done', (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as DonePayload;

      const text =
        `Sincronización OK. Total: ${payload.totalScrapeados}. ` +
        `Diputados: ${payload.diputados.totalScrapeados} (creados ${payload.diputados.creados}, modificados ${payload.diputados.modificados}). ` +
        `Senadores: ${payload.senadores.totalScrapeados} (creados ${payload.senadores.creados}, modificados ${payload.senadores.modificados}).`;

      setMessage(text);
      appendLog(text);
      setCurrentActor(null);
      setLoading(false);
      closeStream();

      sileo.success({
        title: 'Sincronización completada',
        description: `${payload.totalScrapeados} registros procesados`,
      });

      router.refresh();
    });

    source.addEventListener('error', (event) => {
      const payloadRaw = (event as MessageEvent).data;
      const payload = payloadRaw
        ? (JSON.parse(payloadRaw) as { message?: string })
        : { message: 'Error de conexión durante el scraping.' };

      const text = payload.message ?? 'Error de conexión durante el scraping.';
      setMessage(text);
      appendLog(text);
      setCurrentActor(null);
      setLoading(false);
      closeStream();

      sileo.error({
        title: 'Error de scraping',
        description: text,
      });
    });
  }

  async function handleLogout() {
    closeStream();
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  useEffect(() => {
    return () => {
      closeStream();
    };
  }, []);

  return (
    <>
      <div className="admin-actions">
        <button className="primary" onClick={handleScrape} disabled={loading}>
          {loading ? 'OBTENIENDO DATOS...' : 'OBTENER DATOS'}
        </button>
        <button className="secondary" onClick={handleLogout}>
          Cerrar sesión
        </button>
        {message ? <p className="sync-message">{message}</p> : null}
      </div>

      <section className="scrape-progress-panel" aria-live="polite">
        <div className="progress-head">
          <h3>Estado del scraping</h3>
          <span>{loading ? 'En ejecución' : 'En espera'}</span>
        </div>

        <div className="progress-stats">
          <p>
            <strong>Avance:</strong> {processed}/{total} ({progressPercent}%)
          </p>
          <p>
            <strong>Actual:</strong> {currentActor ?? '---'}
          </p>
        </div>

        <div className="progress-bar-wrap" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
          <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="progress-log">
          {logs.length === 0 ? <p className="log-empty">Sin eventos todavía.</p> : null}
          {logs.map((item) => (
            <p key={item.id}>{item.text}</p>
          ))}
        </div>
      </section>
    </>
  );
}
