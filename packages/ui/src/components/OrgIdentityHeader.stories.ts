// The one presentation of an organization, in every state its imagery can be
// in. The public join page, the receipt and the back-office preview all render
// this same component, so these stories are what an administrator sees when
// they ask "how is my organization shown?".
import OrgIdentityHeader from "./OrgIdentityHeader.astro";
import {
  FIXTURE_BANNER_URL,
  FIXTURE_LOGO_URL,
  FIXTURE_ORG_NAME,
} from "./OrgIdentityHeader.fixtures";

export default {
  title: "Primitives/OrgIdentityHeader",
  component: OrgIdentityHeader,
};

/** Nothing uploaded: the name stands alone, no empty space reserved. */
export const NameOnly = {
  args: { name: FIXTURE_ORG_NAME },
};

/** A logo alone sits in its circle beside the name. */
export const WithLogo = {
  args: { name: FIXTURE_ORG_NAME, logoUrl: FIXTURE_LOGO_URL },
};

/** A banner alone: the wide backdrop with the name below it. */
export const WithBanner = {
  args: { name: FIXTURE_ORG_NAME, bannerUrl: FIXTURE_BANNER_URL },
};

/** Both: the circle overlaps the banner's bottom edge, Facebook-style. */
export const WithLogoAndBanner = {
  args: {
    name: FIXTURE_ORG_NAME,
    logoUrl: FIXTURE_LOGO_URL,
    bannerUrl: FIXTURE_BANNER_URL,
  },
};

/** The organization chose to keep the top of the banner in view. */
export const BannerFocalPoint = {
  args: {
    name: FIXTURE_ORG_NAME,
    logoUrl: FIXTURE_LOGO_URL,
    bannerUrl: FIXTURE_BANNER_URL,
    bannerFocus: { x: 50, y: 0 },
  },
};

/** A long compound name wraps beside the logo instead of pushing it out. */
export const LongName = {
  args: {
    name: "Vestbygda og Omegn Skolekorps og Drilltropp",
    logoUrl: FIXTURE_LOGO_URL,
    bannerUrl: FIXTURE_BANNER_URL,
  },
};
