// Fictitious imagery for stories of an organization's identity: a drawn logo
// and a drawn banner, inlined as data URIs so no story ever needs a server (or
// a real organization's pictures, since stories are committed and
// screenshotted). Shared with the back-office screen stories, which show the
// same header inside the settings preview.

const svgDataUrl = (svg: string): string =>
  `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;

export const FIXTURE_ORG_NAME = "Vestbygda Musikkorps";

/** A round badge: what most band and club logos look like once uploaded. */
export const FIXTURE_LOGO_URL = svgDataUrl(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
    <circle cx="100" cy="100" r="96" fill="#1f3a6e"/>
    <circle cx="100" cy="100" r="84" fill="none" stroke="#e3b341" stroke-width="5"/>
    <text x="100" y="112" text-anchor="middle" font-family="Georgia, serif" font-weight="700"
      font-size="64" fill="#fff8e8">VM</text>
    <text x="100" y="146" text-anchor="middle" font-family="Georgia, serif" font-size="17"
      letter-spacing="3" fill="#e3b341">SIDEN 1962</text>
  </svg>
`);

/**
 * A 4:3 landscape, deliberately taller than the 12:5 backdrop it is cropped
 * to: the sun sits high, so the crop visibly changes with the focal point.
 */
export const FIXTURE_BANNER_URL = svgDataUrl(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#7fb4e6"/>
        <stop offset="1" stop-color="#f6e7c8"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="900" fill="url(#sky)"/>
    <circle cx="230" cy="170" r="70" fill="#ffd66b"/>
    <path d="M0 620 Q300 470 600 600 T1200 560 V900 H0 Z" fill="#7aa356"/>
    <path d="M0 720 Q350 600 700 720 T1200 700 V900 H0 Z" fill="#5c8a43"/>
    <g fill="#c9432f">
      <path d="M760 430 l0 210 M760 430 l60 25 -60 25" stroke="#c9432f" stroke-width="6"/>
      <path d="M860 470 l0 170 M860 470 l50 20 -50 20" stroke="#c9432f" stroke-width="6"/>
    </g>
    <rect x="0" y="800" width="1200" height="100" fill="#4a7338"/>
  </svg>
`);
