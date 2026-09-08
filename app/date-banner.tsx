import { formatKoreanDate } from "@/lib/date";
import type { Holiday } from "@/lib/holidays";

export default function DateBanner({
  today,
  holidays,
}: {
  today: string;
  holidays: Holiday[];
}) {
  return (
    <div className="mb-4 rounded-xl bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800/50">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
        오늘은 {formatKoreanDate(today)}
      </p>
      {holidays.length > 0 && (
        <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
          {holidays.map((holiday) => (
            <li
              key={holiday.date}
              className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400"
            >
              <span className="font-medium text-zinc-600 dark:text-zinc-300">
                {holiday.name}
              </span>
              <span
                className={
                  holiday.dday === 0
                    ? "font-semibold text-red-500"
                    : "text-zinc-400"
                }
              >
                {holiday.dday === 0 ? "오늘" : `D-${holiday.dday}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
