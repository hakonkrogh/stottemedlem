import {
  memberCardImagePath,
  memberCardPath,
  memberScanUrl,
  periodLabel,
  referredJoinPath,
} from "@stottemedlem/core";
import {
  type Db,
  ensureMemberCardToken,
  findMemberCardByToken,
  type MemberCard,
} from "@stottemedlem/db";
import { type MemberCardOptions, memberCardSvg } from "@stottemedlem/qr";
import { orgLogoDataUri } from "./cardImage";
import { shareableOrigin } from "./joinLinks";
import { periods } from "./periods";

/**
 * Assembling the member's card (specs/concepts/member-card.md).
 *
 * Everything on the card is derived from what is already true — hearts from
 * the membership periods, the validity from the current annual period — so
 * there is nothing here to keep in sync and a refunded year drops off the card
 * by itself.
 */

/** The card behind a shared card address, or null when the address matches nothing. */
export async function loadMemberCard(db: Db, cardToken: string): Promise<MemberCard | null> {
  return findMemberCardByToken(db, cardToken, periods.periodFor().year);
}

/** The card's own public address — what the member shares. */
export function memberCardUrl(cardToken: string): string {
  return `${shareableOrigin()}${memberCardPath(cardToken)}`;
}

/**
 * The card as a picture: what a social feed previews and an email carries.
 * The address names this version of the card (see `memberCardVersion`), so a
 * feed that has already previewed the old card fetches the new one.
 */
export function memberCardImageUrl(card: MemberCard, format: "png" | "svg" = "png"): string {
  return `${shareableOrigin()}${memberCardPicturePath(card, format)}`;
}

/**
 * A short tag naming the card as it is right now.
 *
 * A browser keeps a picture it has fetched for a while, and a card gains a
 * heart the moment a renewal is paid: a member who renews and looks straight
 * back at their page must see the new heart, not the copy their browser kept
 * (specs/concepts/member-card.md). Nothing can reach into a browser to clear
 * that, so instead the page asks for the picture BY VERSION: the tag folds in
 * everything the drawing depends on, and a card that has changed is asked for
 * at an address the browser has never seen. A card that has not changed keeps
 * its address, and its cached picture.
 *
 * Only what the drawing reads goes in. The logo enters as its object key,
 * which already changes when the picture is replaced.
 */
export function memberCardVersion(card: MemberCard): string {
  const { periodText, lapsed } = cardPeriod(card);
  const facts = JSON.stringify([
    card.member.name,
    card.member.memberNumber,
    card.organization.name,
    card.organization.slug,
    card.organization.logoKey ?? null,
    card.hearts,
    card.recruits,
    periodText,
    lapsed,
  ]);
  // FNV-1a, 32-bit: cheap, synchronous, and plenty to tell one version of a
  // card from the next. This is a cache key, not a secret.
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(facts)) {
    hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

/**
 * The card's picture, at the address that names its current version. What
 * every page that shows the card should embed.
 */
export function memberCardPicturePath(card: MemberCard, format: "png" | "svg" = "png"): string {
  const token = card.member.cardToken ?? "";
  return `${memberCardImagePath(token, format)}?v=${memberCardVersion(card)}`;
}

/**
 * The period the card speaks for: the one it is good for while it is current,
 * and the last one supported once it is not. While a renewal is still being
 * retried that is the period being paid for, not the one that just ended, so
 * the card never says "gyldig" over a year that is over.
 */
function cardPeriod(card: MemberCard): { periodText: string; lapsed: boolean } {
  return {
    periodText: periodLabel(card.coveredPeriodYear ?? periods.periodFor().year),
    lapsed: card.status === "lapsed",
  };
}

/**
 * The join address a card's QR code leads to: the organization's ordinary join
 * page, carrying the referral that credits a completed join back to the member
 * whose card was scanned (specs/use-cases/earn-hearts-and-recruit.md).
 */
export function referredJoinUrl(slug: string, cardToken: string): string {
  return `${shareableOrigin()}${referredJoinPath(slug, cardToken)}`;
}

/**
 * What the card's QR code actually encodes: the short scan address, which
 * hands straight over to the join address above.
 *
 * The code has to be scannable from a corner of the card, and a QR code's size
 * is decided by what it carries: the join address grew with the
 * organization's slug and needed half the card. This one is the same length
 * for every member of every organization (specs/concepts/member-card.md).
 */
export function cardScanUrl(slug: string, cardToken: string): string {
  return memberScanUrl(shareableOrigin(), cardToken) ?? referredJoinUrl(slug, cardToken);
}

/**
 * What the card SAYS, without drawing it. Everything the layout derives from,
 * so a surface can reason about where a line of the card lands (see
 * `memberCardNameBand`) without paying for a drawing or a logo.
 */
export function memberCardWords(
  card: MemberCard,
): Pick<
  MemberCardOptions,
  "memberName" | "memberNumber" | "organizationName" | "hearts" | "recruits" | "lapsed"
> {
  return {
    memberName: card.member.name,
    memberNumber: card.member.memberNumber,
    organizationName: card.organization.name,
    hearts: card.hearts,
    recruits: card.recruits,
    lapsed: cardPeriod(card).lapsed,
  };
}

/** What the drawing needs, gathered from the card. */
export async function memberCardOptions(card: MemberCard): Promise<MemberCardOptions> {
  const cardToken = card.member.cardToken;
  return {
    ...memberCardWords(card),
    ...cardPeriod(card),
    joinUrl: cardToken
      ? cardScanUrl(card.organization.slug, cardToken)
      : `${shareableOrigin()}/bli-medlem/${card.organization.slug}`,
    logoDataUri: await orgLogoDataUri(card.organization.logoKey ?? null),
  };
}

/** The card, drawn. */
export async function renderMemberCardSvg(card: MemberCard): Promise<string> {
  return memberCardSvg(await memberCardOptions(card));
}

/**
 * One member's card, reached the way the product usually knows them — by their
 * membership rather than by the card address (their own page, a receipt).
 *
 * Deliberately goes back out through the card's own address, so a card is
 * assembled exactly once and identically whoever asked for it. Null means
 * there is nothing to prove yet: a supporter with no completed payment has no
 * card (specs/concepts/member-card.md).
 */
export async function loadMemberCardForMemberId(
  db: Db,
  memberId: string,
): Promise<MemberCard | null> {
  const token = await ensureMemberCardToken(db, memberId);
  return token ? loadMemberCard(db, token) : null;
}
