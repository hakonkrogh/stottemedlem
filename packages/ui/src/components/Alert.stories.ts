import Alert from "./Alert.astro";

export default {
  title: "Primitives/Alert",
  component: Alert,
};

export const ErrorMessage = {
  args: {
    variant: "error",
    slots: { default: "Skriv inn et navn på organisasjonen." },
  },
};
