import TextArea from "./TextArea.astro";

export default {
  title: "Primitives/TextArea",
  component: TextArea,
};

export const Default = {
  args: {
    label: "Beskrivelse",
    name: "description",
    placeholder: "F.eks. hva medlemskapet betyr for organisasjonen",
    maxlength: 200,
    hint: "Maks 200 tegn. Linjeskift er lov.",
  },
};

export const WithValue = {
  args: {
    label: "Beskrivelse",
    name: "description",
    maxlength: 200,
    hint: "Maks 200 tegn. Linjeskift er lov.",
    value:
      "Et fast årlig bidrag som går direkte til arbeidet vårt.\n\nDu står på medlemslisten år for år, og hører fra oss gjennom sesongen.",
  },
};

export const WithError = {
  args: {
    label: "Beskrivelse",
    name: "description",
    maxlength: 200,
    value: "For lang tekst …",
    error: "Beskrivelsen kan være maks 200 tegn.",
  },
};
