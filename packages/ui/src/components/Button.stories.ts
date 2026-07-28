import Button from "./Button.astro";

export default {
  title: "Primitives/Button",
  component: Button,
};

export const Primary = {
  args: { slots: { default: "Opprett og fortsett" } },
};

export const Secondary = {
  args: { variant: "secondary", slots: { default: "Bytt organisasjon" } },
};

export const PrimaryBlock = {
  args: { block: true, slots: { default: "Opprett og fortsett" } },
};

export const SecondaryBlock = {
  args: {
    variant: "secondary",
    block: true,
    slots: { default: "Opprett en ny organisasjon" },
  },
};

export const AsLink = {
  args: { href: "#", slots: { default: "Lenke stylet som knapp" } },
};
