import Heading from "./Heading.astro";

export default {
  title: "Primitives/Heading",
  component: Heading,
};

export const Level1 = {
  args: { level: 1, slots: { default: "Opprett organisasjon" } },
};

export const Level2 = {
  args: { level: 2, slots: { default: "Overskrift nivå 2" } },
};

export const Level3 = {
  args: { level: 3, slots: { default: "Overskrift nivå 3" } },
};
