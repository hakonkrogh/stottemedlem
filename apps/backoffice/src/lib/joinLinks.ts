import { env } from "cloudflare:workers";
import { CANONICAL_ORIGIN, joinPagePath, joinPageTermsPath } from "@stottemedlem/core";

/**
 * The origin this environment's shareable public addresses live on
 * (specs/concepts/join-page.md). Production is the canonical støttemedlem.no
 * origin; staging sets JOIN_PAGE_ORIGIN so the addresses the back office
 * shows — and the QR codes encode — point at staging's own join pages, not
 * production's.
 */
export function shareableOrigin(): string {
  return (env.JOIN_PAGE_ORIGIN || CANONICAL_ORIGIN).replace(/\/+$/, "");
}

/** The organization's shareable join-page address on this environment. */
export function shareableJoinUrl(slug: string): string {
  return `${shareableOrigin()}${joinPagePath(slug)}`;
}

/** The organization's sales-terms address on this environment. */
export function shareableJoinTermsUrl(slug: string): string {
  return `${shareableOrigin()}${joinPageTermsPath(slug)}`;
}

/** The organization's QR code card address — the image posters and other
 *  websites embed (specs/use-cases/promote-with-qr-card.md). */
export function shareableQrCardUrl(slug: string): string {
  return `${shareableOrigin()}/api/qr/${slug}`;
}
