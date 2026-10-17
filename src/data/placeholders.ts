/**
 * What the app still stands in for, and the types that outlive it.
 *
 * Most of the app is real now. The first-run name is stored on the device and read through
 * `useProfile()`; the cabinet reads its own tables; a medicine is read by the model in
 * `src/data/ai.ts`, which names it, says what it is for and files it under a group; and a
 * lab report is read by the same model into the reports store (`src/data/reports.ts`).
 *
 * Two things are still stand-ins, both on the Advice tab and both marked where they are
 * used: the summary is not asked of a model yet (`TODO(summary)`) and neither is a question
 * (`TODO(ask-advice)`). The cabinet's seed is the third: a first run starts with the groups
 * below, and the screen reads the store rather than this module.
 *
 * The types below outlive the samples they were written for — the sample reports are gone,
 * and the cabinet's seed is written into its tables once and never read again.
 */

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

/**
 * The cabinet a first run starts with.
 *
 * `migrate` writes these groups into the cabinet's own tables once, on the first open. The
 * Cabinet tab reads the store, never this — so deleting a medicine here changes nothing
 * about a cabinet that already exists.
 */
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
