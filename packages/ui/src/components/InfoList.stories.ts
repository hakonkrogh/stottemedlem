import InfoList from "./InfoList.astro";

export default {
  title: "Primitives/InfoList",
  component: InfoList,
};

export const Rows = {
  args: {
    items: [
      { label: "Organisasjonsnummer", value: "912 345 678" },
      { label: "Kontakt-e-post", value: "post@grorudmusikk.no" },
    ],
  },
};

/** Wide screens put the facts side by side; narrow ones stack them. */
export const Columns = {
  args: {
    layout: "columns",
    items: [
      { label: "MSN (salgsenhet)", value: "123456" },
      { label: "client_id", value: "fb492b5e-7f2a-4a37-9c2e-1f0e2b3c4d5e" },
      { label: "client_secret", value: "••••9f2a" },
      { label: "Subscription key", value: "••••41cd" },
    ],
  },
};

/** A value the organization has not given yet reads as missing, not blank. */
export const WithMissingValue = {
  args: {
    items: [
      { label: "Organisasjonsnummer", value: null },
      { label: "Kontakt-e-post", value: "post@grorudmusikk.no", hint: "Vises i salgsvilkårene." },
    ],
  },
};
