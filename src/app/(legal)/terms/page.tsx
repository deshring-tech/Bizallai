import type { Metadata } from "next";
import Link from "next/link";
import { ContactLine } from "@/app/(legal)/ContactLine";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Terms of use — ${SITE_NAME}`,
  description: `The rules for using ${SITE_NAME}.`,
};

/* Plain-language draft. Have it reviewed by a lawyer for each market before launch. */
export default function TermsPage() {
  return (
    <>
      <h1>Terms of use</h1>
      <p>Last updated 13 September 2026</p>

      <p>
        By creating a page or sending an enquiry on {SITE_NAME}, you agree to these terms. How we
        handle personal data is covered separately in our <Link href="/privacy">privacy policy</Link>.
      </p>

      <h2>Your page</h2>
      <ul>
        <li>
          You are responsible for everything on your page. It must be accurate, and you must have the
          right to use every photo and piece of text on it.
        </li>
        <li>
          <strong>Reviews must be genuine.</strong> Only publish what real customers have actually
          said about your business.
        </li>
        <li>
          Prices and offers shown on your page should be ones you will honour for customers who
          enquire.
        </li>
      </ul>

      <h2>AI-generated content</h2>
      <p>
        Our assistant writes a first draft of your page from your answers or from content you ask us
        to import. It can make mistakes. Check your page before and after publishing — you are
        responsible for what it says.
      </p>

      <h2>Enquiries</h2>
      <p>
        We pass customer enquiries to you as they arrive. We do not guarantee any number of
        enquiries, and any agreement you make with a customer is between you and that customer.
      </p>

      <h2>What is not allowed</h2>
      <ul>
        <li>Anything illegal, deceptive, or harmful.</li>
        <li>Pretending to be a business or person you are not.</li>
        <li>Importing content from a website you do not own or have permission to use.</li>
        <li>Using customer details from enquiries for anything other than responding to them.</li>
      </ul>
      <p>We may unpublish or remove a page that breaks these rules.</p>

      <h2>Cost</h2>
      <p>
        {SITE_NAME} is currently free. If we introduce paid features, we will tell you clearly before
        anything is charged.
      </p>

      <h2>The service</h2>
      <p>
        We work to keep {SITE_NAME} available and reliable, but it is provided as it is, and it may
        change over time. You can unpublish your page whenever you like.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms: <ContactLine />.
      </p>
    </>
  );
}
