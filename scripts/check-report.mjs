/**
 * Checks the arithmetic behind a Reports card: the trend sentence, the line it draws, and
 * the two lines the header can say.
 *
 * None of this needs a network, a photo or a device. `src/data/reports.ts` is pure, so
 * "what does ↓ 0.8 since last mean?" and "when is there no sentence at all?" are settled
 * here — including the readings that are not numbers, which is most of the awkward ones on
 * a real report ("Negative", "<0.5", "trace").
 *
 * TypeScript files are imported directly, which needs Node 24's built-in type stripping.
 *
 *   node scripts/check-report.mjs
 */
import assert from 'node:assert/strict';

import {
  cardParameters,
  historyOf,
  reportsSubtitle,
  toStatus,
  trendOf,
  updatedLabel,
} from '../src/data/reports.ts';

const results = [];
let failures = 0;

function verify(description, check) {
  try {
    check();
    results.push(`ok   ${description}`);
  } catch (error) {
    failures += 1;
    results.push(`FAIL ${description}\n     ${error.message}`);
  }
}

/** A report with one result, for the checks that care about the shape it is read into. */
function oneReport(overrides = {}) {
  return {
    id: 'report_1',
    takenAt: Date.UTC(2026, 9, 18, 9),
    photo: '',
    parameters: [
      {
        name: 'Hemoglobin',
        value: '11.2',
        unit: 'g/dL',
        referenceRange: '12.0–15.5',
        status: 'low',
        insight: 'Carries oxygen from your lungs to the rest of your body.',
      },
    ],
    ...overrides,
  };
}

verify('a rise is said with the difference, to the reading’s own precision', () => {
  assert.equal(trendOf(['11.2', '12.0']).text, '↑ 0.8 since last');
});

verify('a fall is said the same way', () => {
  assert.equal(trendOf(['12.0', '11.2']).text, '↓ 0.8 since last');
  assert.equal(trendOf(['214', '226']).text, '↑ 12 since last');
});

verify('the same reading twice is steady', () => {
  assert.equal(trendOf(['92', '92']).text, 'steady');
});

verify('a first reading makes no claim at all', () => {
  const { text, points } = trendOf(['11.2']);

  assert.equal(text, '');
  // One measurement is one dot, in the middle of the plot.
  assert.deepEqual(points, [0.5]);
});

verify('a parameter with no readings draws nothing', () => {
  assert.deepEqual(trendOf([]), { text: '', points: [] });
});

verify('readings that are not numbers cannot be subtracted, so nothing is claimed', () => {
  assert.equal(trendOf(['Negative', 'Negative']).text, '');
  assert.equal(trendOf(['<0.5', '0.4']).text, '');
  assert.equal(trendOf(['trace']).text, '');
});

verify('a number that only one of the last two readings has is still no comparison', () => {
  const { text, points } = trendOf(['120', '<0.5']);

  assert.equal(text, '');
  // The one number that is there is still plotted.
  assert.deepEqual(points, [0.5]);
});

verify('the line is drawn from the readings, lowest at the bottom', () => {
  assert.deepEqual(trendOf(['11.2', '12.0']).points, [1, 0]);
  assert.deepEqual(trendOf(['12.0', '11.2']).points, [0, 1]);
});

verify('the line plots the six most recent readings', () => {
  const points = trendOf(['1', '2', '3', '4', '5', '6', '7', '8']).points;

  assert.equal(points.length, 6);
  assert.deepEqual(points, [1, 0.8, 0.6, 0.4, 0.2, 0]);
});

verify('a flat line sits in the middle rather than collapsing to a point', () => {
  assert.deepEqual(trendOf(['92', '92', '92']).points, [0.5, 0.5, 0.5]);
});

verify('the history is keyed by the test’s name, however it is spelled', () => {
  const history = historyOf([
    { name: 'Hemoglobin', value: '10.4', takenAt: 1 },
    { name: 'hemoglobin ', value: '11.2', takenAt: 2 },
    { name: 'Fasting glucose', value: '92', takenAt: 2 },
  ]);

  assert.deepEqual(history, { hemoglobin: ['10.4', '11.2'], 'fasting glucose': ['92'] });
});

verify('a card carries the trend the history gives it', () => {
  const cards = cardParameters(
    oneReport(),
    historyOf([
      { name: 'Hemoglobin', value: '12.0', takenAt: 1 },
      { name: 'Hemoglobin', value: '11.2', takenAt: 2 },
    ]),
  );

  assert.deepEqual(cards, [
    {
      ...oneReport().parameters[0],
      id: 'report_1-0',
      trend: '↓ 0.8 since last',
      trendPoints: [0, 1],
    },
  ]);
});

verify('a test the history has never seen is a first reading', () => {
  const [card] = cardParameters(oneReport(), {});

  assert.equal(card.trend, '');
  assert.deepEqual(card.trendPoints, [0.5]);
});

verify('a status the app can draw is kept; anything else reads as in range', () => {
  assert.equal(toStatus('low'), 'low');
  assert.equal(toStatus(' High '), 'high');
  assert.equal(toStatus('NORMAL'), 'normal');
  assert.equal(toStatus('borderline'), 'normal');
  assert.equal(toStatus(''), 'normal');
  assert.equal(toStatus(undefined), 'normal');
});

verify('the subtitle counts the results and says when they were read', () => {
  const today = new Date(2026, 9, 18, 9).getTime();

  assert.equal(reportsSubtitle(null, 0), 'No report yet');
  assert.equal(reportsSubtitle(oneReport(), 0), 'No report yet');
  assert.equal(reportsSubtitle(oneReport(), 1), '1 parameter · updated today');
  assert.equal(
    reportsSubtitle(oneReport({ takenAt: new Date(2026, 9, 17, 22).getTime() }), 3),
    '3 parameters · updated yesterday',
  );
});

verify('days are counted from midnight, not in twenty-four hour blocks', () => {
  const now = new Date(2026, 9, 18, 7).getTime();

  // 22:00 last night is nine hours ago, and yesterday.
  assert.equal(updatedLabel(new Date(2026, 9, 17, 22).getTime(), now), 'updated yesterday');
  // 23:00 the night before that is thirty-two hours ago, and two days.
  assert.equal(updatedLabel(new Date(2026, 9, 16, 23).getTime(), now), 'updated 2 days ago');
  assert.equal(updatedLabel(new Date(2026, 9, 13, 7).getTime(), now), 'updated 5 days ago');
});

verify('an old report is dated rather than counted', () => {
  const now = new Date(2026, 9, 18, 9).getTime();

  assert.equal(updatedLabel(new Date(2026, 8, 4, 10).getTime(), now), 'updated on 4 Sep');
});

console.log(results.join('\n'));
console.log(`\n${results.length - failures}/${results.length} checks passed`);

process.exit(failures === 0 ? 0 : 1);
