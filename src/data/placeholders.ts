/**
 * Placeholder content for the three tabs.
 *
 * The values mirror the mocks in `design/` so the three screens read like the real
 * product. No parsing, storage or model calls happen yet — swap these modules for real
 * data sources when those land.
 *
 * The first-run name is the exception: it is real, stored on the device by
 * `src/data/profile.ts`, and read through `useProfile()`.
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
};

/** Which colour the category card uses. Maps to `Colors`, not to a raw hex value. */
export type CategoryTone = 'warning' | 'secondary' | 'tertiary';

export type MedicineCategory = {
  id: string;
  name: string;
  tone: CategoryTone;
  /** Open on first paint — the design shows the first group expanded. */
  defaultExpanded: boolean;
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

export const medicineCategories: MedicineCategory[] = [
  {
    id: 'fever-and-pain',
    name: 'Fever & Pain',
    tone: 'warning',
    defaultExpanded: true,
    medicines: [
      {
        id: 'paracetamol',
        name: 'Paracetamol',
        dose: '500 mg',
        purpose: 'Relieves mild pain and lowers fever.',
      },
      {
        id: 'ibuprofen',
        name: 'Ibuprofen',
        dose: '400 mg',
        purpose: 'Reduces pain, fever and inflammation.',
      },
    ],
  },
  {
    id: 'antibiotics',
    name: 'Antibiotics',
    tone: 'secondary',
    defaultExpanded: false,
    medicines: [
      {
        id: 'amoxicillin',
        name: 'Amoxicillin',
        dose: '500 mg',
        purpose: 'Treats bacterial infections.',
      },
    ],
  },
  {
    id: 'blood-pressure',
    name: 'Blood Pressure',
    tone: 'tertiary',
    defaultExpanded: false,
    medicines: [
      {
        id: 'amlodipine',
        name: 'Amlodipine',
        dose: '5 mg',
        purpose: 'Lowers blood pressure.',
      },
    ],
  },
];

export const medicines: Medicine[] = medicineCategories.flatMap(
  (category) => category.medicines,
);

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
