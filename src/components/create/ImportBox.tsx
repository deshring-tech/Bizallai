"use client";

import { useState } from "react";

type Props = {
  pending: boolean;
  error: string | null;
  onImport: (url: string) => void;
  onSkip: () => void;
};

/**
 * The cold-start remover: pasting one link beats answering ten questions.
 * It asks for the owner's own website because social networks block automated
 * reading — the describe-it path is presented as an equal option, not a fallback,
 * since many owners have no website at all.
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
        Paste your website and we&apos;ll build your page from what&apos;s already there.
      </p>

      <form onSubmit={submit} className="mt-6">
        <label htmlFor="import-url" className="sr-only">
          Your website address
        </label>
        <input
          id="import-url"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          inputMode="url"
          autoComplete="url"
          placeholder="yourbusiness.com"
          className="w-full rounded-xl border border-[color:var(--color-hairline)] px-4 py-3.5 text-[15px] outline-none"
        />

        <button
          type="submit"
          disabled={pending || value.trim().length === 0}
          className="brand-bg mt-3 w-full rounded-xl px-4 py-3.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Reading your website…" : "Build my page"}
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
        No website? Describe your business instead
      </button>
    </div>
  );
}
