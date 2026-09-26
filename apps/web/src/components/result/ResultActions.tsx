'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Feedback';
import { CheckboxField, TextField } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { ApiError, apiFetch } from '@/lib/api-client';

/**
 * Cria um link de compartilhamento SOMENTE LEITURA e copia para a área de transferência.
 * (O endereço desta página é o link pessoal do dono e não deve ser compartilhado.)
 */
export function ShareLinkButton({ token }: { token: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'copied'>('idle');
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const share = async () => {
    setState('busy');
    setError(null);
    try {
      const { sharePath } = await apiFetch<{ sharePath: string }>(`/api/results/${token}/share`, { body: {} });
      const url = new URL(sharePath, window.location.origin).toString();
      setLink(url);
      await navigator.clipboard.writeText(url).catch(() => undefined);
      setState('copied');
    } catch (err) {
      setState('idle');
      setError(err instanceof ApiError ? err.message : 'Não foi possível criar o link.');
    }
  };

  return (
    <div className="space-y-2">
      <Button variant="secondary" size="sm" loading={state === 'busy'} onClick={share}>
        <Icon name={state === 'copied' ? 'check' : 'copy'} className="h-4 w-4" />
        {state === 'copied' ? 'Link copiado!' : 'Compartilhar (somente leitura)'}
      </Button>
      {link ? (
        <p className="text-xs break-all text-slate-600">
          Quem receber este link poderá ver o resultado, mas não excluí-lo nem alterá-lo: <span className="font-mono">{link}</span>
        </p>
      ) : null}
      {error ? <p className="text-xs text-red-700" role="alert">{error}</p> : null}
    </div>
  );
}

/** Tira o resultado deste navegador (útil em aparelhos compartilhados). O link pessoal continua valendo. */
export function ForgetBrowserButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      loading={busy}
      onClick={async () => {
        if (!window.confirm('Remover o acesso a este resultado neste navegador? Você ainda poderá abri-lo pelo seu link pessoal ou pelo e-mail.')) return;
        setBusy(true);
        await apiFetch('/api/quiz/session/forget', { body: {} }).catch(() => undefined);
        router.replace('/');
      }}
    >
      <Icon name="logout" className="h-4 w-4" /> Remover deste navegador
    </Button>
  );
}

/**
 * Saída rápida: remove o acesso neste navegador e troca a página por um site neutro,
 * substituindo o histórico (o botão "voltar" não retorna para cá).
 */
export function QuickExitButton() {
  const leave = () => {
    void fetch('/api/quiz/session/forget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      credentials: 'same-origin',
      keepalive: true,
    }).catch(() => undefined);
    window.location.replace('https://www.google.com.br/');
  };
  return (
    <button
      type="button"
      onClick={leave}
      className="fixed top-20 right-3 z-50 inline-flex min-h-11 items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-night-950 shadow-lg hover:bg-amber-400"
    >
      <Icon name="x" className="h-4 w-4" /> Sair rápido
    </button>
  );
}

export function EmailResultForm({ token, hasEmail }: { token: string; hasEmail: boolean }) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!consent) return setError('Marque a autorização para enviarmos o e-mail.');
    setStatus('sending');
    setError(null);
    try {
      await apiFetch(`/api/results/${token}/email`, { body: { email, consent: true } });
      setStatus('sent');
    } catch (err) {
      setStatus('idle');
      setError(err instanceof ApiError ? (err.details?.email?.[0] ?? err.message) : 'Não foi possível enviar.');
    }
  };

  if (status === 'sent') {
    return (
      <Alert tone="success" title="Enviado!">
        Mandamos o link do resultado para o seu e-mail. Com ele você também poderá usar a página “Recuperar meu resultado”.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      {hasEmail ? <p className="text-sm text-slate-600">Você já cadastrou um e-mail para este resultado. Pode enviar para outro, se quiser.</p> : null}
      <TextField
        label="Seu e-mail"
        type="email"
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={error}
        required
      />
      <CheckboxField
        label="Autorizo o envio do link do resultado para este e-mail e o uso dele para recuperar meu resultado."
        hint="Usamos o e-mail só para isso. Você pode excluir seus dados a qualquer momento."
        checked={consent}
        onChange={(event) => setConsent(event.target.checked)}
      />
      <Button type="submit" loading={status === 'sending'}>
        <Icon name="mail" className="h-4 w-4" /> Enviar link por e-mail
      </Button>
    </form>
  );
}

export function DeleteResultButton({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button
        variant="danger"
        size="sm"
        loading={busy}
        onClick={async () => {
          if (!window.confirm('Excluir definitivamente suas respostas e este resultado? Esta ação não pode ser desfeita.')) return;
          setBusy(true);
          try {
            await apiFetch(`/api/results/${token}`, { method: 'DELETE' });
            router.replace('/?resultado=excluido');
          } catch (err) {
            setBusy(false);
            setError(err instanceof ApiError ? err.message : 'Não foi possível excluir.');
          }
        }}
      >
        <Icon name="trash" className="h-4 w-4" /> Excluir meus dados
      </Button>
      {error ? <p className="mt-2 text-sm text-red-700" role="alert">{error}</p> : null}
    </div>
  );
}
