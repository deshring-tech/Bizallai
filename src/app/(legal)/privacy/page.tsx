import type { Metadata } from "next";
import { ContactLine } from "@/app/(legal)/ContactLine";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Privacy policy — ${SITE_NAME}`,
  description: `What ${SITE_NAME} collects, why, and who else handles it.`,
};

/*
  Every statement here describes what the code actually does. When data
  handling changes — a new provider, analytics, payments — this page changes in
  the same commit. Have it reviewed by a lawyer for each market before launch.
*/
export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy policy</h1>
      <p>Last updated 17 September 2026</p>

      <p>
        {SITE_NAME} lets businesses publish a one-page website and receive enquiries from their
        customers. This page explains what we collect, why, and who else handles it.
      </p>

      <h2>If you visit a business page</h2>
      <ul>
        <li>We do not set cookies, and we do not use advertising or analytics trackers.</li>
        <li>
          We count page views as one number per page per day. No IP address, device identifier or
          cookie is stored with that count.
        </li>
        <li>
          To prevent abuse, we limit how often forms can be sent. For that we keep a scrambled
          (one-way hashed) form of your IP address for a short time. The address itself is never
          stored.
        </li>
      </ul>

      <h2>If you send an enquiry</h2>
      <p>
        When you use a business&apos;s enquiry form we store your <strong>name</strong>,{" "}
        <strong>phone number</strong>, any <strong>message</strong> you write, and the plan you
        asked about.
      </p>
      <ul>
        <li>
          It is shared only with the business whose page you used: it appears in their dashboard,
          and they are sent it by email. We do not sell it, and we do not contact you ourselves.
        </li>
        <li>
          The business may call or message you. How they handle your details after that is their
          responsibility.
        </li>
        <li>It is kept while that business keeps its page with us, or until you ask us to delete it.</li>
      </ul>

      <h2>If you create a page</h2>
      <ul>
        <li>
          Your <strong>email address</strong>, used to sign you in and to tell you about new
          enquiries. It is never shown on your page.
        </li>
        <li>
          Everything you add to your page — business details, prices, photos and reviews. This is
          public once you publish.
        </li>
        <li>
          While you set up a page, what you type, and the text of any website you ask us to import,
          is sent to our AI provider to build the page. Photos from an imported website are copied
          into our storage.
        </li>
        <li>A sign-in cookie, set only after you sign in, so you stay signed in.</li>
      </ul>

      <h2>Who else handles data</h2>
      <p>We use a small number of service providers, each only for the purpose listed:</p>
      <ul>
        <li>
          <strong>Supabase</strong> — database, file storage and sign-in.
        </li>
        <li>
          <strong>Anthropic</strong> — the AI that builds pages from your answers or imported
          content.
        </li>
        <li>
          <strong>Resend</strong> — sends business owners an email when an enquiry arrives.
        </li>
        <li>
          <strong>Our hosting provider</strong> — serves this website.
        </li>
      </ul>
      <p>We do not sell personal data to anyone.</p>

      <h2>Your choices</h2>
      <p>
        You can ask us to show you, correct, or delete the personal data we hold about you. Business
        owners can edit or unpublish their page at any time from their dashboard.
      </p>

      <h2>Contact</h2>
      <p>
        For any privacy request, email <ContactLine />.
      </p>

      <h2>Changes</h2>
      <p>
        If we change how we handle data, we will update this page and the date at the top before the
        change takes effect.
      </p>
    </>
  );
}
