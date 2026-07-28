import TextLink from "./TextLink.astro";

export default {
  title: "Primitives/TextLink",
  component: TextLink,
};

export const Default = {
  args: { href: "#", slots: { default: "Logg ut" } },
};
