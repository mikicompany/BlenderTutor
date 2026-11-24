// AI action-item extraction with Claude. Loaded on demand by app.js.
import { Anthropic } from './vendor/anthropic-sdk.js';

const SYSTEM = `You turn spoken voice notes into a clean to-do list.

The transcript comes from speech recognition, so expect missing punctuation, misheard words, filler ("um", "like", "you know"), false starts and self-corrections ("call Tom, no wait, call Jim"). Infer what the speaker meant.

Rules:
- Capture everything substantive the speaker said. Every task, commitment, reminder, follow-up, decision to act, or idea worth acting on becomes an item. If a statement is information rather than a task, turn it into the natural follow-up (e.g. "the budget is 40k" -> "Plan around the 40k budget"). Drop only filler, greetings and pure chit-chat.
- One item per distinct action. Split run-on sentences that contain several actions; merge repeated mentions of the same action into one item.
- Write each item as a short imperative starting with a verb, in the speaker's language. Keep names, numbers, places and specifics. No trailing period.
- Apply self-corrections: keep only the corrected version.
- Do not repeat anything already on the user's open list. If the transcript only restates an existing item, leave it out.
- due: the deadline or time as the speaker said it, made concrete when obvious ("Friday", "tomorrow 3pm", "end of month"); empty string if none.
- priority: "high" if the speaker signals urgency or importance ("urgent", "asap", "critical", "first thing"), "low" if they say it's optional or someday, otherwise "normal".`;

const SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          due: { type: 'string' },
          priority: { type: 'string', enum: ['high', 'normal', 'low'] },
        },
        required: ['text', 'due', 'priority'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
};

let cached = { key: null, client: null };
function clientFor(apiKey) {
  if (cached.key !== apiKey) {
    // The key belongs to the phone's owner and never leaves their device except
    // to api.anthropic.com, which is why browser use is allowed here.
    cached = {
      key: apiKey,
      client: new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 2, timeout: 90_000 }),
    };
  }
  return cached.client;
}

/**
 * @param {string} apiKey
 * @param {string} transcript
 * @param {string[]} openItems  texts already on the list, to avoid duplicates
 * @returns {Promise<{text:string, due:string, priority:'high'|'normal'|'low'}[]>}
 */
export async function organize(apiKey, transcript, openItems) {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const list = openItems.length ? openItems.map(t => `- ${t}`).join('\n') : '(empty)';

  const response = await clientFor(apiKey).beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: {
      effort: 'low', // short extraction task; keeps the phone UI snappy
      format: { type: 'json_schema', schema: SCHEMA },
    },
    system: SYSTEM,
    messages: [{
      role: 'user',
      content: `Today is ${today}.\n\nAlready on my open list:\n${list}\n\n<transcript>\n${transcript}\n</transcript>`,
    }],
  });

  if (response.stop_reason === 'refusal') throw new AIError('The AI declined this transcript');
  if (response.stop_reason === 'max_tokens') throw new AIError('Transcript too long for one pass');
  const block = response.content.find(b => b.type === 'text');
  if (!block) throw new AIError('Empty AI response');
  const parsed = JSON.parse(block.text);
  return parsed.items
    .map(i => ({ text: i.text.trim(), due: i.due.trim(), priority: i.priority }))
    .filter(i => i.text);
}

export class AIError extends Error {}

/** Short, user-facing reason for a failure. */
export function describeError(err) {
  if (err instanceof AIError) return err.message;
  if (err instanceof Anthropic.AuthenticationError) return 'API key was rejected — check it in Settings';
  if (err instanceof Anthropic.PermissionDeniedError) return 'This API key lacks access to the model';
  if (err instanceof Anthropic.RateLimitError) return 'Rate limited — try again in a moment';
  if (err instanceof Anthropic.APIConnectionError) return 'Couldn’t reach the AI';
  if (err instanceof Anthropic.APIError) return `AI error ${err.status ?? ''}`.trim();
  return 'AI unavailable';
}
