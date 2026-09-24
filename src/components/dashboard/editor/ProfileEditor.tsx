"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PlansEditor } from "@/components/dashboard/editor/PlansEditor";
import { ReviewsEditor } from "@/components/dashboard/editor/ReviewsEditor";
import { BusinessPageView } from "@/components/page/BusinessPageView";
import { PhotosEditor } from "@/components/photos/PhotosEditor";
import { SelectField, Section, TextArea, TextField } from "@/components/ui/Field";
import { ApiError, apiRequest } from "@/lib/api-client";
import { deletePhoto, uploadPhoto } from "@/lib/storage";
import {
  BUSINESS_CATEGORIES,
  CATEGORY_LABELS,
  isPublishable,
  type Business,
  type BusinessCategory,
  type BusinessProfile,
  type Theme,
} from "@/lib/domain/business";

/** Currencies for the markets this product actually serves, plus a fallback. */
const CURRENCIES = ["NPR", "INR", "AED", "SAR", "QAR", "USD", "GBP", "EUR"] as const;

const CATEGORY_OPTIONS = BUSINESS_CATEGORIES.map((value) => ({
  value,
  label: CATEGORY_LABELS[value],
}));

const CURRENCY_OPTIONS = CURRENCIES.map((value) => ({ value, label: value }));

type SaveState = "clean" | "dirty" | "saving" | "saved";

/**
 * The correction surface. The AI gets a page 90% right in a minute; this is
 * where the owner fixes the last 10% — and it is the only place a page's
 * content can be changed after publishing.
 */
export function ProfileEditor({ business, userId }: { business: Business; userId: string }) {
  const [profile, setProfile] = useState<BusinessProfile>(business.profile);
  const [theme, setTheme] = useState<Theme>(business.theme);
  const [state, setState] = useState<SaveState>("clean");
  const [error, setError] = useState<string | null>(null);

  const patch = useCallback((changes: Partial<BusinessProfile>) => {
    setProfile((current) => ({ ...current, ...changes }));
    setState("dirty");
  }, []);

  const patchContact = useCallback(
    (changes: Partial<BusinessProfile["contact"]>) => {
      setProfile((current) => ({ ...current, contact: { ...current.contact, ...changes } }));
      setState("dirty");
    },
    [],
  );

  const preview = useMemo<Business>(
    () => ({ ...business, profile, theme }),
    [business, profile, theme],
  );

  const canPublish = isPublishable(profile);

  // A published page is live traffic; losing an edit to a stray tab close is
  // worse than the small friction of a confirmation prompt.
  useEffect(() => {
    if (state !== "dirty") return;

    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [state]);

  const save = useCallback(async () => {
    setState("saving");
    setError(null);

    try {
      await apiRequest(`/api/pages/${business.id}`, {
        method: "PATCH",
        body: { intent: "save", profile, theme },
      });
      setState("saved");
    } catch (cause) {
      setState("dirty");
      setError(cause instanceof ApiError ? cause.message : "Could not save your changes.");
    }
  }, [business.id, profile, theme]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      <form
        className="order-2 space-y-4 lg:order-1"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <Section title="Basics" description="What the page says at the top.">
          <TextField
            label="Business name"
            value={profile.name}
            onChange={(name) => patch({ name })}
            maxLength={80}
          />

          <TextField
            label="Tagline"
            hint="One short line on what you offer."
            value={profile.tagline}
            onChange={(tagline) => patch({ tagline })}
            maxLength={120}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField<BusinessCategory>
              label="Business type"
              value={profile.category}
              onChange={(category) => patch({ category })}
              options={CATEGORY_OPTIONS}
            />

            <SelectField
              label="Currency"
              value={profile.currency}
              onChange={(currency) => patch({ currency })}
              options={
                CURRENCY_OPTIONS.some((option) => option.value === profile.currency)
                  ? CURRENCY_OPTIONS
                  : [...CURRENCY_OPTIONS, { value: profile.currency, label: profile.currency }]
              }
            />
          </div>

          <TextArea
            label="About"
            hint="Two or three sentences. Optional."
            value={profile.about ?? ""}
            onChange={(about) => patch({ about: about || undefined })}
            maxLength={600}
          />

          <TextField
            label="Button text"
            hint="What the main button on your page says."
            value={profile.primaryActionLabel}
            onChange={(primaryActionLabel) => patch({ primaryActionLabel })}
            maxLength={32}
          />

          <div>
            <label htmlFor="brand-colour" className="mb-1 block text-[13px] font-medium">
              Brand colour
            </label>
            <input
              id="brand-colour"
              type="color"
              value={theme.brand}
              onChange={(event) => {
                setTheme({ ...theme, brand: event.target.value });
                setState("dirty");
              }}
              className="h-10 w-20 cursor-pointer rounded-lg border border-[color:var(--color-hairline)]"
            />
          </div>
        </Section>

        <Section title="How customers reach you" description="At least one of these is required.">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="WhatsApp number"
              hint="With country code, e.g. +9779800000000"
              type="tel"
              inputMode="tel"
              value={profile.contact.whatsapp ?? ""}
              onChange={(whatsapp) => patchContact({ whatsapp: whatsapp || undefined })}
              maxLength={32}
            />

            <TextField
              label="Phone number"
              type="tel"
              inputMode="tel"
              value={profile.contact.phone ?? ""}
              onChange={(phone) => patchContact({ phone: phone || undefined })}
              maxLength={32}
            />
          </div>

          <TextField
            label="Email"
            type="email"
            inputMode="email"
            value={profile.contact.email ?? ""}
            onChange={(email) => patchContact({ email: email || undefined })}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="City"
              value={profile.contact.city ?? ""}
              onChange={(city) => patchContact({ city: city || undefined })}
              maxLength={60}
            />

            <TextField
              label="Address"
              value={profile.contact.addressLine ?? ""}
              onChange={(addressLine) => patchContact({ addressLine: addressLine || undefined })}
              maxLength={160}
            />
          </div>

          <TextField
            label="Map link"
            hint="Paste your Google Maps link. Optional."
            type="url"
            inputMode="url"
            value={profile.contact.mapUrl ?? ""}
            onChange={(mapUrl) => patchContact({ mapUrl: mapUrl || undefined })}
          />

          <TextField
            label="Opening hours"
            hint="In plain words, e.g. 5 am - 9 pm, closed Saturdays."
            value={profile.hours?.summary ?? ""}
            onChange={(summary) => patch({ hours: summary ? { summary } : undefined })}
            maxLength={120}
          />
        </Section>

        <PlansEditor
          plans={profile.plans}
          currency={profile.currency}
          onChange={(plans) => patch({ plans })}
        />

        <PhotosEditor
          photos={profile.photos}
          onChange={(photos) => patch({ photos })}
          // Signed in here, so the file goes straight to storage.
          upload={async (file) => uploadPhoto(file, { userId, businessId: business.id })}
          onRemove={(photo) => void deletePhoto(photo.url)}
        />

        <ReviewsEditor reviews={profile.reviews} onChange={(reviews) => patch({ reviews })} />

        {/* Sticky so Save is reachable without scrolling back up a long form. */}
        <div className="sticky bottom-0 -mx-1 border-t border-[color:var(--color-hairline)] bg-white/95 px-1 py-3 backdrop-blur">
          {!canPublish ? (
            <p className="mb-2 text-[13px] text-[color:var(--color-muted)]">
              Add a phone or WhatsApp number, or one price, before this page can go live.
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="mb-2 text-[13px] text-red-600">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={state === "saving" || state === "clean"}
            className="brand-bg w-full rounded-xl px-4 py-3 text-sm font-medium disabled:opacity-50"
          >
            {SAVE_LABELS[state]}
          </button>
        </div>
      </form>

      <aside className="order-1 lg:order-2 lg:sticky lg:top-6 lg:h-[calc(100dvh-3rem)] lg:overflow-y-auto">
        <h2 className="mb-2 text-[13px] font-medium text-[color:var(--color-muted)]">Preview</h2>
        <div className="card overflow-hidden">
          {/* `inert` removes the preview's buttons from tab order and the accessibility tree. */}
          <div inert className="select-none">
            <BusinessPageView business={preview} hideFooter />
          </div>
        </div>
      </aside>
    </div>
  );
}

const SAVE_LABELS: Record<SaveState, string> = {
  clean: "Saved",
  dirty: "Save changes",
  saving: "Saving…",
  saved: "Saved",
};
