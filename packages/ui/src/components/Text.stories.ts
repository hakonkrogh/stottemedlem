import Text from "./Text.astro";

export default {
  title: "Primitives/Text",
  component: Text,
};

export const Body = {
  args: { slots: { default: "Vanlig brødtekst i standardfargen." } },
};

export const Lead = {
  args: {
    variant: "lead",
    slots: { default: "Lead — den mykere introlinjen under en overskrift." },
  },
};

export const Muted = {
  args: { variant: "muted", slots: { default: "Muted — nedtonet støttetekst." } },
};

export const Small = {
  args: { variant: "small", slots: { default: "Small — liten, nedtonet detaljtekst." } },
};
