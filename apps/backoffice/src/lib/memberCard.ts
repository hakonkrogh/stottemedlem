import {
  MEMBER_CARD_SHAPE_PARAM,
  MEMBER_CARD_TALL_SHAPE,
  memberCardImagePath,
  memberCardPath,
  periodLabel,
  referredJoinPath,
} from "@stottemedlem/core";
import {
  type Db,
  ensureMemberCardToken,
  findMemberCardByToken,
  type MemberCard,
} from "@stottemedlem/db";
import { type MemberCardOptions, type MemberCardShape, memberCardSvg } from "@stottemedlem/qr";
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
 * The card's address as a person should read it: no scheme, and the ø spelled
 * out. Brand attribution's rule holds here too — punycode belongs in hrefs,
 * never in visible text (specs/concepts/brand-attribution.md).
 */
export function memberCardDisplayUrl(cardToken: string): string {
  return memberCardUrl(cardToken)
    .replace(/^https:\/\//, "")
    .replace("xn--stttemedlem-hgb.no", "støttemedlem.no");
}

/** The card as a picture: what a social feed previews and an email carries. */
export function memberCardImageUrl(cardToken: string, format: "png" | "svg" = "png"): string {
  return `${shareableOrigin()}${memberCardImagePath(cardToken, format)}`;
}

/**
 * Which way round a request wants the card drawn. Anything but an explicit
 * ask for the upright one gets the wide one, so a shared address always
 * previews in the shape social platforms show whole.
 */
export function memberCardShapeFromQuery(url: URL): MemberCardShape {
  return url.searchParams.get(MEMBER_CARD_SHAPE_PARAM) === MEMBER_CARD_TALL_SHAPE ? "tall" : "wide";
}

/**
 * The join address a card's QR code leads to: the organization's ordinary join
 * page, carrying the referral that credits a completed join back to the member
 * whose card was scanned (specs/use-cases/earn-hearts-and-recruit.md).
 */
export function referredJoinUrl(slug: string, cardToken: string): string {
  return `${shareableOrigin()}${referredJoinPath(slug, cardToken)}`;
}

/** What the drawing needs, gathered from the card. */
export async function memberCardOptions(
  card: MemberCard,
  shape: MemberCardShape = "wide",
): Promise<MemberCardOptions> {
  const cardToken = card.member.cardToken;
  return {
    memberName: card.member.name,
    organizationName: card.organization.name,
    hearts: card.hearts,
    recruits: card.recruits,
    // The period the card speaks for: the one it is good for while it is
    // current, and the last one supported once it is not.
    periodText: periodLabel(card.latest?.periodYear ?? periods.periodFor().year),
    lapsed: card.status === "lapsed",
    joinUrl: cardToken
      ? referredJoinUrl(card.organization.slug, cardToken)
      : `${shareableOrigin()}/bli-medlem/${card.organization.slug}`,
    logoDataUri: await orgLogoDataUri(card.organization.logoKey ?? null),
    shape,
  };
}

/** The card, drawn. */
export async function renderMemberCardSvg(
  card: MemberCard,
  shape: MemberCardShape = "wide",
): Promise<string> {
  return memberCardSvg(await memberCardOptions(card, shape));
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
