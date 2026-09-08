// The app is for Korean users, so "today" is always evaluated in KST rather
// than the server's timezone (Vercel runs in UTC) or the browser's locale.
// Pinning it keeps the server render and the client hydration in agreement.
const TIME_ZONE = "Asia/Seoul";

/** yyyy-mm-dd for the current day in KST. */
export function todayStr(): string {
  // en-CA formats as yyyy-mm-dd
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(
    new Date()
  );
}

/** "2026년 9월 1일 (화)" */
export function formatKoreanDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][date.getUTCDay()];
  return `${y}년 ${m}월 ${d}일 (${weekday})`;
}

/** Whole days from `from` to `to`, both yyyy-mm-dd. */
export function daysBetween(from: string, to: string): number {
  const toMs = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toMs(to) - toMs(from)) / 86_400_000);
}

/** HH:MM for the current moment in KST. */
export function nowTimeStr(): string {
  // en-GB formats as 24-hour HH:MM
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}
