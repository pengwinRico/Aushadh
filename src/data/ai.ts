/**
 * The one call the app makes to a model: read a medicine pack — from a photo, or from the
 * name typed in — and answer with the medicine's name, dose, use and the group it belongs
 * to. The user never files a medicine themselves; the model names the group, and
 * `insertMedicine` creates it.
 *
 * The endpoint is OpenAI-compatible, so the same code talks to a model on this machine
 * (Ollama, LM Studio) or to a hosted one. It is configured with `.env` — see `.env.example`
 * — and nothing about it is stored. A call that fails throws with a message the form can
 * show; nothing is written to the cabinet.
 */
export type MedicineReading = {
  name: string;
  dose: string;
  /** Plain-language description of what the medicine does. */
  purpose: string;
  /** The group it belongs to — a name, not an id; the store derives the id. */
  category: string;
};

export type ReadMedicineInput = {
  /** What the user typed, if anything. */
  name?: string;
  /** The pack photo as a JPEG data URL, if one was taken. */
  photo?: string;
  /** The groups already on the shelf, so the model reuses them instead of inventing one. */
  groups?: string[];
};

/** A local model can take a while to think; a request that never lands is worse. */
const TIMEOUT_MS = 60_000;

/** Read a medicine pack: one request, one JSON answer. */
export async function readMedicine({
  name = '',
  photo,
  groups = [],
}: ReadMedicineInput): Promise<MedicineReading> {
  const { url, model, apiKey } = endpoint();
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
          { role: 'system', content: instructions(groups) },
          { role: 'user', content: question({ name: name.trim(), photo }) },
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
    throw new Error(`The AI endpoint answered ${response.status}. Nothing was added.`);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: unknown } }[];
  };
  const answer = payload.choices?.[0]?.message?.content;

  if (typeof answer !== 'string') {
    throw new Error('The AI answered in a form the app could not read. Nothing was added.');
  }

  return parseReading(answer);
}

/** The endpoint from `.env`, checked here so a missing setting reads as a sentence. */
function endpoint() {
  const url = process.env.EXPO_PUBLIC_AI_BASE_URL?.replace(/\/+$/, '');
  const model = process.env.EXPO_PUBLIC_AI_MODEL;
  const apiKey = process.env.EXPO_PUBLIC_AI_API_KEY;

  if (!url || !model) {
    throw new Error('No AI is set up yet. Add EXPO_PUBLIC_AI_BASE_URL and EXPO_PUBLIC_AI_MODEL to your .env file.');
  }

  return { url, model, apiKey };
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
    'category: the group it belongs to, as a short everyday name.',
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
 * Read the model's answer. Small models sometimes wrap their JSON in prose or a code
 * fence, so the object is cut out of the answer rather than parsed whole.
 */
export function parseReading(answer: string): MedicineReading {
  const start = answer.indexOf('{');
  const end = answer.lastIndexOf('}');

  if (start === -1 || end <= start) {
    throw new Error('The AI did not answer with a medicine. Try a clearer photo.');
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(answer.slice(start, end + 1));
  } catch {
    throw new Error('The AI answered in a form the app could not read. Nothing was added.');
  }

  const field = (key: keyof MedicineReading) => {
    const value = (parsed as Record<string, unknown>)[key];

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
