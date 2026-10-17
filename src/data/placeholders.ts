/**
 * Placeholder content for the three tabs: Reports and Advice still read from here.
 *
 * The values mirror the mocks in `design/` so the three screens read like the real
 * product. A scanned report is not parsed yet, and the advice is not asked of a model yet
 * — swap these modules for real data sources when those land.
 *
 * The domain types live here too: they outlive the samples they were written for.
 *
 * Three things are already real. The first-run name is stored on the device by
 * `src/data/database.ts` and read through `useProfile()`. The medicine groups below are
 * the seed for the cabinet's own tables, written on the first migration — the screen
 * reads the store, not this module. And a medicine is read by the model in
 * `src/data/ai.ts`, which names it, says what it is for and files it under a group.
 */

export type LabStatus = 'low' | 'normal' | 'high';

export type LabParameter = {
  id: string;
  name: string;
  value: string;
  unit: string;
  /** Human-readable reference range, exactly as it appears on the report. */
  referenceRange: string;
  status: LabStatus;
  /** Change since the previous report, e.g. "↓ 0.8 since last". */
  trend: string;
  /** Sparkline shape, oldest first. 0 sits at the top of the plot, 1 at the bottom. */
  trendPoints: readonly number[];
};

export type Medicine = {
  id: string;
  name: string;
  dose: string;
  /** Plain-language description of what the medicine does. */
  purpose: string;
  /** The pack photo kept on the device, empty when there is none. */
  photo: string;
};

/** Which colour the category card uses. Maps to `Colors`, not to a raw hex value. */
export type CategoryTone = 'warning' | 'secondary' | 'tertiary';

export type MedicineCategory = {
  id: string;
  name: string;
  tone: CategoryTone;
  medicines: Medicine[];
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

export const labParameters: LabParameter[] = [
  {
    id: 'hemoglobin',
    name: 'Hemoglobin',
    value: '11.2',
    unit: 'g/dL',
    referenceRange: '12.0–15.5',
    status: 'low',
    trend: '↓ 0.8 since last',
    trendPoints: [0.18, 0.3, 0.42, 0.55, 0.72, 0.88],
  },
  {
    id: 'fasting-glucose',
    name: 'Fasting glucose',
    value: '92',
    unit: 'mg/dL',
    referenceRange: '70–99',
    status: 'normal',
    trend: 'steady',
    trendPoints: [0.44, 0.6, 0.4, 0.56, 0.38, 0.52],
  },
  {
    id: 'ldl-cholesterol',
    name: 'LDL cholesterol',
    value: '214',
    unit: 'mg/dL',
    referenceRange: 'under 130',
    status: 'high',
    trend: '↑ 12 since last',
    trendPoints: [0.84, 0.72, 0.58, 0.46, 0.32, 0.16],
  },
];

/** The cabinet on a first run, until a scanned report can fill the shelf. */
export const medicineCategories: MedicineCategory[] = [
  {
    id: 'fever-pain',
    name: 'Fever & Pain',
    tone: 'warning',
    medicines: [
      {
        id: 'paracetamol',
        name: 'Paracetamol',
        dose: '500 mg',
        purpose: 'Relieves mild pain and lowers fever.',
        photo: '',
      },
      {
        id: 'ibuprofen',
        name: 'Ibuprofen',
        dose: '400 mg',
        purpose: 'Reduces pain, fever and inflammation.',
        photo: '',
      },
    ],
  },
  {
    id: 'antibiotics',
    name: 'Antibiotics',
    tone: 'secondary',
    medicines: [
      {
        id: 'amoxicillin',
        name: 'Amoxicillin',
        dose: '500 mg',
        purpose: 'Treats bacterial infections.',
        photo: '',
      },
    ],
  },
  {
    id: 'blood-pressure',
    name: 'Blood Pressure',
    tone: 'tertiary',
    medicines: [
      {
        id: 'amlodipine',
        name: 'Amlodipine',
        dose: '5 mg',
        purpose: 'Lowers blood pressure.',
        photo: '',
      },
    ],
  },
];

export const healthSummary =
  'Hemoglobin is below range and has fallen since your last report. Glucose looks stable. LDL is high. Ask your doctor about iron and diet.';

export const adviceMessages: ChatMessage[] = [
  { id: 'asked', role: 'user', text: 'Which results are out of range?' },
  {
    id: 'answered',
    role: 'assistant',
    text: 'Hemoglobin (11.2 g/dL) is low and LDL is high. Others are in range.',
  },
];
