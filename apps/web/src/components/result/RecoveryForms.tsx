'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Feedback';
import { TextField } from '@/components/ui/Field';
import { ApiError, apiFetch } from '@/lib/api-client';
import { formatDateTime } from '@/lib/format';

export function RecoveryRequestForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await apiFetch<{ message: string }>('/api/results/recover', { body: { email } });
      setMessage(response.message);
    } catch (err) {
      setError(err instanceof ApiError ? (err.details?.email?.[0] ?? err.message) : 'Não foi possível enviar.');
    } finally {
      setBusy(false);
    }
  };

  if (message) {
    return (
      <Alert tone="success" title="Pedido recebido">
        {message} O link vale por 30 minutos e só pode ser usado uma vez. Confira também a caixa de spam.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <TextField
        label="E-mail informado no resultado"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={error}
        required
      />
      <Button type="submit" loading={busy}>
        Enviar link de acesso
      </Button>
    </form>
  );
}

interface RecoveredResult {
  resultPath: string;
  completedAt: string;
  primaryCategoryName: string | null;
}

/** Confirmação explícita (botão) do link mágico — evita que leitores de e-mail consumam o link. */
export function RecoveryConfirm({ token }: { token: string }) {
  const [results, setResults] = useState<RecoveredResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await apiFetch<{ results: RecoveredResult[] }>('/api/results/recover/confirm', { body: { token } });
      if (response.results.length === 1) {
        window.location.assign(response.results[0]!.resultPath);
        return;
      }
      setResults(response.results);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível validar o link.');
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-4">
        <Alert tone="error">{error}</Alert>
        <Link href="/recuperar" className="font-medium text-brand-700 underline">
          Pedir um novo link
        </Link>
      </div>
    );
  }

  if (results) {
    return results.length === 0 ? (
      <Alert tone="info">Não encontramos resultados para este e-mail. Eles podem ter sido excluídos.</Alert>
    ) : (
      <ul className="space-y-3">
        {results.map((result) => (
          <li key={result.resultPath}>
            <a href={result.resultPath} className="block rounded-xl border border-slate-200 p-4 hover:border-brand-300 hover:bg-brand-50">
              <span className="block font-semibold text-slate-900">Resultado de {formatDateTime(result.completedAt)}</span>
              <span className="text-sm text-slate-600">
                {result.primaryCategoryName ? `Tema em destaque: ${result.primaryCategoryName}` : 'Nenhum tema em destaque'}
              </span>
            </a>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Button size="lg" loading={busy} onClick={confirm}>
      Ver meus resultados
    </Button>
  );
}
