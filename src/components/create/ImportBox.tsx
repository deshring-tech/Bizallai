"use client";

import { useState } from "react";

type Props = {
  pending: boolean;
  error: string | null;
  onImport: (url: string) => void;
  onSkip: () => void;
};

/**
 * The cold-start remover. Pasting one link beats answering ten questions, so
 * this is the first thing an owner sees — and the clip that sells the product.
 */
export function ImportBox({ pending, error, onImport, onSkip }: Props) {
  const [value, setValue] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const url = value.trim();
    if (url && !pending) onImport(url);
  }

  return (
    <div className="mx-auto w-full max-w-[520px] px-5 py-10">
      <h1 className="text-center text-2xl font-semibold sm:text-3xl">
        Your business page, in a minute
      </h1>
      <p className="mt-2 text-center text-[15px] text-[color:var(--color-muted)]">
        Paste your Instagram or existing website and we&apos;ll build it from what&apos;s already there.
      </p>

      <form onSubmit={submit} className="mt-6">
        <label htmlFor="import-url" className="sr-only">
          Your website or Instagram link
        </label>
        <input
          id="import-url"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          inputMode="url"
          autoComplete="url"
          placeholder="instagram.com/yourbusiness"
          className="w-full rounded-xl border border-[color:var(--color-hairline)] px-4 py-3.5 text-[15px] outline-none"
        />

        <button
          type="submit"
          disabled={pending || value.trim().length === 0}
          className="brand-bg mt-3 w-full rounded-xl px-4 py-3.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Reading your page…" : "Build my page"}
        </button>
      </form>

      {error ? (
        <p role="alert" className="mt-3 text-center text-[13px] text-red-600">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onSkip}
        disabled={pending}
        className="mt-4 w-full text-center text-[14px] text-[color:var(--color-muted)] underline underline-offset-2 disabled:opacity-50"
      >
        I&apos;ll just describe my business instead
      </button>
    </div>
  );
}
