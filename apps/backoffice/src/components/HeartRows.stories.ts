// The heart buildup in every shape it takes: a first year, a filling row, and
// the long loyalty that spills onto new rows (specs/concepts/scorecard.md).
import HeartRows from "./HeartRows.astro";

export default {
  title: "Backoffice/Hjerterader",
  component: HeartRows,
};

export const FirstYear = { args: { count: 1 } };
export const AFewYears = { args: { count: 4 } };
export const FullRow = { args: { count: 10 } };
export const SecondRowStarted = { args: { count: 13 } };
export const LongLoyalty = { args: { count: 27 } };
export const NothingYet = { args: { count: 0 } };
