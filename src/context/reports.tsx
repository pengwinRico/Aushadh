import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { deleteReport, listParameterHistory, listReport, saveReport } from '@/data/database';
import { newRecordId } from '@/data/ids';
import { forgetPhoto, keepPhoto, type PickedPhoto } from '@/data/photo';
import {
  cardParameters,
  historyOf,
  type LabParameter,
  type Report,
  type ReportParameter,
} from '@/data/reports';

/**
 * What the scan form hands over once the model has read a report: the results it found, and
 * the photo of the paper they were read from.
 */
export type ReportDraft = {
  parameters: ReportParameter[];
  /** The photo of the report, when one was taken. */
  photo?: PickedPhoto | null;
};

/** What the store said: the newest report, and the readings a trend compares against. */
type Stored = {
  report: Report | null;
  history: Record<string, readonly string[]>;
};

type ReportsContextValue = {
  /** The newest report's results, ready to draw. `null` until the store has answered. */
  parameters: LabParameter[] | null;
  /** The newest report itself — when it was scanned. `null` when there is none. */
  report: Report | null;
  /** Store a scanned report, photo and all, and re-read the store. */
  addReport: (draft: ReportDraft) => Promise<void>;
  /** Take the newest report away, and its photo with it. */
  removeLatestReport: () => Promise<void>;
};

const ReportsContext = createContext<ReportsContextValue | null>(null);

/** Read the reports, and change them, from anywhere under `<ReportsProvider>`. */
export function useReports() {
  const value = use(ReportsContext);

  if (!value) throw new Error('useReports must be used inside a <ReportsProvider>');

  return value;
}

/**
 * The reports for the whole app. It is held here rather than on the screen because the scan
 * form is its own route: it writes through this provider, so the Reports tab behind it is
 * already showing the new results by the time the sheet closes.
 *
 * The trend a card draws is computed from the newest report *and the ones before it*, which
 * is why the history is read alongside it — a report on its own has nothing to compare to.
 */
export function ReportsProvider({ children }: PropsWithChildren) {
  const [stored, setStored] = useState<Stored | null>(null);

  const refresh = useCallback(async () => {
    const [report, readings] = await Promise.all([listReport(), listParameterHistory()]);

    setStored({ report, history: historyOf(readings) });
  }, []);

  useEffect(() => {
    // A read that lands after unmount must not set state.
    let active = true;

    Promise.all([listReport(), listParameterHistory()])
      .then(([report, readings]) => {
        if (active) setStored({ report, history: historyOf(readings) });
      })
      .catch((error: unknown) => {
        // Show an empty Reports tab rather than a screen that never arrives; scanning
        // still works.
        console.warn('Could not read the reports', error);

        if (active) setStored({ report: null, history: {} });
      });

    return () => {
      active = false;
    };
  }, []);

  const addReport = useCallback(
    async ({ parameters, photo }: ReportDraft) => {
      const id = newRecordId('report');
      // The photo is kept under the report's own id, so the file and the row are named
      // together and the picture outlives the cache it was read from.
      const kept = photo ? await keepPhoto(photo, id, 'reports') : '';

      await saveReport({ id, takenAt: Date.now(), photo: kept, parameters });
      await refresh();
    },
    [refresh],
  );

  const removeLatestReport = useCallback(async () => {
    if (!stored?.report) return;

    // The store hands back the photo the row pointed at; without this the file would stay
    // on the device with nothing left to reach it.
    const photo = await deleteReport(stored.report.id);

    if (photo) forgetPhoto(photo);

    await refresh();
  }, [stored, refresh]);

  const parameters = useMemo(
    () => (stored ? (stored.report ? cardParameters(stored.report, stored.history) : []) : null),
    [stored],
  );

  const value = useMemo(
    () => ({
      parameters,
      report: stored?.report ?? null,
      addReport,
      removeLatestReport,
    }),
    [parameters, stored, addReport, removeLatestReport],
  );

  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
}
