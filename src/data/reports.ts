/**
 * A scanned lab report: what the model read from the paper, and the arithmetic the cards
 * need to show it.
 *
 * The stored shape and the screen's shape are deliberately not the same thing. A parameter
 * is stored exactly as it was read — "Hemoglobin", "11.2", "g/dL" — because that is what the
 * report says and what a later reader can check. A card needs something else: how this
 * reading sits against the readings before it. Deriving that here keeps it a pure function
 * of the history, which is what `scripts/check-report.mjs` exercises without a device.
 *
 * Nothing here touches the store, the model or the platform.
 */

export type LabStatus = 'low' | 'normal' | 'high';

/** One result on a report, as the model read it and as the store keeps it. */
export type ReportParameter = {
  name: string;
  value: string;
  unit: string;
  /** Human-readable reference range, exactly as it appears on the report. */
  referenceRange: string;
  status: LabStatus;
  /** One sentence on what this measures and how it connects to the body. */
  insight: string;
};

/** A report, and everything read from it. */
export type Report = {
  id: string;
  /** When the report was scanned, as a timestamp. */
  takenAt: number;
  /** The photo of the paper, kept on the device, empty when there is none. */
  photo: string;
  parameters: ReportParameter[];
};

/** One parameter as the screen shows it: the reading, plus the trend against its history. */
export type LabParameter = ReportParameter & {
  id: string;
  /** Change since the previous report, e.g. "↓ 0.8 since last". Empty on a first reading. */
  trend: string;
  /** Sparkline shape, oldest first. 0 sits at the top of the plot, 1 at the bottom. */
  trendPoints: readonly number[];
};

/** One stored reading, with the moment it was taken — the history a trend is drawn from. */
export type ParameterReading = {
  name: string;
  value: string;
  takenAt: number;
};

/** How many readings the trend line plots. Six is what the design's line shows. */
const PLOT_POINTS = 6;

const STATUSES: readonly LabStatus[] = ['low', 'normal', 'high'];

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * The status the app can draw. Anything the model answered that is not one of the three —
 * a word in another language, a guess at a range — is read as in range rather than thrown
 * away, and the review step is where a wrong one is corrected.
 */
export function toStatus(value: unknown): LabStatus {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : '';

  return STATUSES.find((status) => status === text) ?? 'normal';
}

/**
 * The readings of each parameter, oldest first — keyed by name, lower-cased and trimmed,
 * so "Hemoglobin" on one report and "hemoglobin " on the next are the same series.
 */
export function historyOf(readings: readonly ParameterReading[]) {
  const history: Record<string, string[]> = {};

  for (const reading of readings) {
    const key = reading.name.trim().toLowerCase();

    (history[key] ??= []).push(reading.value);
  }

  return history;
}

/**
 * The trend sentence and the sparkline for one parameter, from its readings oldest first
 * with the current one last.
 *
 * A trend is a claim about two numbers, so it is only made when the last two readings are
 * both numbers: "Negative" and "<0.5" are real answers on real reports and neither can be
 * subtracted. With one reading there is no previous report and no sentence — the card shows
 * the range alone, and the line is the single dot of one measurement.
 */
export function trendOf(values: readonly string[]): {
  text: string;
  points: readonly number[];
} {
  const numbers = values
    .slice(-PLOT_POINTS)
    .map(asNumber)
    .filter((value): value is number => value !== null);

  const points = normalise(numbers);

  if (numbers.length < 2) return { text: '', points };

  const delta = numbers[numbers.length - 1] - numbers[numbers.length - 2];

  if (delta === 0) return { text: 'steady', points };

  return { text: `${delta > 0 ? '↑' : '↓'} ${format(Math.abs(delta))} since last`, points };
}

/** The latest report's parameters, each with the trend it has against the reports before. */
export function cardParameters(
  report: Report,
  history: Record<string, readonly string[]>,
): LabParameter[] {
  return report.parameters.map((parameter, index) => {
    // A name the history does not know is a first reading, which is a dot and no line.
    const values = history[parameter.name.trim().toLowerCase()] ?? [parameter.value];
    const { text, points } = trendOf(values);

    return { ...parameter, id: `${report.id}-${index}`, trend: text, trendPoints: points };
  });
}

/** The line under the Reports title: "3 parameters · updated today", or the empty state. */
export function reportsSubtitle(report: Report | null, count: number) {
  if (!report || count === 0) return 'No report yet';

  return `${count} ${count === 1 ? 'parameter' : 'parameters'} · ${updatedLabel(report.takenAt)}`;
}

/** When the newest report was scanned, in the words the design uses. */
export function updatedLabel(takenAt: number, now = Date.now()) {
  const days = daysBetween(takenAt, now);

  if (days <= 0) return 'updated today';
  if (days === 1) return 'updated yesterday';
  if (days < 30) return `updated ${days} days ago`;

  const date = new Date(takenAt);

  return `updated on ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** A reading the trend can do arithmetic on, or `null` for "Negative", "<0.5", "—". */
function asNumber(value: string) {
  const text = value.trim();

  return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : null;
}

/** Trim floating-point noise, so 0.30000000000000004 reads as "0.3". */
function format(number: number) {
  return String(Number(number.toFixed(2)));
}

/** Readings as heights in the plot: the highest sits at the top. */
function normalise(numbers: readonly number[]) {
  if (!numbers.length) return [];

  const high = Math.max(...numbers);
  const low = Math.min(...numbers);

  if (high === low) return numbers.map(() => 0.5);

  return numbers.map((number) => (high - number) / (high - low));
}

/** Whole days between two moments, counted from local midnight rather than 24-hour blocks. */
function daysBetween(from: number, to: number) {
  const startOfDay = (moment: number) => {
    const date = new Date(moment);
    date.setHours(0, 0, 0, 0);

    return date.getTime();
  };

  return Math.round((startOfDay(to) - startOfDay(from)) / 86_400_000);
}
