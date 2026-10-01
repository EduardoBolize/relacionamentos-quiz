import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { isSafeExternalUrl } from '@/lib/links';
import { formatDuration, parseVideoUrl } from '@/lib/video';
import { proxy } from '@/proxy';
import { ORIGIN } from './helpers';

describe('links das aulas em vídeo', () => {
  it('converte links do YouTube para o player sem cookies', () => {
    const embed = { kind: 'iframe', provider: 'youtube', src: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0' };
    for (const url of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtube.com/watch?v=dQw4w9WgXcQ&t=10s',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    ]) {
      expect(parseVideoUrl(url), url).toEqual(embed);
    }
  });

  it('aceita Vimeo (inclusive não listado), Panda Video e arquivos .mp4', () => {
    expect(parseVideoUrl('https://vimeo.com/123456789')).toEqual({ kind: 'iframe', provider: 'vimeo', src: 'https://player.vimeo.com/video/123456789' });
    expect(parseVideoUrl('https://vimeo.com/123456789/abcdef1234')).toEqual({
      kind: 'iframe',
      provider: 'vimeo',
      src: 'https://player.vimeo.com/video/123456789?h=abcdef1234',
    });
    expect(parseVideoUrl('https://player.vimeo.com/video/123456789?h=abcdef1234&badge=0')?.kind).toBe('iframe');
    expect(
      parseVideoUrl('https://player-vz-1a2b3c4d-5e6.tv.pandavideo.com.br/embed/?v=0b1c2d3e-4f50-6172-8394-a5b6c7d8e9f0'),
    ).toEqual({
      kind: 'iframe',
      provider: 'panda',
      src: 'https://player-vz-1a2b3c4d-5e6.tv.pandavideo.com.br/embed/?v=0b1c2d3e-4f50-6172-8394-a5b6c7d8e9f0',
    });
    expect(parseVideoUrl('https://cdn.exemplo.com.br/aulas/aula-1.mp4')).toEqual({ kind: 'file', src: 'https://cdn.exemplo.com.br/aulas/aula-1.mp4' });
    expect(parseVideoUrl('/videos/modulo-1/aula-1.mp4')).toEqual({ kind: 'file', src: '/videos/modulo-1/aula-1.mp4' });
  });

  it('recusa qualquer outro formato (páginas arbitrárias, http, scripts, caminhos fora de /videos)', () => {
    for (const url of [
      '',
      null,
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'http://youtu.be/dQw4w9WgXcQ',
      'https://youtu.be/curto',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ"><script>',
      'https://evil.example/watch?v=dQw4w9WgXcQ',
      'https://vimeo.com/abc',
      'https://player-vz-x.evil.example/embed/?v=0b1c2d3e-4f50-6172-8394-a5b6c7d8e9f0',
      'https://usuario:senha@cdn.exemplo.com/aula.mp4',
      '/videos/../.env.mp4',
      '/admin/aula.mp4',
      '//evil.example/aula.mp4',
    ]) {
      expect(parseVideoUrl(url), String(url)).toBeNull();
    }
  });

  it('links de checkout externo só com https e sem credenciais', () => {
    expect(isSafeExternalUrl('https://pay.kiwify.com.br/abc123')).toBe(true);
    expect(isSafeExternalUrl('http://pay.kiwify.com.br/abc123')).toBe(false);
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeExternalUrl('https://a:b@pay.kiwify.com.br/abc')).toBe(false);
    expect(isSafeExternalUrl('https://localhost/abc')).toBe(false);
  });

  it('formata a duração das aulas', () => {
    expect(formatDuration(60)).toBe('1 min');
    expect(formatDuration(65)).toBe('1 min 05 s');
    expect(formatDuration(45)).toBe('45 s');
    expect(formatDuration(185)).toBe('3 min 05 s');
  });
});

describe('Content-Security-Policy das páginas', () => {
  it('libera apenas os players de vídeo aceitos e mantém os bloqueios', () => {
    const response = proxy(new NextRequest(`${ORIGIN}/modulos/comece-por-voce`));
    const csp = response.headers.get('content-security-policy') ?? '';
    expect(csp).toContain('frame-src https://www.youtube-nocookie.com https://player.vimeo.com https://*.tv.pandavideo.com.br');
    expect(csp).toContain("media-src 'self' https:");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  });
});
