/**
 * Links de vídeo aceitos nas aulas: YouTube (incluindo "não listado"), Vimeo, Panda Video ou um
 * arquivo .mp4/.webm (no próprio site, em `/videos/...`, ou em um endereço https).
 *
 * O link é convertido para o endereço de incorporação oficial de cada serviço. Qualquer outro
 * formato é recusado — assim o admin não consegue incorporar páginas arbitrárias, e a
 * Content-Security-Policy (`frame-src`) só precisa liberar estes domínios.
 */

export type VideoProvider = 'youtube' | 'vimeo' | 'panda';

export type VideoSource = { kind: 'iframe'; provider: VideoProvider; src: string } | { kind: 'file'; src: string };

/** Domínios liberados em `frame-src` (precisam acompanhar `parseVideoUrl`). */
export const VIDEO_FRAME_SOURCES = [
  'https://www.youtube-nocookie.com',
  'https://player.vimeo.com',
  'https://*.tv.pandavideo.com.br',
] as const;

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com']);
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

function youtubeId(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  let id: string | null = null;
  if (host === 'youtu.be') id = url.pathname.slice(1).split('/')[0] ?? null;
  else if (YOUTUBE_HOSTS.has(host)) {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else id = /^\/(?:embed|shorts|live)\/([^/?#]+)/.exec(url.pathname)?.[1] ?? null;
  }
  return id && YOUTUBE_ID.test(id) ? id : null;
}

function vimeoSrc(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  let match: RegExpExecArray | null = null;
  let hash: string | null = null;
  if (host === 'vimeo.com' || host === 'www.vimeo.com') {
    match = /^\/(\d{6,12})(?:\/([0-9a-f]{6,20}))?\/?$/.exec(url.pathname);
    hash = match?.[2] ?? null;
  } else if (host === 'player.vimeo.com') {
    match = /^\/video\/(\d{6,12})\/?$/.exec(url.pathname);
    hash = url.searchParams.get('h');
  }
  if (!match) return null;
  const safeHash = hash && /^[0-9a-f]{6,20}$/.test(hash) ? hash : null;
  return `https://player.vimeo.com/video/${match[1]}${safeHash ? `?h=${safeHash}` : ''}`;
}

function pandaSrc(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  if (!/^player-vz-[a-z0-9-]{4,60}\.tv\.pandavideo\.com\.br$/.test(host) || !url.pathname.startsWith('/embed')) return null;
  const id = url.searchParams.get('v');
  return id && /^[0-9a-f-]{20,40}$/i.test(id) ? `https://${host}/embed/?v=${id}` : null;
}

export function parseVideoUrl(raw: string | null | undefined): VideoSource | null {
  const value = raw?.trim();
  if (!value || value.length > 500) return null;

  if (value.startsWith('/')) {
    return /^\/videos\/[A-Za-z0-9_\-/]+\.(?:mp4|webm)$/i.test(value) && !value.includes('..')
      ? { kind: 'file', src: value }
      : null;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return null;

  const youtube = youtubeId(url);
  if (youtube) return { kind: 'iframe', provider: 'youtube', src: `https://www.youtube-nocookie.com/embed/${youtube}?rel=0` };
  const vimeo = vimeoSrc(url);
  if (vimeo) return { kind: 'iframe', provider: 'vimeo', src: vimeo };
  const panda = pandaSrc(url);
  if (panda) return { kind: 'iframe', provider: 'panda', src: panda };
  if (/\.(?:mp4|webm)$/i.test(url.pathname)) return { kind: 'file', src: url.toString() };
  return null;
}

/** "1 min", "1 min 05 s"… */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  if (minutes === 0) return `${rest} s`;
  return rest === 0 ? `${minutes} min` : `${minutes} min ${String(rest).padStart(2, '0')} s`;
}
