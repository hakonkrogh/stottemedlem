import TextField from "./TextField.astro";

export default {
  title: "Primitives/TextField",
  component: TextField,
};

export const Default = {
  args: {
    label: "Navn på organisasjonen",
    name: "name",
    placeholder: "F.eks. Bakvendtland Skolekorps",
  },
};

export const WithValue = {
  args: {
    label: "Navn på organisasjonen",
    name: "name",
    value: "Bakvendtland Skolekorps",
  },
};

export const WithError = {
  args: {
    label: "Navn på organisasjonen",
    name: "name",
    error: "Skriv inn et navn på organisasjonen.",
  },
};
