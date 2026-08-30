"use client";

import { useState } from "react";
import { ApiError, apiRequest } from "@/lib/api-client";
import { LEAD_STATUS_LABELS, type Lead, type LeadStatus } from "@/lib/domain/lead";
import { formatRelativeDate, telLink, whatsappLink } from "@/lib/format";

type Props = { leads: Lead[] };

/**
 * The owner's actual job: work the list top to bottom. Status changes update
 * optimistically because the owner is usually on a phone with poor signal and
 * a spinner per tap would make triage feel broken.
 */
export function LeadsInbox({ leads: initial }: Props) {
  const [leads, setLeads] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(lead: Lead, status: LeadStatus) {
    const previous = leads;
    setLeads((current) =>
      current.map((item) => (item.id === lead.id ? { ...item, status } : item)),
    );
    setError(null);

    try {
      await apiRequest(`/api/leads/${lead.id}`, { method: "PATCH", body: { status } });
    } catch (cause) {
      setLeads(previous);
      setError(cause instanceof ApiError ? cause.message : "Could not update that lead.");
    }
  }

  if (leads.length === 0) {
    return (
      <div className="card p-8 text-center text-[14px] text-[color:var(--color-muted)]">
        No enquiries yet. Share your page link and they will appear here.
      </div>
    );
  }

  return (
    <div>
      {error ? (
        <p role="alert" className="mb-3 text-[13px] text-red-600">
          {error}
        </p>
      ) : null}

      <ul className="space-y-3">
        {leads.map((lead) => (
          <li key={lead.id} className={`card p-4 ${lead.status === "new" ? "brand-border" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{lead.name}</p>
                <p className="mt-0.5 text-[13px] text-[color:var(--color-muted)]">
                  {lead.phone}
                  {lead.planName ? ` · ${lead.planName}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-[12px] text-[color:var(--color-muted)]">
                {formatRelativeDate(lead.createdAt)}
              </span>
            </div>

            {lead.message ? (
              <p className="mt-2 text-[14px] text-[color:var(--color-muted)]">{lead.message}</p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={whatsappLink(lead.phone, `Hi ${lead.name},`)}
                target="_blank"
                rel="noopener noreferrer"
                className="brand-bg rounded-lg px-3 py-1.5 text-[13px] font-medium"
              >
                WhatsApp
              </a>
              <a
                href={telLink(lead.phone)}
                className="rounded-lg border border-[color:var(--color-hairline)] px-3 py-1.5 text-[13px] font-medium"
              >
                Call
              </a>

              <div className="ml-auto flex items-center gap-1.5">
                <label htmlFor={`status-${lead.id}`} className="sr-only">
                  Status for {lead.name}
                </label>
                <select
                  id={`status-${lead.id}`}
                  value={lead.status}
                  onChange={(event) => void setStatus(lead, event.target.value as LeadStatus)}
                  className="rounded-lg border border-[color:var(--color-hairline)] px-2.5 py-1.5 text-[13px]"
                >
                  {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
