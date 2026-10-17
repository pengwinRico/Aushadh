/**
 * The calls the app makes to a model — two of them, and both are readings of a photo or a
 * few words into the app's own records.
 *
 * `readMedicine` reads a pack, from a photo or from the name typed in, and answers with the
 * medicine's name, dose, use and the group it belongs to; the user never files a medicine
 * themselves. `readReport` reads a printed laboratory report and answers with every result
 * on it, each with its range, where it sits against that range, and one sentence on what it
 * means for the body.
 *
 * The endpoint is OpenAI-compatible, so the same code talks to a model on this machine
 * (Ollama, LM Studio) or to a hosted one. Every part of the address — the base URL, the
 * model and the key — comes from `.env` (see `.env.example`) unless the user typed one
 * into Settings, which wins. That is what lets a build with no endpoint at all be pointed
 * at one without a rebuild. A call that fails throws with a message the form can show;
 * nothing is written to the store.
 */
// Relative on purpose: `scripts/check-parse.mjs` loads this module through Node, which
// knows nothing of `tsconfig` paths — the sibling import is the one the app and the check
// can both read.
import { toStatus, type ReportParameter } from './reports.ts';

export type MedicineReading = {
  name: string;
  dose: string;
  /** Plain-language description of what the medicine does. */
  purpose: string;
  /** The group it belongs to — a name, not an id; the store derives the id. */
  category: string;
};

/**
 * What the app knows about where the model is. Anything typed into Settings arrives here;
 * an empty value falls back to what the app was built with, and the key is optional
 * because a model on this machine does not ask for one.
 */
export type AiConfig = {
  baseUrl?: string;
  model?: string;
  apiKey?: string;
};

export type ReadMedicineInput = {
  /** What the user typed, if anything. */
  name?: string;
  /** The pack photo as a JPEG data URL, if one was taken. */
  photo?: string;
  /** The groups already on the shelf, so the model reuses them instead of inventing one. */
  groups?: string[];
  /** The address, the model and the key, as Settings holds them. */
  config?: AiConfig;
};

/** What a report read is asked for: the photo, and nothing else. */
export type ReadReportInput = {
  /** The report photo as a JPEG data URL. */
  photo: string;
  /** The address, the model and the key, as Settings holds them. */
  config?: AiConfig;
};

/** A local model can take a while to think; a request that never lands is worse. */
const TIMEOUT_MS = 60_000;

/** Read a medicine pack: one request, one JSON answer. */
export async function readMedicine({
  name = '',
  photo,
  groups = [],
  config,
}: ReadMedicineInput): Promise<MedicineReading> {
  const answer = await ask({
    brief: instructions(groups),
    question: question({ name: name.trim(), photo }),
    config,
  });

  return parseReading(answer);
}

/** Read a printed lab report: one request, one JSON answer, one entry per result. */
export async function readReport({ photo, config }: ReadReportInput): Promise<ReportParameter[]> {
  const answer = await ask({
    brief: REPORT_BRIEF,
    question: reportQuestion(photo),
    config,
  });

  return parseReport(answer);
}

/**
 * One request to the model, and the answer's text — the part both readings share.
 *
 * A failing call is a sentence the form can show, never a half-written record: the address
 * a request would use, the abort, the status code and a payload in a shape the app cannot
 * read all end up as errors here, and `parseReading`/`parseReport` refuse the rest.
 */
async function ask({
  brief,
  question,
  config,
}: {
  brief: string;
  question: unknown;
  config?: AiConfig;
}) {
  const { url, model, apiKey } = endpoint(config);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(`${url}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: 'system', content: brief },
          { role: 'user', content: question },
        ],
      }),
      signal: controller.signal,
    });
  } catch {
    throw new Error(
      controller.signal.aborted
        ? 'The AI took too long to answer. Try again.'
        : 'The AI could not be reached. Check the endpoint in your .env file.',
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`The AI endpoint answered ${response.status}. Nothing was saved.`);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: unknown } }[];
  };
  const answer = payload.choices?.[0]?.message?.content;

  if (typeof answer !== 'string') {
    throw new Error('The AI answered in a form the app could not read. Nothing was saved.');
  }

  return answer;
}

/**
 * A URL typed by hand may arrive with a trailing slash, or as the whole call address
 * copied from a provider's page. Both are stripped, so either shape can be pasted in.
 */
export function normaliseBaseUrl(value: string | undefined) {
  return (value ?? '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/chat\/completions$/i, '')
    .replace(/\/+$/, '');
}

/** A hand-typed endpoint has to be one the app can post to; empty means "use the build's". */
export function isUsableBaseUrl(value: string) {
  const url = normaliseBaseUrl(value);

  return url === '' || /^https?:\/\/\S+$/i.test(url);
}

/** Where the model lives: what Settings holds first, then what the app was built with. */
function configured(config: AiConfig = {}) {
  const url =
    normaliseBaseUrl(config.baseUrl) || normaliseBaseUrl(process.env.EXPO_PUBLIC_AI_BASE_URL);
  const model = (config.model ?? '').trim() || (process.env.EXPO_PUBLIC_AI_MODEL ?? '').trim();

  return url && model ? { url, model } : null;
}

/**
 * The endpoint a call uses: the address, the model and the key, each taken from Settings
 * when it holds one and from the build when it does not.
 */
function endpoint(config?: AiConfig) {
  const setup = configured(config);

  if (!setup) {
    throw new Error(
      'No AI is set up yet. Add an endpoint and a model in Settings, or build the app with EXPO_PUBLIC_AI_BASE_URL and EXPO_PUBLIC_AI_MODEL.',
    );
  }

  const apiKey =
    (config?.apiKey ?? '').trim() || (process.env.EXPO_PUBLIC_AI_API_KEY ?? '').trim();

  return { ...setup, apiKey };
}

/** What the app was built with — the values a Settings screen shows as the fallback. */
export function builtInAi() {
  return {
    baseUrl: normaliseBaseUrl(process.env.EXPO_PUBLIC_AI_BASE_URL),
    model: (process.env.EXPO_PUBLIC_AI_MODEL ?? '').trim(),
    /** True when the build shipped a key, which one typed in Settings replaces. */
    hasKey: Boolean((process.env.EXPO_PUBLIC_AI_API_KEY ?? '').trim()),
  };
}

/**
 * Where a call would go with these settings, for the panel to print. `ready` stays false
 * until an endpoint and a model are known from one place or the other — a key is optional,
 * because a model on this machine does not ask for one.
 */
export function aiSetup(config: AiConfig = {}) {
  const setup = configured(config);

  return {
    ready: setup !== null,
    /** The whole address the form would post to, empty until both halves are known. */
    callUrl: setup ? `${setup.url}/chat/completions` : '',
  };
}

/**
 * The model's brief: name the medicine, say what it is for, and file it under a group —
 * preferring a group that is already on the shelf, so the cabinet does not fill up with
 * near-duplicates.
 */
function instructions(groups: string[]) {
  return [
    'You read medicine packs for a personal medicine cabinet. Answer with JSON only:',
    '{"name": "...", "dose": "...", "purpose": "...", "category": "..."}',
    '',
    'name: the medicine as printed on the pack, without the strength or the form.',
    'dose: the strength and form, such as "500 mg" or "10 ml". Empty when it is not visible.',
    'purpose: one short sentence in everyday words saying what the medicine is used for.',
    'No advice, no warnings, no dosage instructions.',
    'category: the group it belongs to, as a short everyday name of two or three words,',
    'such as "Fever & Pain" or "Vitamins".',
    groups.length
      ? `Prefer one of the groups already in the cabinet: ${groups.join(', ')}.`
      : '',
    'If there is no medicine pack here, answer with every field empty.',
  ]
    .filter(Boolean)
    .join('\n');
}

/** The pack photo when there is one, the typed name either way. */
function question({ name, photo }: { name: string; photo?: string }) {
  if (!photo) {
    return `The medicine is called "${name}". What is it for, and which group does it belong to?`;
  }

  return [
    {
      type: 'text',
      text: name
        ? `Read this pack. The label is said to be "${name}".`
        : 'Read this medicine pack.',
    },
    { type: 'image_url', image_url: { url: photo } },
  ];
}

/**
 * The model's brief for a report: every result on the paper, each with the range it was
 * printed against, where it sits in that range, and one sentence on what it measures — the
 * insight is the point, because a number on its own says nothing about the body.
 */
const REPORT_BRIEF = [
  'You read printed laboratory reports into a personal health record. Answer with JSON only:',
  '{"parameters": [{"name": "...", "value": "...", "unit": "...", "referenceRange": "...", "status": "normal", "insight": "..."}]}',
  '',
  'name: the test as printed, such as "Hemoglobin" or "LDL cholesterol".',
  'value: the measured number as printed, without the unit.',
  'unit: the unit as printed, such as "g/dL" or "mg/dL". Empty when none is printed.',
  'referenceRange: the range as printed, such as "12.0–15.5" or "under 130". Empty when none is printed.',
  'status: "low", "normal" or "high" — where the value sits against that range.',
  'insight: one short sentence in everyday words saying what this measures and how it connects to the body.',
  'List every result on the report, in the order it is printed.',
  'No diagnosis, no advice, no warnings.',
  'If there is no laboratory report here, answer {"parameters": []}.',
].join('\n');

/** The report photo, which is the whole question. */
function reportQuestion(photo: string) {
  return [
    { type: 'text', text: 'Read every result on this lab report.' },
    { type: 'image_url', image_url: { url: photo } },
  ];
}

/**
 * Every well-formed `{...}` in the answer, in the order they appear, braces inside strings
 * left alone. A model that thinks out loud before answering — Gemma brackets its reasoning in
 * `<thought>`, prose and all — can put braces of its own ahead of the reading.
 */
function objects(answer: string) {
  const found: string[] = [];

  for (let start = answer.indexOf('{'); start !== -1; start = answer.indexOf('{', start + 1)) {
    let depth = 0;
    let quoted = false;
    let escaped = false;

    for (let i = start; i < answer.length; i++) {
      const char = answer[i];

      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = !quoted;
      else if (quoted) continue;
      else if (char === '{') depth++;
      else if (char === '}') {
        depth--;
        if (depth === 0) {
          found.push(answer.slice(start, i + 1));
          break;
        }
      }
    }
  }

  return found;
}

/**
 * Read the model's answer. Small models wrap their JSON in prose or a code fence, and a
 * thinking model reasons ahead of it, so every object in the answer is tried and the last one
 * that names a medicine is the reading — the answer is written after the reasoning.
 */
export function parseReading(answer: string): MedicineReading {
  const candidates = objects(answer)
    .map((candidate) => {
      try {
        const parsed: unknown = JSON.parse(candidate);

        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)
          : null;
      } catch {
        return null;
      }
    })
    .filter((parsed) => parsed !== null);

  if (!candidates.length) {
    throw new Error('The AI did not answer with a medicine. Try a clearer photo.');
  }

  const named = (parsed: Record<string, unknown>) =>
    typeof parsed.name === 'string' && parsed.name.trim() !== '';
  const parsed = [...candidates].reverse().find(named) ?? candidates[candidates.length - 1];

  const field = (key: keyof MedicineReading) => {
    const value = parsed[key];

    return typeof value === 'string' ? value.trim() : '';
  };

  const name = field('name');

  if (!name) {
    throw new Error('The AI could not read a medicine here. Try a clearer photo.');
  }

  return {
    name,
    dose: field('dose'),
    purpose: field('purpose'),
    // An empty group is no answer; the store files those under `OTHER_CATEGORY`.
    category: field('category'),
  };
}

/**
 * Read the model's answer to a report. Same tolerance as a medicine reading — prose, a code
 * fence and a `<thought>` block are all skipped — but the answer is a *list*, so the last
 * object that carries one is the reading, and entries that name nothing are dropped rather
 * than refused: one unreadable row on the paper should not cost the other eleven.
 */
export function parseReport(answer: string): ReportParameter[] {
  const lists = objects(answer)
    .map((candidate) => {
      try {
        const parsed: unknown = JSON.parse(candidate);

        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>).parameters
          : null;
      } catch {
        return null;
      }
    })
    .filter((list): list is unknown[] => Array.isArray(list));

  const parameters = (lists.at(-1) ?? [])
    .map(parameterFrom)
    .filter((parameter): parameter is ReportParameter => parameter !== null);

  if (!parameters.length) {
    throw new Error('The AI did not find any results on this report. Try a clearer photo.');
  }

  return parameters;
}

/** One entry of that list, or `null` when it names no test at all. */
function parameterFrom(entry: unknown): ReportParameter | null {
  if (!entry || typeof entry !== 'object') return null;

  const fields = entry as Record<string, unknown>;
  const text = (key: string) => {
    const value = fields[key];

    return typeof value === 'string' ? value.trim() : '';
  };
  const name = text('name');

  if (!name) return null;

  return {
    name,
    value: text('value'),
    unit: text('unit'),
    // `referenceRange` is what the brief asks for; `range` is the other word models reach
    // for, and there is no reading to lose by accepting it.
    referenceRange: text('referenceRange') || text('range'),
    status: toStatus(fields.status),
    insight: text('insight') || text('note'),
  };
}
