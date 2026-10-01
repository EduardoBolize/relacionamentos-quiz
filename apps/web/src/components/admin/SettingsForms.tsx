'use client';

import { formatBRL, parseBRLToCents } from '@relacionamentos/payments/client';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { TextAreaField, TextField } from '@/components/ui/Field';
import { apiFetch } from '@/lib/api-client';
import { isSafeExternalUrl } from '@/lib/links';
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

export interface CourseSettingsValue {
  guaranteeDays: number;
  fullCourseCheckoutUrl: string | null;
}

/** Garantia anunciada e link de checkout externo do curso completo (ex.: Kiwify). */
export function CourseSettingsForm({ course }: { course: CourseSettingsValue }) {
  const [guaranteeDays, setGuaranteeDays] = useState(course.guaranteeDays);
  const [checkoutUrl, setCheckoutUrl] = useState(course.fullCourseCheckoutUrl ?? '');
  const { run, busy, error, message } = useAdminAction();
  const urlError = checkoutUrl.trim() && !isSafeExternalUrl(checkoutUrl.trim()) ? 'Use um endereço completo começando com https://' : null;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void run(
      () =>
        apiFetch('/api/admin/settings', {
          method: 'PUT',
          body: { course: { guaranteeDays, fullCourseCheckoutUrl: checkoutUrl.trim() || null } },
        }),
      { success: 'Oferta do curso salva.' },
    );
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-[200px_1fr]">
        <TextField
          label="Garantia (dias)"
          hint="Aparece nas respostas às dúvidas como {garantia_dias}. 0 esconde a garantia."
          type="number"
          min={0}
          max={90}
          value={guaranteeDays}
          onChange={(e) => setGuaranteeDays(Number(e.target.value))}
        />
        <TextField
          label="Checkout externo do curso completo (opcional)"
          hint="Ex.: o link de pagamento do curso completo na Kiwify. Vazio = checkout do site com todos os módulos."
          placeholder="https://pay.kiwify.com.br/..."
          inputMode="url"
          value={checkoutUrl}
          onChange={(e) => setCheckoutUrl(e.target.value)}
          error={urlError}
        />
      </div>
      <FormFeedback error={error} message={message} />
      <Button type="submit" loading={busy}>
        Salvar oferta
      </Button>
    </form>
  );
}

export interface ObjectionValue {
  flag: string;
  title: string;
  answer: string;
}

/**
 * Respostas às dúvidas (objeções). Cada uma aparece no resultado quando uma regra do quiz adiciona o
 * sinalizador correspondente, e todas aparecem na seção de dúvidas da página inicial.
 */
export function ObjectionsForm({ objections }: { objections: ObjectionValue[] }) {
  const [items, setItems] = useState(objections);
  const { run, busy, error, message } = useAdminAction();
  const update = (index: number, patch: Partial<ObjectionValue>) =>
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void run(() => apiFetch('/api/admin/settings', { method: 'PUT', body: { objections: items } }), {
      success: 'Respostas às dúvidas salvas.',
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-slate-600">
        Marcadores trocados pelos valores atuais: <code>{'{preco_modulo}'}</code>, <code>{'{preco_curso}'}</code>,{' '}
        <code>{'{parcelas}'}</code>, <code>{'{modulos}'}</code> e <code>{'{garantia_dias}'}</code>. Para exibir uma resposta no
        resultado, crie uma regra (Admin → Regras) com o efeito “Adicionar sinalizador” usando o mesmo sinalizador.
      </p>
      <ol className="space-y-4">
        {items.map((item, index) => (
          <li key={index} className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-[220px_1fr]">
            <TextField label="Sinalizador" hint="Ex.: objecao_preco" value={item.flag} onChange={(e) => update(index, { flag: e.target.value })} required />
            <TextField label="Dúvida (título)" value={item.title} onChange={(e) => update(index, { title: e.target.value })} required />
            <TextAreaField
              className="md:col-span-2"
              label="Resposta"
              rows={3}
              value={item.answer}
              onChange={(e) => update(index, { answer: e.target.value })}
              required
            />
            <div className="md:col-span-2">
              <button
                type="button"
                className="text-sm font-medium text-red-700 hover:underline"
                onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
              >
                Remover esta resposta
              </button>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={() => setItems((current) => [...current, { flag: '', title: '', answer: '' }])}>
          + Nova resposta
        </Button>
        <Button type="submit" loading={busy}>
          Salvar respostas
        </Button>
      </div>
      <FormFeedback error={error} message={message} />
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
