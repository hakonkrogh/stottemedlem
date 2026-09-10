// Fictitious organization for the back-office screen stories — never a real
// organization's details, since stories are committed and screenshotted.
//
// The stories are also how this back office is reviewed: every link a screen
// renders is mapped to the story that shows where it leads, so the whole tabbed
// back office can be clicked through in Storybook without running the app.
import { CANONICAL_ORIGIN, DPA_VERSION } from "@stottemedlem/core";
import type { MembershipTier, Organization, OrganizationStats } from "@stottemedlem/db";
import { qrCardSvg } from "@stottemedlem/qr";
import {
  FIXTURE_BANNER_URL,
  FIXTURE_LOGO_URL,
} from "@stottemedlem/ui/components/OrgIdentityHeader.fixtures.ts";
import type { AdministratorEntry, PendingInviteEntry } from "../lib/administrators";
import { withEmbeddedCardFont } from "../lib/cardFont";
import type { OrgWarning } from "../lib/orgWarnings";
import { orgWarnings } from "../lib/orgWarnings";

export const ORG: Organization = {
  id: "org-1",
  workosOrgId: "org_01story",
  name: "Bakvendtland Skolekorps",
  slug: "bakvendtland-skolekorps",
  orgnr: "912345678",
  contactEmail: "post@bakvendtland.example",
  annualFeeNok: null,
  logoKey: null,
  bannerKey: null,
  bannerFocusX: null,
  bannerFocusY: null,
  // Signed up after the agreement existed, which is the ordinary case
  // (specs/concepts/data-processing-agreement.md).
  dpaAcceptedAt: "2026-01-04T09:00:00.000Z",
  dpaVersion: DPA_VERSION,
  createdAt: "2026-01-04",
};

/**
 * The same organization once it has uploaded its imagery. The keys are the
 * shape the app stores (content-hashed object keys); the pictures they resolve
 * to in a story come from `storyImageSrc` below.
 */
export const ORG_WITH_IMAGES: Organization = {
  ...ORG,
  logoKey: "org/org-1/logo-1a2b3c4d5e6f7a8b.png",
  bannerKey: "org/org-1/banner-8b7a6f5e4d3c2b1a.jpg",
};

// The drawn logo an organization that has uploaded one is shown with, in the
// public identity header and in the back office's own chrome alike.
export { FIXTURE_LOGO_URL };

export const ORG_PATH = `/o/${ORG.slug}`;
export const JOIN_URL = `${CANONICAL_ORIGIN}/bli-medlem/${ORG.slug}`;
export const TERMS_URL = `${JOIN_URL}/vilkar`;
export const QR_CARD_URL = `${JOIN_URL}/qr`;
/**
 * The very card that address serves, drawn here instead of fetched: a story
 * has no worker behind it, and a broken picture would say nothing about how
 * the front page presents the card.
 *
 * With the typeface inside it, exactly as the app serves it: the picture is an
 * `<img>`, which loads no webfont, so without that the story would review the
 * card in Georgia while every real surface shows Fraunces.
 */
export const QR_CARD_PREVIEW_SRC = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  withEmbeddedCardFont(qrCardSvg({ joinUrl: JOIN_URL, organizationName: ORG.name })),
)}`;
export const WEBHOOK_URL = `${CANONICAL_ORIGIN}/api/vipps/${ORG.slug}`;
export const ADMIN_NAME = "Kari Nordmann";

/**
 * The people who may act for the organization, and the invitation still
 * waiting (specs/use-cases/manage-administrators.md). The first of them is
 * the administrator reading the screen.
 */
export const ADMINISTRATORS: AdministratorEntry[] = [
  {
    userId: "user_01story",
    membershipId: "om_01story",
    name: ADMIN_NAME,
    email: "kari@bakvendtland.example",
    isYou: true,
  },
  {
    userId: "user_02story",
    membershipId: "om_02story",
    name: "Ola Nordmann",
    email: "ola@bakvendtland.example",
    isYou: false,
  },
  {
    userId: "user_03story",
    membershipId: "om_03story",
    name: null,
    email: "kasserer@bakvendtland.example",
    isYou: false,
  },
];

export const PENDING_INVITES: PendingInviteEntry[] = [
  {
    id: "invitation_01story",
    email: "nils@bakvendtland.example",
    sentAt: "2026-09-08T09:00:00.000Z",
    expiresAt: "2026-09-15T09:00:00.000Z",
  },
];

/**
 * The organization in numbers, counted from the very same supporters
 * `everyone` in memberFixtures holds, so the front page, the chrome's member
 * pill and the member list never disagree in a story: four current supporters
 * (one of them ending, which is also the one stop this period), one lapsed,
 * and one who has approved but not paid yet.
 */
export const ORG_STATS: OrganizationStats = {
  annualSupportNok: 1900,
  activeMembers: 4,
  renewingMembers: 3,
  endingMembers: 1,
  lapsedMembers: 1,
  newMembers: 2,
  stoppedMembers: 1,
  paidThisPeriodNok: 965,
  paidAllTimeNok: 5200,
};

/** Supporters current this period, the pill the member tab carries. */
export const ACTIVE_MEMBERS = ORG_STATS.activeMembers;

/** The period the stories are set in, as a screen would say it. */
export const PERIOD_LABEL = "2026";

/** An organization nobody has joined yet: every figure is nothing. */
export const NO_STATS: OrganizationStats = {
  annualSupportNok: 0,
  activeMembers: 0,
  renewingMembers: 0,
  endingMembers: 0,
  lapsedMembers: 0,
  newMembers: 0,
  stoppedMembers: 0,
  paidThisPeriodNok: 0,
  paidAllTimeNok: 0,
};

export function fixtureTier(
  id: string,
  name: string,
  annualFeeNok: number,
  description: string | null,
): MembershipTier {
  return {
    id,
    orgId: ORG.id,
    key: id,
    name,
    annualFeeNok,
    description,
    archivedAt: null,
    createdAt: "2026-01-04",
  };
}

export const BASIC_TIER: MembershipTier = fixtureTier(
  "tier-1",
  "Støttemedlem",
  300,
  "Du støtter korpset gjennom året og får medlemsbrevet vårt.",
);

export const VIP_TIER: MembershipTier = fixtureTier(
  "tier-2",
  "Gullstøttemedlem",
  1000,
  "Ekstra god støtte — og navnet på takkelista.",
);

export const TIERS: MembershipTier[] = [BASIC_TIER, VIP_TIER];

/** The stored Vipps keys as the screen shows them: secrets already masked. */
export const STORED_KEYS = {
  merchantSerialNumber: "123456",
  clientId: "fb492b5e-7f2a-4a37-9c2e-1f0e2b3c4d5e",
  clientSecretMasked: "••••9f2a",
  subscriptionKeyMasked: "••••41cd",
  validatedDate: "27.08.2026",
  webhookUrl: WEBHOOK_URL,
  webhookRegisteredDate: "27.08.2026",
};

/** Every warning at once — the back office of an organization set up halfway. */
export const ALL_WARNINGS: OrgWarning[] = orgWarnings({
  orgPath: ORG_PATH,
  orgnr: null,
  contactEmail: null,
  tierCount: 0,
  vippsKeys: null,
  webhookUrl: WEBHOOK_URL,
  dpaAccepted: false,
});

/** Just the one warning a connected-but-unreachable payment setup produces. */
export const PAYMENT_EVENT_WARNING: OrgWarning[] = orgWarnings({
  orgPath: ORG_PATH,
  orgnr: ORG.orgnr,
  contactEmail: ORG.contactEmail,
  tierCount: TIERS.length,
  vippsKeys: {
    clientId: STORED_KEYS.clientId,
    clientSecret: "x",
    subscriptionKey: "x",
    merchantSerialNumber: STORED_KEYS.merchantSerialNumber,
    validatedAt: "2026-08-27T09:00:00.000Z",
  },
  webhookUrl: WEBHOOK_URL,
  dpaAccepted: true,
});

/**
 * Which story shows the screen behind each address of the back office. Any
 * link the stories do not cover is left dead rather than sent somewhere wrong.
 */
const STORY_ROUTES: Record<string, string> = {
  [ORG_PATH]: "backoffice-oversikt--default",
  [`${ORG_PATH}/innstillinger`]: "backoffice-innstillinger--default",
  [`${ORG_PATH}/innstillinger?rediger=1`]: "backoffice-innstillinger--editing",
  [`${ORG_PATH}/administratorer`]: "backoffice-administratorer--default",
  [`${ORG_PATH}/vipps`]: "backoffice-vipps--stored-keys",
  [`${ORG_PATH}/vipps?rediger=1`]: "backoffice-vipps--replacing-keys",
  [`${ORG_PATH}/medlemmer`]: "backoffice-medlemsliste--default",
  [`${ORG_PATH}/medlemmer/m-1`]: "backoffice-medlem--continuing",
  [`${ORG_PATH}/medlemmer/m-1?rediger=1`]: "backoffice-medlem--editing",
  [`${ORG_PATH}/medlemmer/m-1?refunder=chr-2026`]: "backoffice-medlem--confirming-refund",
  // Where a search for a payment reference leads (the list story
  // "Searching by payment reference"): the member, opened on that payment.
  [`${ORG_PATH}/medlemmer/m-1?betaling=chr-p36cU6a#betaling-chr-p36cU6a`]:
    "backoffice-medlem--found-by-payment-reference",
  [`${ORG_PATH}/medlemmer/m-2`]: "backoffice-medlem--continuing",
  [`${ORG_PATH}/medlemmer/m-3`]: "backoffice-medlem--lapsed-with-history",
  [`${ORG_PATH}/medlemmer/m-4`]: "backoffice-medlem--without-name",
  [`${ORG_PATH}/medlemmer/m-5`]: "backoffice-medlem--nothing-paid-yet",
  [`${ORG_PATH}/medlemmer/m-6`]: "backoffice-medlem--no-way-to-reach",
  [`${ORG_PATH}/medlemskap`]: "backoffice-medlemskap--default",
  [`${ORG_PATH}/medlemskap/ny`]: "backoffice-medlemskap-skjema--new-tier",
  [`${ORG_PATH}/medlemskap/tier-1`]: "backoffice-medlemskap-skjema--edit-tier",
  [`${ORG_PATH}/medlemskap/tier-2`]: "backoffice-medlemskap-skjema--edit-tier",
};

/**
 * Storybook serves no org images: the public addresses a screen renders for
 * the logo and banner are swapped for the drawn fixtures, so a screen that
 * shows the organization's imagery shows something instead of a broken icon.
 */
export function storyImageSrc(src: string): string {
  if (src.startsWith(`/bli-medlem/${ORG.slug}/logo`)) return FIXTURE_LOGO_URL;
  if (src.startsWith(`/bli-medlem/${ORG.slug}/banner`)) return FIXTURE_BANNER_URL;
  return src;
}

/** A story's own address inside Storybook's preview iframe. */
export function storyHref(path: string): string {
  const id = STORY_ROUTES[path];
  return id ? `iframe.html?viewMode=story&id=${id}` : "#";
}
