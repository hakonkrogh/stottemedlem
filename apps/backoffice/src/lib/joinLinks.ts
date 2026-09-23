import { env } from "cloudflare:workers";
import {
  CANONICAL_ORIGIN,
  CANONICAL_ORIGIN_DISPLAY,
  joinPagePath,
  joinPageQrPath,
  joinPageTermsPath,
} from "@stottemedlem/core";

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

/**
 * The same origin written the way a person reads it: støttemedlem.no with its
 * ø, not the punycode a browser encodes it as.
 *
 * This form is for an address the product hands to a PERSON to pass on, which
 * is what the share chooser does (specs/concepts/member-card.md): the address
 * is read, pasted and posted by people, and the ASCII form reads as a garbled
 * domain rather than as ours. Anything a machine reads keeps the punycode
 * form: QR payloads, embed snippets and hrefs written into emails, where a
 * raw ø breaks some scanners and clients (see CANONICAL_ORIGIN).
 *
 * Only the canonical origin has a display form. Staging's own origin is
 * already ASCII and is returned unchanged.
 */
export function readableShareableOrigin(): string {
  const origin = shareableOrigin();
  return origin === CANONICAL_ORIGIN ? CANONICAL_ORIGIN_DISPLAY : origin;
}

/**
 * The organization's shareable join-page address on this environment, in the
 * ASCII form a machine reads: this is what the QR code encodes.
 */
export function shareableJoinUrl(slug: string): string {
  return `${shareableOrigin()}${joinPagePath(slug)}`;
}

/**
 * The same join-page address the way a person reads it (with the ø). This is
 * what the back office shows an administrator to copy and pass on.
 */
export function readableJoinUrl(slug: string): string {
  return `${readableShareableOrigin()}${joinPagePath(slug)}`;
}

/** The organization's sales-terms address, the way a person reads it. */
export function readableJoinTermsUrl(slug: string): string {
  return `${readableShareableOrigin()}${joinPageTermsPath(slug)}`;
}

/** The organization's QR code card address, the way a person reads it. This
 *  is the image posters and other websites embed
 *  (specs/use-cases/promote-with-qr-card.md). It sits beneath the join page,
 *  so it is routed and public wherever the page is. */
export function readableQrCardUrl(slug: string): string {
  return `${readableShareableOrigin()}${joinPageQrPath(slug)}`;
}
