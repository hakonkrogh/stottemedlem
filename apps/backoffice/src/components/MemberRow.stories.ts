// The member list's row in every state an organization will actually see
// (specs/use-cases/curate-member-list.md).
import MemberRow from "./MemberRow.astro";
import {
  continuing,
  endingAfterThisYear,
  lapsed,
  nothingPaidYet,
  noWayToReach,
  withoutName,
} from "./memberFixtures";

export default {
  title: "Backoffice/Medlemsrad",
  component: MemberRow,
};

export const Continuing = { args: { entry: continuing, href: "#" } };
export const ActiveButEnding = { args: { entry: endingAfterThisYear, href: "#" } };
export const Lapsed = { args: { entry: lapsed, href: "#" } };
export const WithoutName = { args: { entry: withoutName, href: "#" } };
export const NothingPaidYet = { args: { entry: nothingPaidYet, href: "#" } };
export const NoWayToReach = { args: { entry: noWayToReach, href: "#" } };
