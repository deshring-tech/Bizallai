"use client";

import { useCallback, useMemo, useState } from "react";
import { BusinessPageView } from "@/components/page/BusinessPageView";
import { ChatPanel } from "@/components/create/ChatPanel";
import { ImportBox } from "@/components/create/ImportBox";
import { PublishPanel } from "@/components/create/PublishPanel";
import { ApiError, apiRequest } from "@/lib/api-client";
import type { ConversationTurn } from "@/lib/ai/onboarding";
import type { Business, BusinessProfile, Theme } from "@/lib/domain/business";

type Phase = "import" | "chat";

type OnboardingResponse = {
  reply: string;
  profile: BusinessProfile;
  theme: Theme;
  ready: boolean;
};

type ImportResponse = {
  profile: BusinessProfile;
  theme: Theme;
  confidence: "high" | "medium" | "low";
  sourceUrl: string;
};

type CreateResponse = { business: Business };

type PublishedPage = { id: string; slug: string; needsClaim: boolean };

const OPENING_LINE =
  "Tell me about your business — what you do and where you are. I'll build the page as we talk.";

/**
 * Orchestrates the whole setup: import, interview, live preview, publish.
 *
 * The transcript and the accumulated profile live here rather than on the
 * server, which keeps the API stateless and means a dropped request costs one
 * turn instead of the session.
 */
export function CreateFlow({ siteOrigin }: { siteOrigin: string }) {
  const [phase, setPhase] = useState<Phase>("import");
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [importedContext, setImportedContext] = useState<string | undefined>();
  const [ready, setReady] = useState(false);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<PublishedPage | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const previewBusiness = useMemo<Business | null>(
    () => (profile ? toPreviewBusiness(profile, theme) : null),
    [profile, theme],
  );

  const sendTurn = useCallback(
    async (message: string, nextTurns: ConversationTurn[], seedContext?: string) => {
      setPending(true);
      setError(null);

      try {
        const result = await apiRequest<OnboardingResponse>("/api/onboarding", {
          method: "POST",
          body: {
            turns: nextTurns,
            known: profile ?? undefined,
            importedContext: seedContext ?? importedContext,
          },
        });

        setTurns([...nextTurns, { role: "assistant", content: result.reply }]);
        setProfile(result.profile);
        setTheme(result.theme);
        setReady(result.ready);
      } catch (cause) {
        setError(cause instanceof ApiError ? cause.message : "Something went wrong.");
        // The user's own turn stays on screen so their typing is never lost.
        setTurns(nextTurns);
      } finally {
        setPending(false);
      }
      void message;
    },
    [importedContext, profile],
  );

  const handleSend = useCallback(
    (message: string) => {
      const nextTurns: ConversationTurn[] = [...turns, { role: "user", content: message }];
      setTurns(nextTurns);
      void sendTurn(message, nextTurns);
    },
    [sendTurn, turns],
  );

  const handleImport = useCallback(async (url: string) => {
    setPending(true);
    setError(null);

    try {
      const result = await apiRequest<ImportResponse>("/api/import", {
        method: "POST",
        body: { url },
      });

      setProfile(result.profile);
      setTheme(result.theme);
      setImportedContext(`Imported from ${result.sourceUrl}`);
      setPhase("chat");

      const found = describeImport(result);
      setTurns([{ role: "assistant", content: found }]);
      setReady(result.confidence !== "low");
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "We could not read that link. Try describing your business instead.",
      );
    } finally {
      setPending(false);
    }
  }, []);

  const handleSkipImport = useCallback(() => {
    setPhase("chat");
    setTurns([{ role: "assistant", content: OPENING_LINE }]);
  }, []);

  const handlePublish = useCallback(async () => {
    if (!profile) return;

    setPublishing(true);
    setPublishError(null);

    try {
      const { business } = await apiRequest<CreateResponse>("/api/pages", {
        method: "POST",
        body: { profile, theme: theme ?? undefined },
      });

      await apiRequest(`/api/pages/${business.id}`, {
        method: "PATCH",
        body: { intent: "publish" },
      });

      // A signed-in owner already owns the page; an anonymous one must claim it.
      setPublished({
        id: business.id,
        slug: business.slug,
        needsClaim: business.ownerId === null,
      });
    } catch (cause) {
      setPublishError(
        cause instanceof ApiError ? cause.message : "Could not publish. Please try again.",
      );
    } finally {
      setPublishing(false);
    }
  }, [profile, theme]);

  if (phase === "import") {
    return (
      <ImportBox
        pending={pending}
        error={error}
        onImport={(url) => void handleImport(url)}
        onSkip={handleSkipImport}
      />
    );
  }

  return (
    <div className="mx-auto grid min-h-dvh w-full max-w-[1120px] gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      <section className="order-2 lg:order-1">
        <h2 className="sr-only">Live preview of your page</h2>
        {previewBusiness ? (
          <div className="card overflow-hidden">
            {/* A preview should be looked at, not submitted through. */}
            <div className="pointer-events-none select-none" aria-hidden="true">
              <BusinessPageView business={previewBusiness} hideFooter />
            </div>
          </div>
        ) : (
          <div className="card grid min-h-[400px] place-items-center p-8 text-center text-[14px] text-[color:var(--color-muted)]">
            Your page will appear here as you answer.
          </div>
        )}
      </section>

      <aside className="order-1 flex flex-col lg:order-2 lg:sticky lg:top-6 lg:h-[calc(100dvh-3rem)]">
        <div className="flex-1 overflow-hidden">
          <ChatPanel turns={turns} pending={pending} error={error} onSend={handleSend} />
        </div>

        <div className="mt-4">
          <PublishPanel
            ready={ready && profile !== null}
            publishing={publishing}
            publishedUrl={published ? `${siteOrigin}/${published.slug}` : null}
            claimHref={published?.needsClaim ? `/claim/${published.id}` : null}
            error={publishError}
            onPublish={() => void handlePublish()}
          />
        </div>
      </aside>
    </div>
  );
}

/** A preview needs the same shape as a saved page, without touching the database. */
function toPreviewBusiness(profile: BusinessProfile, theme: Theme | null): Business {
  const now = new Date().toISOString();
  return {
    id: "00000000-0000-0000-0000-000000000000",
    ownerId: null,
    slug: "preview",
    status: "draft",
    profile,
    theme: theme ?? { brand: "#1d9e75", mode: "light" },
    createdAt: now,
    updatedAt: now,
  };
}

function describeImport(result: ImportResponse): string {
  if (result.confidence === "low") {
    return "I couldn't get much from that link. Tell me about your business and I'll build the page from there.";
  }

  const found: string[] = [];
  if (result.profile.photos.length > 0) found.push(`${result.profile.photos.length} photos`);
  if (result.profile.plans.length > 0) found.push(`${result.profile.plans.length} prices`);
  if (result.profile.contact.phone || result.profile.contact.whatsapp) found.push("your number");

  const summary = found.length > 0 ? `I found ${found.join(", ")}.` : "I've made a start.";
  return `${summary} Have a look on the left — what should I fix or add?`;
}
