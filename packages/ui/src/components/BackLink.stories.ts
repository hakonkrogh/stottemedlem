import BackLink from "./BackLink.astro";

export default {
  title: "Primitives/BackLink",
  component: BackLink,
};

export const Default = {
  args: { href: "#", slots: { default: "Tilbake til medlemslisten" } },
};
