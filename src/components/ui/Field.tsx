import { useEffect, useId, useState, type ReactNode } from 'react';
import { parseDecimal } from '../../lib/format';
import { cx } from '../../lib/misc';

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  children: (id: string) => ReactNode;
  className?: string;
}

/** Libellé + contrôle + aide. `children` reçoit l'id à poser sur le contrôle. */
export function Field({ label, hint, children, className }: FieldProps) {
  const id = useId();
  return (
    <div className={cx('field', className)}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {children(id)}
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

interface NumberInputProps {
  id?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  suffix?: string;
  className?: string;
  min?: number;
  max?: number;
  decimals?: boolean;
  autoFocus?: boolean;
  ariaLabel?: string;
  /** false : le champ ne peut pas rester vide (la dernière valeur est rétablie en quittant le champ). */
  allowEmpty?: boolean;
}

/**
 * Champ numérique tolérant la virgule française. Garde le texte saisi tel quel
 * pendant la frappe et ne remonte que des nombres valides (ou null si vide).
 * Les bornes min/max sont appliquées en quittant le champ, pour ne pas bloquer
 * la frappe (ex. taper « 79 » dans un champ dont le minimum est 20).
 */
export function NumberInput({
  id,
  value,
  onChange,
  placeholder,
  suffix,
  className,
  min,
  max,
  decimals = true,
  autoFocus,
  ariaLabel,
  allowEmpty = true,
}: NumberInputProps) {
  const [text, setText] = useState(value === null ? '' : String(value).replace('.', ','));

  useEffect(() => {
    const parsed = parseDecimal(text);
    if (parsed !== value) setText(value === null ? '' : String(value).replace('.', ','));
    // On ne resynchronise que lorsque la valeur change de l'extérieur.
  }, [value]);

  const commit = (raw: string, final: boolean) => {
    if (raw.trim() === '') {
      if (allowEmpty) return onChange(null);
      if (final) setText(value === null ? '' : String(value).replace('.', ','));
      return;
    }
    const parsed = parseDecimal(raw);
    if (parsed === null) {
      if (final) setText(value === null ? '' : String(value).replace('.', ','));
      return;
    }
    const n = decimals ? parsed : Math.round(parsed);
    const clamped = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
    if (!final) {
      if (clamped === n) onChange(n);
      return;
    }
    onChange(clamped);
    setText(String(clamped).replace('.', ','));
  };

  const input = (
    <input
      id={id}
      className={cx('input', className)}
      inputMode={decimals ? 'decimal' : 'numeric'}
      autoComplete="off"
      placeholder={placeholder}
      value={text}
      aria-label={ariaLabel}
      data-autofocus={autoFocus ? '' : undefined}
      onChange={(e) => {
        setText(e.target.value);
        commit(e.target.value, false);
      }}
      onBlur={(e) => commit(e.target.value, true)}
    />
  );

  if (!suffix) return input;
  return (
    <div className="input-wrap">
      {input}
      <span className="input-suffix">{suffix}</span>
    </div>
  );
}
