import type { Metadata } from "next";
import { CreateFlow } from "@/components/create/CreateFlow";
import { siteUrl } from "@/lib/env";

export const metadata: Metadata = {
  title: "Create your business page",
  description: "Paste your Instagram or website and get a live page with prices and bookings.",
  robots: { index: false, follow: true },
};

export default function CreatePage() {
  return (
    <main>
      <CreateFlow siteOrigin={siteUrl} />
    </main>
  );
}
