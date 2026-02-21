'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

type LegislatorType = 'diputado' | 'senador';

export type LegislatorCard = {
  tipo: LegislatorType;
  slug?: string;
  nombre: string;
  apellido?: string;
  distrito: string;
  bloque: string;
  mandato: string;
  profesion?: string;
  fecha_nacimiento?: string;
  total_proyectos: number;
  foto: string;
  link: string;
  resumen?: string;
};

type ResumenResponse = {
  ok: boolean;
  resumen?: string;
  message?: string;
};

type Props = {
  items: LegislatorCard[];
};

function getBloqueInitial(bloque: string): string {
  const normalized = (bloque || '').trim();
  if (!normalized) {
    return '?';
  }

  const match = normalized.match(/[A-Za-zÁÉÍÓÚÜÑ]/);
  return (match?.[0] || normalized[0]).toUpperCase();
}

function toTitleCase(value: string): string {
  return (value || '')
    .toLowerCase()
    .replace(/\b([a-záéíóúüñ])/gi, (char) => char.toUpperCase());
}

function isLegacyResumen(resumen: string): boolean {
  const normalized = (resumen || '').trim().toLowerCase();
  return (
    normalized.startsWith('quien es el o la') ||
    normalized.includes(' argentin ') ||
    normalized.startsWith('quién es la persona diputada o diputado') ||
    normalized.startsWith('quién es la persona senadora o senador')
  );
}

export default function LegislatorsGridClient({ items }: Props) {
  const [selected, setSelected] = useState<LegislatorCard | null>(null);
  const [resumen, setResumen] = useState('');
  const [loadingResumen, setLoadingResumen] = useState(false);
  const [errorResumen, setErrorResumen] = useState('');
  const [resumenCache, setResumenCache] = useState<Record<string, string>>({});

  const modalTitle = useMemo(() => {
    if (!selected) {
      return '';
    }

    if (selected.tipo === 'diputado') {
      return `${selected.apellido}, ${selected.nombre}`;
    }

    return selected.nombre;
  }, [selected]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSelected(null);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  async function loadResumen(item: LegislatorCard) {
    const cacheKey =
      item.tipo === 'diputado' ? `diputado:${item.slug ?? ''}` : `senador:${item.link}`;
    const localCached = resumenCache[cacheKey];
    if (localCached && !isLegacyResumen(localCached)) {
      setResumen(localCached);
      setErrorResumen('');
      return;
    }

    if (item.resumen?.trim() && !isLegacyResumen(item.resumen)) {
      const cachedResumen = item.resumen.trim();
      setResumen(cachedResumen);
      setResumenCache((prev) => ({ ...prev, [cacheKey]: cachedResumen }));
      setErrorResumen('');
      return;
    }

    setLoadingResumen(true);
    setErrorResumen('');
    setResumen('');

    try {
      const response = await fetch('/api/resumen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });

      const data = (await response.json()) as ResumenResponse;
      if (!response.ok || !data.ok || !data.resumen) {
        throw new Error(data.message ?? 'No se pudo generar el resumen');
      }

      const newResumen = data.resumen.trim();
      setResumen(newResumen);
      setResumenCache((prev) => ({ ...prev, [cacheKey]: newResumen }));
      setSelected((prev) => (prev ? { ...prev, resumen: newResumen } : prev));
    } catch (error) {
      setErrorResumen(error instanceof Error ? error.message : 'Error al generar resumen');
    } finally {
      setLoadingResumen(false);
    }
  }

  function openModal(item: LegislatorCard) {
    const cacheKey =
      item.tipo === 'diputado' ? `diputado:${item.slug ?? ''}` : `senador:${item.link}`;
    const localCached = resumenCache[cacheKey];
    const initialResumen =
      localCached && !isLegacyResumen(localCached)
        ? localCached
        : item.resumen?.trim() && !isLegacyResumen(item.resumen)
          ? item.resumen.trim()
          : '';

    setSelected(item);
    setResumen(initialResumen);
    setErrorResumen('');
    void loadResumen(item);
  }

  return (
    <>
      <div className="cards-grid">
        {items.map((item) => {
          const displayName =
            item.tipo === 'diputado' ? `${item.apellido}, ${item.nombre}` : item.nombre;
          const district =
            item.tipo === 'diputado' ? toTitleCase(item.distrito) : item.distrito;

          return (
            <article
              key={item.tipo === 'diputado' ? item.slug : item.link}
              className="dip-card ornate-border clickable-card"
              role="button"
              tabIndex={0}
              onClick={() => openModal(item)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openModal(item);
                }
              }}
            >
              <div className="block-badge" aria-hidden="true">
                <Image src="/img/escudo.svg" alt="" width={52} height={52} />
                <span>{getBloqueInitial(item.bloque)}</span>
              </div>

              <div className="card-photo gold-rim">
                <Image src={item.foto} alt={displayName} width={176} height={176} />
              </div>

              <h3>{displayName}</h3>
              <p className="district-title">{district}</p>

              <div className="card-meta">
                <p>
                  <strong>Tribu</strong>
                  <span>{item.bloque}</span>
                </p>
                <p>
                  <strong>Mandato</strong>
                  <span>{item.mandato}</span>
                </p>
                {item.tipo === 'diputado' ? (
                  <>
                    <p>
                      <strong>Clase</strong>
                      <span>{item.profesion || 'N/D'}</span>
                    </p>
                    <p>
                      <strong>Nacimiento</strong>
                      <span>{item.fecha_nacimiento || 'N/D'}</span>
                    </p>
                  </>
                ) : null}
              </div>

              <div className="quests-wrap">
                <span className="quests-label">Proyectos</span>
                <div className="rhombus">
                  <span className="rhombus-content">{item.total_proyectos ?? 0}</span>
                </div>
              </div>

              <button
                type="button"
                className="wood-plaque"
                onClick={(event) => {
                  event.stopPropagation();
                  openModal(item);
                }}
              >
                Ver Perfil
              </button>
            </article>
          );
        })}
      </div>

      {selected ? (
        <div
          className="modal-overlay"
          onClick={() => setSelected(null)}
          role="presentation"
        >
          <section
            className="modal-card ornate-border"
            role="dialog"
            aria-modal="true"
            aria-label={modalTitle}
            onClick={(event) => event.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setSelected(null)} aria-label="Cerrar">
              ×
            </button>

            <div className="modal-header">
              <div className="card-photo gold-rim">
                <Image src={selected.foto} alt={modalTitle} width={176} height={176} />
              </div>
              <div className="modal-head-text">
                <h2>{modalTitle}</h2>
                <p className="district-title">
                  {selected.tipo === 'diputado'
                    ? toTitleCase(selected.distrito)
                    : selected.distrito}
                </p>
              </div>
            </div>

            <div className="card-meta modal-meta">
              <p>
                <strong>Tribu</strong>
                <span>{selected.bloque}</span>
              </p>
              <p>
                <strong>Mandato</strong>
                <span>{selected.mandato}</span>
              </p>
              {selected.tipo === 'diputado' ? (
                <>
                  <p>
                    <strong>Clase</strong>
                    <span>{selected.profesion || 'N/D'}</span>
                  </p>
                  <p>
                    <strong>Nacimiento</strong>
                    <span>{selected.fecha_nacimiento || 'N/D'}</span>
                  </p>
                </>
              ) : null}
              <p>
                <strong>Proyectos</strong>
                <span>{selected.total_proyectos ?? 0}</span>
              </p>
            </div>

            <section className="summary-scroll">
              <h3>Crónica del Reino</h3>
              {loadingResumen ? <p className="summary-loading">Consultando a los sabios...</p> : null}
              {errorResumen ? <p className="error-text">{errorResumen}</p> : null}
              {!loadingResumen && !errorResumen ? <p>{resumen || 'Sin resumen.'}</p> : null}
            </section>

            <a className="wood-plaque" href={selected.link} target="_blank" rel="noreferrer">
              Ver perfil oficial
            </a>
          </section>
        </div>
      ) : null}
    </>
  );
}
