/**
 * MODULE  theme
 *
 * Purpose          Translate a business's brand colour into safe CSS variables.
 * Responsibilities Contrast selection and inline style generation.
 * Dependencies     domain/business (types only).
 * Notes            The brand colour comes from AI output and owner input, so it
 *                  is re-validated here rather than trusted into a style tag.
 */

import type { CSSProperties } from "react";
import type { Theme } from "@/lib/domain/business";

const HEX = /^#[0-9a-fA-F]{6}$/;
const FALLBACK = "#1d9e75";

function channels(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

/** Relative luminance per WCAG 2.1, used to pick readable text over the brand. */
function luminance(hex: string): number {
  const linear = channels(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];

  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function contrastColor(hex: string): "#ffffff" | "#16171a" {
  return luminance(hex) > 0.45 ? "#16171a" : "#ffffff";
}

/**
 * Produces the inline custom properties a page section reads. Returning a
 * style object rather than a `<style>` string means React escapes the values
 * and no untrusted text can break out into the stylesheet.
 */
export function themeStyle(theme: Theme): CSSProperties {
  const brand = HEX.test(theme.brand) ? theme.brand : FALLBACK;

  return {
    "--brand": brand,
    "--brand-contrast": contrastColor(brand),
  } as CSSProperties;
}
