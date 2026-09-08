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

export const Notice = {
  args: {
    variant: "info",
    slots: {
      default:
        "Vipps er ikke koblet til ennå. Legg inn salgsenhetens API-nøkler for å kunne ta betalt.",
    },
  },
};

export const Success = {
  args: {
    variant: "success",
    slots: { default: "Nøklene virker og er lagret. Vipps er koblet til." },
  },
};
