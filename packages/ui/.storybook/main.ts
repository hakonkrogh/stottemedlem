// Storybook for the shared UI package, via the community Astro framework
// (storybook-astro.org). Primitive stories are colocated with the components;
// the second glob pulls in app-level screen stories so one Storybook covers
// both layers.
const config = {
  stories: ["../src/**/*.stories.@(js|ts)", "../../../apps/backoffice/src/**/*.stories.@(js|ts)"],
  framework: {
    name: "@storybook-astro/framework",
    options: {},
  },
  // Storybook's own onboarding boxes — the sidebar "Getting started" checklist,
  // its menu entry, and the "what's new in Storybook" popup — sell addons and
  // release notes we have not asked for. Turn them all off.
  features: {
    sidebarOnboardingChecklist: false,
    menuOnboardingChecklist: false,
  },
  core: {
    disableWhatsNewNotifications: true,
  },
};

export default config;
