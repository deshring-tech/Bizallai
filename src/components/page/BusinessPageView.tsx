import Link from "next/link";
import { About } from "@/components/page/About";
import { ActionSection } from "@/components/page/ActionSection";
import { Gallery } from "@/components/page/Gallery";
import { Hero } from "@/components/page/Hero";
import { Reviews } from "@/components/page/Reviews";
import type { Business } from "@/lib/domain/business";
import { themeStyle } from "@/lib/theme";

type Props = {
  business: Business;
  /** Rendered inside a dashboard preview, where the footer link is noise. */
  hideFooter?: boolean;
};

/**
 * The published page. Server-rendered so it loads fast on a cheap phone and is
 * fully indexable; only the plan-selection and lead form ship JavaScript.
 */
export function BusinessPageView({ business, hideFooter = false }: Props) {
  const { profile, slug, theme } = business;

  return (
    <div style={themeStyle(theme)} className="mx-auto min-h-dvh max-w-[640px] bg-white pb-2">
      <Hero profile={profile} />
      <ActionSection slug={slug} profile={profile} />
      <About profile={profile} />
      <Gallery photos={profile.photos} businessName={profile.name} />
      <Reviews reviews={profile.reviews} />

      {hideFooter ? null : (
        <footer className="px-5 py-10 text-center">
          {/* Every published page markets the product to its own visitors. */}
          <Link
            href="/?ref=page-footer"
            className="text-[12px] text-[color:var(--color-muted)] underline underline-offset-2"
          >
            Made with BizPage
          </Link>
        </footer>
      )}
    </div>
  );
}
