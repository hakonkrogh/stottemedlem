import Checkbox from "./Checkbox.astro";

export default {
  title: "Primitives/Checkbox",
  component: Checkbox,
};

export const Default = {
  args: {
    name: "godtarAvtale",
    slots: { default: "Jeg godtar databehandleravtalen." },
  },
};

export const Checked = {
  args: {
    name: "godtarAvtale",
    checked: true,
    slots: { default: "Jeg godtar databehandleravtalen." },
  },
};

/** The label wraps to several lines — the box must stay on the first one. */
export const LongLabel = {
  args: {
    name: "godtarAvtale",
    slots: {
      default:
        "Jeg godtar databehandleravtalen: organisasjonen eier medlemsregisteret sitt, og støttemedlem.no behandler opplysningene bare på organisasjonens vegne.",
    },
  },
};

export const WithError = {
  args: {
    name: "godtarAvtale",
    error: "Du må godta databehandleravtalen for å opprette organisasjonen.",
    slots: { default: "Jeg godtar databehandleravtalen." },
  },
};
