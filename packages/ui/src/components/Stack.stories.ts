import Stack from "./Stack.astro";

const box = (label: string) =>
  `<div style="padding:0.5rem 0.75rem;background:var(--sm-accent-soft);border-radius:8px">${label}</div>`;

export default {
  title: "Primitives/Stack",
  component: Stack,
};

export const GapSmall = {
  args: { gap: "sm", slots: { default: [box("En"), box("To"), box("Tre")] } },
};

export const GapMedium = {
  args: { gap: "md", slots: { default: [box("En"), box("To"), box("Tre")] } },
};

export const GapLarge = {
  args: { gap: "lg", slots: { default: [box("En"), box("To"), box("Tre")] } },
};
