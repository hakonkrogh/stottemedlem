import MembershipTierFormScreen from "./MembershipTierFormScreen.astro";
import StoryScreen from "./StoryScreen.astro";
import { BASIC_TIER, ORG, ORG_PATH } from "./storyFixtures";

export default {
  title: "Backoffice/Medlemskap-skjema",
  component: StoryScreen,
};

const form = (props: Record<string, unknown> = {}) => ({
  active: "medlemskap",
  warnings: [],
  slots: {
    default: {
      component: MembershipTierFormScreen,
      props: {
        orgName: ORG.name,
        tiersPath: `${ORG_PATH}/medlemskap`,
        title: `Endre ${BASIC_TIER.name}`,
        isNew: false,
        values: {
          name: BASIC_TIER.name,
          description: BASIC_TIER.description ?? "",
          annualFee: String(BASIC_TIER.annualFeeNok),
        },
        feePlaceholder: "300",
        canArchive: true,
        activeMembers: 24,
        currentFeeNok: BASIC_TIER.annualFeeNok,
        unreachable: 2,
        ...props,
      },
    },
  },
});

/** Editing a membership people already pay for: what a price change moves. */
export const EditTier = { args: form() };

/** Adding one — the same mechanism, starting from a template if you like. */
export const NewTier = {
  args: form({
    title: "Legg til medlemskap",
    isNew: true,
    values: { name: "", description: "", annualFee: "" },
    canArchive: false,
    activeMembers: 0,
    currentFeeNok: undefined,
    unreachable: 0,
  }),
};

/** The last active membership cannot be archived. */
export const CannotArchive = { args: form({ canArchive: false }) };

/**
 * A fee change is never saved on the first press: the administrator is told
 * how many members the product will email — with no opt-out — and chooses
 * between confirming and cancelling the whole update.
 */
export const ConfirmingFeeChange = {
  args: form({
    values: {
      name: BASIC_TIER.name,
      description: BASIC_TIER.description ?? "",
      annualFee: "400",
    },
    confirmFeeChange: { newFeeNok: 400, toEmail: 22, unreachable: 2 },
  }),
};

/** Every affected member can be emailed — the unreachable line disappears. */
export const ConfirmingFeeChangeAllReachable = {
  args: form({
    values: {
      name: BASIC_TIER.name,
      description: BASIC_TIER.description ?? "",
      annualFee: "400",
    },
    unreachable: 0,
    confirmFeeChange: { newFeeNok: 400, toEmail: 24, unreachable: 0 },
  }),
};
