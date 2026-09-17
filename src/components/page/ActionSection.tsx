"use client";

import { useCallback, useRef, useState } from "react";
import { LeadForm } from "@/components/page/LeadForm";
import { PlanList } from "@/components/page/PlanList";
import type { BusinessProfile, Plan } from "@/lib/domain/business";
import { telLink, whatsappLink } from "@/lib/format";

type Props = {
  slug: string;
  profile: BusinessProfile;
  /** The public example page: enquiries are simulated rather than sent. */
  demo?: boolean;
};

/**
 * Owns the one piece of state the public page needs: which plan the visitor
 * tapped. Keeping it here means the rest of the page stays server-rendered.
 */
export function ActionSection({ slug, profile, demo = false }: Props) {
  const [selected, setSelected] = useState<Plan | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const selectPlan = useCallback((plan: Plan) => {
    setSelected(plan);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const whatsapp = profile.contact.whatsapp;
  const phone = profile.contact.phone;

  return (
    <>
      <PlanList
        plans={profile.plans}
        currency={profile.currency}
        onSelect={selectPlan}
        actionLabel={profile.primaryActionLabel}
      />

      <section ref={formRef} id="enquire" className="px-5 pt-8">
        <h2 className="text-lg font-semibold">
          {selected ? `Join — ${selected.name}` : profile.primaryActionLabel}
        </h2>
        <div className="mt-3">
          <LeadForm
            key={selected?.name ?? "general"}
            slug={slug}
            actionLabel={profile.primaryActionLabel}
            planName={selected?.name}
            demo={demo}
          />
        </div>
      </section>

      {/*
        Sticky bar: on a phone the visitor is usually mid-scroll when they
        decide, and a decision that needs scrolling back up is a lost customer.
      */}
      <div className="sticky bottom-0 z-10 mt-8 border-t border-[color:var(--color-hairline)] bg-white/95 px-5 py-3 backdrop-blur">
        <div className="flex gap-2">
          <a
            href="#enquire"
            className="brand-bg flex-1 rounded-xl px-4 py-3 text-center text-sm font-medium"
          >
            {profile.primaryActionLabel}
          </a>

          {whatsapp ? (
            <a
              href={whatsappLink(whatsapp, `Hi ${profile.name}, I saw your page.`)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Message on WhatsApp"
              className="rounded-xl border border-[color:var(--color-hairline)] px-4 py-3 text-sm font-medium"
            >
              WhatsApp
            </a>
          ) : phone ? (
            <a
              href={telLink(phone)}
              aria-label="Call this business"
              className="rounded-xl border border-[color:var(--color-hairline)] px-4 py-3 text-sm font-medium"
            >
              Call
            </a>
          ) : null}
        </div>
      </div>
    </>
  );
}
