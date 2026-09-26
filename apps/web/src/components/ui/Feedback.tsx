import type { ReactNode } from 'react';
import { Icon } from './Icon';

type Tone = 'info' | 'success' | 'warning' | 'error';

const tones: Record<Tone, { box: string; icon: 'info' | 'check' | 'alert' }> = {
  info: { box: 'border-sky-200 bg-sky-50 text-sky-900', icon: 'info' },
  success: { box: 'border-green-200 bg-green-50 text-green-900', icon: 'check' },
  warning: { box: 'border-amber-200 bg-amber-50 text-amber-900', icon: 'alert' },
  error: { box: 'border-red-200 bg-red-50 text-red-900', icon: 'alert' },
};

export function Alert({ tone = 'info', title, children, className = '' }: { tone?: Tone; title?: ReactNode; children?: ReactNode; className?: string }) {
  const style = tones[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex gap-3 rounded-xl border p-4 ${style.box} ${className}`}>
      <Icon name={style.icon} className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="text-sm leading-relaxed">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children}
      </div>
    </div>
  );
}

export function Badge({ children, className = 'bg-brand-100 text-brand-800' }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>{children}</span>;
}

/** Barra de progresso acessível. */
export function ProgressBar({
  value,
  label,
  valueText,
  className = '',
  barClassName = 'bg-brand-500',
  trackClassName = 'bg-slate-200',
  barColor,
}: {
  value: number;
  label: string;
  valueText?: string;
  className?: string;
  barClassName?: string;
  trackClassName?: string;
  /** Cor personalizada (ex.: cor da categoria). */
  barColor?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-valuetext={valueText ?? `${Math.round(clamped)}%`}
      className={`h-2 w-full overflow-hidden rounded-full ${trackClassName} ${className}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${barClassName}`}
        style={{ width: `${clamped}%`, ...(barColor ? { backgroundColor: barColor } : {}) }}
      />
    </div>
  );
}
