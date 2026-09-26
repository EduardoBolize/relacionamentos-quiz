'use client';

import { formatBRL, parseBRLToCents } from '@relacionamentos/payments/client';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { apiFetch } from '@/lib/api-client';
import { FormFeedback } from './AdminUi';
import { useAdminAction } from './useAdminAction';

export interface EngineSettingsValue {
  primaryMinScore: number;
  secondaryMinScore: number;
  maxSecondary: number;
}

export interface PaymentSettingsValue {
  pixExpirationMinutes: number;
  boletoDueDays: number;
}

export interface PricingSettingsValue {
  comboDiscountPercent: number;
  comboMinItems: number;
  maxInstallments: number;
  minInstallmentCents: number;
}

export function EngineAndPaymentSettingsForm({ engine, payment }: { engine: EngineSettingsValue; payment: PaymentSettingsValue }) {
  const [engineValue, setEngineValue] = useState(engine);
  const [paymentValue, setPaymentValue] = useState(payment);
  const { run, busy, error, message } = useAdminAction();

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void run(() => apiFetch('/api/admin/settings', { method: 'PUT', body: { engine: engineValue, payment: paymentValue } }), {
      success: 'Configurações salvas.',
    });
  };

  const number = (value: string) => (value === '' ? 0 : Number(value));

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <fieldset className="grid gap-4 md:grid-cols-3">
        <legend className="mb-2 text-base font-semibold text-night-900">Motor de recomendação</legend>
        <TextField
          label="Mínimo para tema principal (0–100)"
          hint="Abaixo disso, o resultado mostra “nenhum tema se destacou”."
          type="number"
          min={0}
          max={100}
          value={engineValue.primaryMinScore}
          onChange={(e) => setEngineValue({ ...engineValue, primaryMinScore: number(e.target.value) })}
        />
        <TextField
          label="Mínimo para tema secundário (0–100)"
          type="number"
          min={0}
          max={100}
          value={engineValue.secondaryMinScore}
          onChange={(e) => setEngineValue({ ...engineValue, secondaryMinScore: number(e.target.value) })}
        />
        <TextField
          label="Máximo de temas secundários"
          type="number"
          min={0}
          max={5}
          value={engineValue.maxSecondary}
          onChange={(e) => setEngineValue({ ...engineValue, maxSecondary: number(e.target.value) })}
        />
      </fieldset>
      <fieldset className="grid gap-4 md:grid-cols-3">
        <legend className="mb-2 text-base font-semibold text-night-900">Pagamentos</legend>
        <TextField
          label="Validade do Pix (minutos)"
          type="number"
          min={5}
          max={1440}
          value={paymentValue.pixExpirationMinutes}
          onChange={(e) => setPaymentValue({ ...paymentValue, pixExpirationMinutes: number(e.target.value) })}
        />
        <TextField
          label="Vencimento do boleto (dias)"
          type="number"
          min={1}
          max={30}
          value={paymentValue.boletoDueDays}
          onChange={(e) => setPaymentValue({ ...paymentValue, boletoDueDays: number(e.target.value) })}
        />
      </fieldset>
      <FormFeedback error={error} message={message} />
      <Button type="submit" loading={busy}>
        Salvar configurações
      </Button>
    </form>
  );
}

export function PricingSettingsForm({ pricing }: { pricing: PricingSettingsValue }) {
  const [value, setValue] = useState(pricing);
  const [minInstallment, setMinInstallment] = useState(formatBRL(pricing.minInstallmentCents).replace('R$ ', ''));
  const [localError, setLocalError] = useState<string | null>(null);
  const { run, busy, error, message } = useAdminAction();

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const cents = parseBRLToCents(minInstallment);
    if (cents === null) {
      setLocalError('Informe um valor como 5,00.');
      return;
    }
    setLocalError(null);
    void run(() => apiFetch('/api/admin/settings', { method: 'PUT', body: { pricing: { ...value, minInstallmentCents: cents } } }), {
      success: 'Regras de preço salvas.',
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <TextField
          label="Desconto de combo (%)"
          hint="0 desativa."
          type="number"
          min={0}
          max={50}
          value={value.comboDiscountPercent}
          onChange={(e) => setValue({ ...value, comboDiscountPercent: Number(e.target.value) })}
        />
        <TextField
          label="A partir de (módulos)"
          type="number"
          min={2}
          max={10}
          value={value.comboMinItems}
          onChange={(e) => setValue({ ...value, comboMinItems: Number(e.target.value) })}
        />
        <TextField
          label="Parcelas sem juros (máx.)"
          type="number"
          min={1}
          max={12}
          value={value.maxInstallments}
          onChange={(e) => setValue({ ...value, maxInstallments: Number(e.target.value) })}
        />
        <TextField label="Parcela mínima (R$)" inputMode="decimal" value={minInstallment} onChange={(e) => setMinInstallment(e.target.value)} error={localError} />
      </div>
      <FormFeedback error={error} message={message} />
      <Button type="submit" loading={busy}>
        Salvar regras de preço
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const { run, busy, error, message } = useAdminAction();

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmation) {
      setLocalError('A confirmação não confere.');
      return;
    }
    setLocalError(null);
    void run(() => apiFetch('/api/admin/account/password', { method: 'PUT', body: { currentPassword, newPassword } }), {
      success: 'Senha alterada. As outras sessões abertas foram encerradas.',
    }).then(() => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
    });
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-3">
      <TextField label="Senha atual" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
      <TextField
        label="Nova senha"
        hint="Mínimo de 12 caracteres."
        type="password"
        autoComplete="new-password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        required
      />
      <TextField
        label="Confirmar nova senha"
        type="password"
        autoComplete="new-password"
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        error={localError}
        required
      />
      <div className="md:col-span-3 space-y-3">
        <FormFeedback error={error} message={message} />
        <Button type="submit" loading={busy}>
          Alterar senha
        </Button>
      </div>
    </form>
  );
}
