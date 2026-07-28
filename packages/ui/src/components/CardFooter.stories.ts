import CardFooter from "./CardFooter.astro";
import TextLink from "./TextLink.astro";

export default {
  title: "Primitives/CardFooter",
  component: CardFooter,
};

export const LogOut = {
  args: {
    slots: {
      default: {
        component: TextLink,
        props: { href: "#" },
        slots: { default: "Logg ut" },
      },
    },
  },
};
