'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Feedback';
import { CheckboxField, TextField } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { ApiError, apiFetch } from '@/lib/api-client';

export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
      }}
    >
      <Icon name={copied ? 'check' : 'copy'} className="h-4 w-4" />
      {copied ? 'Link copiado!' : 'Copiar link do resultado'}
    </Button>
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
