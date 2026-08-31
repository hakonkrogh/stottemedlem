// Screen stories render inside ScreenFrame (the same frame Shell uses) via a
// configured-component slot, so Storybook shows the screen as it ships.
import CreateOrgScreen from "./CreateOrgScreen.astro";
import ScreenFrame from "./ScreenFrame.astro";

export default {
  title: "Backoffice/Opprett organisasjon",
  component: ScreenFrame,
};

interface ScreenProps {
  name?: string;
  values?: { orgnr: string; contactEmail: string };
  annualFee?: string;
  acceptedDpa?: boolean;
  fieldErrors?: Partial<
    Record<"name" | "orgnr" | "contactEmail" | "annualFee" | "godtarAvtale", string>
  >;
  error?: string;
}

const inFrame = (props: ScreenProps) => ({
  slots: { default: { component: CreateOrgScreen, props } },
});

export const Default = { args: inFrame({}) };

export const Filled = {
  args: inFrame({
    name: "Nordnes Skolekorps",
    values: { orgnr: "923 609 016", contactEmail: "post@nordnesskolekorps.no" },
    annualFee: "300",
    acceptedDpa: true,
  }),
};

/**
 * Everything filled in but the agreement left unticked — the one failure that
 * stops creation on its own (specs/concepts/data-processing-agreement.md).
 */
export const AgreementNotAccepted = {
  args: inFrame({
    name: "Nordnes Skolekorps",
    values: { orgnr: "923 609 016", contactEmail: "post@nordnesskolekorps.no" },
    annualFee: "300",
    fieldErrors: {
      godtarAvtale: "Du må godta databehandleravtalen for å opprette organisasjonen.",
    },
  }),
};

export const WithErrors = {
  args: inFrame({
    name: "Nordnes Skolekorps",
    values: { orgnr: "123", contactEmail: "post@" },
    annualFee: "gratis",
    fieldErrors: {
      orgnr: "Oppgi et gyldig organisasjonsnummer (9 siffer).",
      contactEmail: "Oppgi en gyldig e-postadresse.",
      annualFee: "Oppgi årsbeløpet i hele kroner.",
    },
  }),
};
