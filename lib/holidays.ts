import { daysBetween } from "./date";

export type Holiday = {
  date: string; // yyyy-mm-dd
  name: string;
  dday: number; // 0 = today
};

/** Solar-fixed holidays, valid for any year. */
const FIXED: { month: number; day: number; name: string }[] = [
  { month: 1, day: 1, name: "신정" },
  { month: 3, day: 1, name: "삼일절" },
  { month: 5, day: 5, name: "어린이날" },
  { month: 6, day: 6, name: "현충일" },
  { month: 8, day: 15, name: "광복절" },
  { month: 10, day: 3, name: "개천절" },
  { month: 10, day: 9, name: "한글날" },
  { month: 12, day: 25, name: "성탄절" },
];

/**
 * Lunar-based holidays cannot be derived from the solar calendar, so they are
 * listed year by year. Extend this table to cover further years.
 */
const LUNAR_BASED: Record<string, string> = {
  "2026-02-17": "설날",
  "2026-05-24": "부처님오신날",
  "2026-09-25": "추석",
  "2027-02-06": "설날",
  "2027-05-13": "부처님오신날",
  "2027-09-15": "추석",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function holidaysForYear(year: number): { date: string; name: string }[] {
  const fixed = FIXED.map(({ month, day, name }) => ({
    date: `${year}-${pad(month)}-${pad(day)}`,
    name,
  }));

  const lunar = Object.entries(LUNAR_BASED)
    .filter(([date]) => date.startsWith(`${year}-`))
    .map(([date, name]) => ({ date, name }));

  return [...fixed, ...lunar];
}

/**
 * Holidays falling today or later, soonest first. Looks into next year too so
 * the list does not run dry each December.
 */
export function getUpcomingHolidays(today: string, limit = 2): Holiday[] {
  const year = Number(today.slice(0, 4));

  return [...holidaysForYear(year), ...holidaysForYear(year + 1)]
    .map((h) => ({ ...h, dday: daysBetween(today, h.date) }))
    .filter((h) => h.dday >= 0)
    .sort((a, b) => a.dday - b.dday)
    .slice(0, limit);
}
