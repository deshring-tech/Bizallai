/**
 * MODULE  qr
 *
 * Purpose          Render a page's public URL as a printable QR code.
 * Responsibilities SVG generation with print-safe error correction.
 * Dependencies     qrcode (server-only).
 * Notes            Generated on the server so the QR library never reaches the
 *                  browser bundle. Level "M" survives a scuffed sticker without
 *                  making the code denser than a phone camera can read.
 */

import "server-only";

import QRCode from "qrcode";

export async function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#16171a", light: "#ffffff" },
  });
}
