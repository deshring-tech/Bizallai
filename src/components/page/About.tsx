import type { BusinessProfile } from "@/lib/domain/business";
import { telLink } from "@/lib/format";

export function About({ profile }: { profile: BusinessProfile }) {
  const { about, contact, hours } = profile;
  const hasDetails = Boolean(contact.addressLine || contact.city || hours?.summary || contact.phone);

  if (!about && !hasDetails) return null;

  return (
    <section className="px-5 pt-8">
      <h2 className="text-lg font-semibold">About</h2>

      {about ? (
        <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--color-muted)]">{about}</p>
      ) : null}

      {hasDetails ? (
        <dl className="mt-4 space-y-2 text-[14px]">
          {contact.addressLine || contact.city ? (
            <Row label="Address">
              {contact.mapUrl ? (
                <a
                  href={contact.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="brand-text underline underline-offset-2"
                >
                  {[contact.addressLine, contact.city].filter(Boolean).join(", ")}
                </a>
              ) : (
                [contact.addressLine, contact.city].filter(Boolean).join(", ")
              )}
            </Row>
          ) : null}

          {hours?.summary ? <Row label="Hours">{hours.summary}</Row> : null}

          {contact.phone ? (
            <Row label="Phone">
              <a href={telLink(contact.phone)} className="brand-text underline underline-offset-2">
                {contact.phone}
              </a>
            </Row>
          ) : null}
        </dl>
      ) : null}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-20 shrink-0 text-[color:var(--color-muted)]">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
