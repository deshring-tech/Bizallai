import { clientEnv } from "@/lib/env";

/**
 * The published contact address for data and legal requests. When it is not
 * configured the page says so visibly, so a missing address is caught before
 * launch instead of shipping a policy nobody can act on.
 */
export function ContactLine() {
  const email = clientEnv.NEXT_PUBLIC_CONTACT_EMAIL;

  if (!email) return <strong>[contact address not yet configured]</strong>;
  return <a href={`mailto:${email}`}>{email}</a>;
}
