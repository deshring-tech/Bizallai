"use client";

import { useId } from "react";

const INPUT_CLASS =
  "w-full rounded-xl border border-[color:var(--color-hairline)] px-3.5 py-2.5 text-[15px] outline-none disabled:opacity-60";

type BaseProps = {
  label: string;
  hint?: string;
  error?: string;
};

/** Wraps a control with its label, hint and error, wired by a generated id. */
function Shell({
  id,
  label,
  hint,
  error,
  children,
}: BaseProps & { id: string; children: (describedBy: string | undefined) => React.ReactNode }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[13px] font-medium">
        {label}
      </label>

      {children(describedBy)}

      {hint && !error ? (
        <p id={hintId} className="mt-1 text-[12px] text-[color:var(--color-muted)]">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="mt-1 text-[12px] text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = BaseProps & {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "tel" | "email" | "url";
  maxLength?: number;
  inputMode?: "text" | "tel" | "email" | "url" | "numeric" | "decimal";
};

export function TextField({ value, onChange, label, hint, error, ...rest }: TextFieldProps) {
  const id = useId();

  return (
    <Shell id={id} label={label} hint={hint} error={error}>
      {(describedBy) => (
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={INPUT_CLASS}
          {...rest}
        />
      )}
    </Shell>
  );
}

type NumberFieldProps = BaseProps & {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
  prefix?: string;
};

export function NumberField({
  value,
  onChange,
  label,
  hint,
  error,
  prefix,
  ...rest
}: NumberFieldProps) {
  const id = useId();

  return (
    <Shell id={id} label={label} hint={hint} error={error}>
      {(describedBy) => (
        <div className="flex items-center gap-2">
          {prefix ? (
            <span className="text-[13px] text-[color:var(--color-muted)]">{prefix}</span>
          ) : null}
          <input
            id={id}
            type="number"
            inputMode="decimal"
            value={Number.isFinite(value) ? value : 0}
            // An empty or half-typed field must not become NaN in the profile.
            onChange={(event) => onChange(Number(event.target.value) || 0)}
            aria-describedby={describedBy}
            className={INPUT_CLASS}
            {...rest}
          />
        </div>
      )}
    </Shell>
  );
}

type TextAreaProps = BaseProps & {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
};

export function TextArea({
  value,
  onChange,
  label,
  hint,
  error,
  rows = 3,
  ...rest
}: TextAreaProps) {
  const id = useId();

  return (
    <Shell id={id} label={label} hint={hint} error={error}>
      {(describedBy) => (
        <textarea
          id={id}
          value={value}
          rows={rows}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={describedBy}
          className={`${INPUT_CLASS} resize-y`}
          {...rest}
        />
      )}
    </Shell>
  );
}

type SelectFieldProps<T extends string> = BaseProps & {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
};

export function SelectField<T extends string>({
  value,
  onChange,
  options,
  label,
  hint,
  error,
}: SelectFieldProps<T>) {
  const id = useId();

  return (
    <Shell id={id} label={label} hint={hint} error={error}>
      {(describedBy) => (
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
          aria-describedby={describedBy}
          className={INPUT_CLASS}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </Shell>
  );
}

/** A titled group of related fields. */
export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-4">
      <h2 className="font-medium">{title}</h2>
      {description ? (
        <p className="mt-0.5 text-[13px] text-[color:var(--color-muted)]">{description}</p>
      ) : null}
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}
