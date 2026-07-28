// Screen stories render inside ScreenFrame (the same frame Shell uses) via a
// configured-component slot, so Storybook shows the screen as it ships.
import CreateOrgScreen from "./CreateOrgScreen.astro";
import ScreenFrame from "./ScreenFrame.astro";

export default {
  title: "Backoffice/Opprett organisasjon",
  component: ScreenFrame,
};

const inFrame = (props: { name?: string; error?: string }) => ({
  slots: { default: { component: CreateOrgScreen, props } },
});

export const Default = { args: inFrame({}) };

export const Filled = { args: inFrame({ name: "Nordnes Skolekorps" }) };

export const WithError = {
  args: inFrame({ error: "Skriv inn et navn på organisasjonen." }),
};
