import { optOptionalString } from "./shared";
import { type ModuleDefinition, optBool, optString } from "./types";

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** Set only when the scenario's timestamp carries a UTC offset. */
  utcMs?: number;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const ISO =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/;

function parseWallClock(value: string): WallClock | undefined {
  const match = ISO.exec(value.trim());
  if (!match) return undefined;

  const [, year, month, day, hour, minute, second, offset] = match;
  const clock: WallClock = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second ?? "0"),
  };

  if (offset !== undefined) {
    const offsetMinutes =
      offset === "Z"
        ? 0
        : (offset.startsWith("-") ? -1 : 1) *
          (Number(offset.slice(1, 3)) * 60 + Number(offset.slice(-2)));
    clock.utcMs =
      Date.UTC(clock.year, clock.month - 1, clock.day, clock.hour, clock.minute, clock.second) -
      offsetMinutes * 60_000;
  }

  return clock;
}

function fromUtcMs(ms: number): WallClock {
  const date = new Date(ms);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
    utcMs: ms,
  };
}

function pad(value: number, width = 2): string {
  return String(value).padStart(width, "0");
}

/**
 * The strftime specifiers starship's defaults and documented examples use.
 * Anything else is emitted verbatim rather than guessed at.
 */
function strftime(clock: WallClock, format: string): string {
  const weekday = new Date(Date.UTC(clock.year, clock.month - 1, clock.day)).getUTCDay();
  const hour12 = clock.hour % 12 === 0 ? 12 : clock.hour % 12;
  const meridiem = clock.hour < 12 ? "AM" : "PM";

  const expand = (specifier: string): string | undefined => {
    switch (specifier) {
      case "Y":
        return pad(clock.year, 4);
      case "y":
        return pad(clock.year % 100);
      case "m":
        return pad(clock.month);
      case "d":
        return pad(clock.day);
      case "e":
        return String(clock.day).padStart(2, " ");
      case "H":
        return pad(clock.hour);
      case "k":
        return String(clock.hour).padStart(2, " ");
      case "I":
        return pad(hour12);
      case "l":
        return String(hour12).padStart(2, " ");
      case "M":
        return pad(clock.minute);
      case "S":
        return pad(clock.second);
      case "p":
        return meridiem;
      case "P":
        return meridiem.toLowerCase();
      case "T":
        return `${pad(clock.hour)}:${pad(clock.minute)}:${pad(clock.second)}`;
      case "R":
        return `${pad(clock.hour)}:${pad(clock.minute)}`;
      case "r":
        return `${pad(hour12)}:${pad(clock.minute)}:${pad(clock.second)} ${meridiem}`;
      case "F":
        return `${pad(clock.year, 4)}-${pad(clock.month)}-${pad(clock.day)}`;
      case "D":
        return `${pad(clock.month)}/${pad(clock.day)}/${pad(clock.year % 100)}`;
      case "A":
        return WEEKDAYS[weekday];
      case "a":
        return WEEKDAYS[weekday].slice(0, 3);
      case "B":
        return MONTHS[clock.month - 1];
      case "b":
      case "h":
        return MONTHS[clock.month - 1].slice(0, 3);
      case "%":
        return "%";
      default:
        return undefined;
    }
  };

  let out = "";
  for (let i = 0; i < format.length; i += 1) {
    if (format[i] !== "%" || i === format.length - 1) {
      out += format[i];
      continue;
    }
    const expanded = expand(format[i + 1]);
    out += expanded ?? `%${format[i + 1]}`;
    i += 1;
  }
  return out;
}

/** Seconds into the day, or undefined when the bound is absent or malformed. */
function parseBound(value: string): number | undefined {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) return undefined;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3] ?? "0");
}

function insideTimeRange(now: number, range: string): boolean {
  // The range is START-END; exactly one hyphen, either side optional.
  if ((range.match(/-/g) ?? []).length !== 1) return true;
  const [startText, endText] = range.split("-");
  const start = parseBound(startText);
  const end = parseBound(endText);

  if (start === undefined && end === undefined) return true;
  if (end === undefined) return now > (start as number);
  if (start === undefined) return now < end;
  // A start after the end means the range wraps past midnight.
  return start < end ? start < now && now < end : now > start || now < end;
}

export const time: ModuleDefinition = {
  name: "time",
  defaults: {
    format: "at [$time]($style) ",
    style: "bold yellow",
    use_12hr: false,
    time_format: undefined,
    disabled: true,
    utc_time_offset: "local",
    time_range: "-",
  },
  evaluate(options, ctx) {
    const parsed = parseWallClock(ctx.scenario.time);
    if (!parsed) return null;

    const offsetOption = optString(options, "utc_time_offset");
    const offsetHours = Number.parseFloat(offsetOption);
    // A numeric offset can only be honoured when the scenario's timestamp is
    // anchored to UTC; a bare local timestamp is displayed as-is, and IANA zone
    // names fall back to local the way an out-of-range offset does upstream.
    const clock =
      parsed.utcMs !== undefined &&
      Number.isFinite(offsetHours) &&
      offsetHours > -24 &&
      offsetHours < 24
        ? fromUtcMs(parsed.utcMs + Math.trunc(offsetHours * 3600) * 1000)
        : parsed;

    const secondsOfDay = clock.hour * 3600 + clock.minute * 60 + clock.second;
    if (!insideTimeRange(secondsOfDay, optString(options, "time_range"))) return null;

    const defaultFormat = optBool(options, "use_12hr") ? "%r" : "%T";
    const timeFormat = optOptionalString(options, "time_format") ?? defaultFormat;

    return { variables: { time: strftime(clock, timeFormat) } };
  },
};
