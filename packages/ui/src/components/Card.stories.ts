import Card from "./Card.astro";

export default {
  title: "Primitives/Card",
  component: Card,
};

export const Default = {
  args: {
    slots: {
      default: "<p style='margin:0'>Innholdet ligger på en hvit kortflate.</p>",
    },
  },
};
