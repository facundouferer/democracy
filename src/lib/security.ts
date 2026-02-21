import { createHash } from 'crypto';

function getRequestHost(request: Request): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost ?? request.headers.get('host') ?? '';
  return host.split(',')[0].trim().toLowerCase();
}

export function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) {
    return false;
  }

  try {
    const originUrl = new URL(origin);
    return originUrl.host.toLowerCase() === getRequestHost(request);
  } catch {
    return false;
  }
}

export function assertSameOrigin(request: Request): void {
  if (!isAllowedOrigin(request)) {
    throw new Error('FORBIDDEN_CSRF');
  }
}

export function assertSafeGetOrigin(request: Request): void {
  const fetchSite = (request.headers.get('sec-fetch-site') ?? '').toLowerCase();

  if (fetchSite === 'same-origin' || fetchSite === 'none') {
    return;
  }

  if (!isAllowedOrigin(request)) {
    throw new Error('FORBIDDEN_CSRF');
  }
}

export function getClientFingerprint(request: Request): string {
  const xff = request.headers.get('x-forwarded-for') ?? '';
  const ip = xff.split(',')[0].trim() || 'unknown-ip';
  const ua = request.headers.get('user-agent') ?? 'unknown-ua';
  return createHash('sha256').update(`${ip}|${ua}`).digest('hex');
}

export function isAllowedHost(urlString: string, allowedHosts: string[]): boolean {
  try {
    const url = new URL(urlString);
    const host = url.hostname.toLowerCase();
    return allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}
