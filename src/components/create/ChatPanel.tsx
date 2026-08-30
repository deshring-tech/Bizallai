"use client";

import { useEffect, useRef } from "react";
import type { ConversationTurn } from "@/lib/ai/onboarding";

type Props = {
  turns: readonly ConversationTurn[];
  pending: boolean;
  error: string | null;
  onSend: (message: string) => void;
};

export function ChatPanel({ turns, pending, error, onSend }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, pending]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = inputRef.current;
    const value = input?.value.trim();
    if (!value || pending) return;

    onSend(value);
    if (input) input.value = "";
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto px-1 py-2">
        {turns.map((turn, index) => (
          <Bubble key={index} role={turn.role}>
            {turn.content}
          </Bubble>
        ))}

        {pending ? (
          <Bubble role="assistant">
            <span className="inline-flex gap-1" aria-label="Thinking">
              <Dot delay="0ms" />
              <Dot delay="150ms" />
              <Dot delay="300ms" />
            </span>
          </Bubble>
        ) : null}

        {error ? (
          <p role="alert" className="px-1 text-[13px] text-red-600">
            {error}
          </p>
        ) : null}

        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="mt-2 flex items-end gap-2">
        <textarea
          ref={inputRef}
          rows={1}
          maxLength={1_000}
          placeholder="Type your answer…"
          aria-label="Your reply"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          className="max-h-32 min-h-[46px] flex-1 resize-none rounded-xl border border-[color:var(--color-hairline)] px-3.5 py-3 text-[15px] outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="brand-bg h-[46px] rounded-xl px-4 text-sm font-medium disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap ${
          isUser ? "brand-bg" : "bg-[color:var(--color-raised)]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-[color:var(--color-muted)]"
      style={{ animationDelay: delay }}
    />
  );
}
