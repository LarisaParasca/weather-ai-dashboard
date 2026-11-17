import { AppError, fetchWithTimeout, isRecord } from './http';

const IMAGES_URL = 'https://api.openai.com/v1/images/generations';

/** Never gpt-image-1: OpenAI shut it down on 2026-10-23. gpt-image-2 is tested against the real API. */
export const DEFAULT_IMAGE_MODEL = 'gpt-image-2';
export const DEFAULT_IMAGE_TIMEOUT_MS = 60_000;

export type ImageConfig = { apiKey: string | null; model: string; timeoutMs: number };

/** Reads image settings from the server environment. Never sent to the browser. */
export function readImageConfig(env: Record<string, string | undefined> = process.env): ImageConfig {
  const timeout = Number(env.IMAGE_TIMEOUT_MS);
  return {
    apiKey: env.OPENAI_API_KEY?.trim() || null,
    model: env.OPENAI_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL,
    timeoutMs: Number.isInteger(timeout) && timeout > 0 ? timeout : DEFAULT_IMAGE_TIMEOUT_MS,
  };
}

/**
 * Calls the OpenAI Images API and returns the image as base64 JPEG.
 * Square, low quality and JPEG keep it fast and cheap.
 * fetchWithTimeout aborts the request (AbortSignal.timeout) after timeoutMs.
 */
export async function generateImage(
  prompt: string,
  { apiKey, model, timeoutMs }: { apiKey: string; model: string; timeoutMs: number },
): Promise<string> {
  const res = await fetchWithTimeout(IMAGES_URL, {
    service: 'image service',
    timeoutMs,
    init: {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'low',
        output_format: 'jpeg',
        output_compression: 85,
      }),
    },
  });

  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) throw mapOpenAIError(res.status, body, model);

  const first = isRecord(body) && Array.isArray(body.data) ? body.data[0] : undefined;
  const b64 = isRecord(first) ? first.b64_json : undefined;
  if (typeof b64 !== 'string' || b64.length === 0) {
    throw new AppError('UPSTREAM_ERROR', 'Unexpected response from the image service. Try again.', 502);
  }
  return b64;
}

const QUOTA_CODES = new Set([
  'insufficient_quota',
  'credit_balance_exhausted',
  'organization_spend_limit_exceeded',
  'project_spend_limit_exceeded',
  'organization_usage_limit_exceeded',
]);
/** Only these codes mean OpenAI's safety system refused the prompt. */
const REFUSAL_CODES = new Set(['moderation_blocked', 'content_policy_violation']);

/** Keeps a code/param only if it is a short plain identifier, so nothing odd reaches the browser. */
function safeToken(value: unknown): string {
  return typeof value === 'string' && /^[A-Za-z0-9_.-]{1,64}$/.test(value) ? value : '';
}

/** A short reason built from OpenAI's code and param (never its free-text message). */
function safeReason(code: string, param: string): string {
  if (code && param) return `${code} (${param})`;
  return code || (param ? `invalid ${param}` : '');
}

/**
 * Turns an OpenAI error into a user-facing AppError. The content-policy message
 * is shown only when the error code says it was a safety refusal; the error
 * type alone is not enough (OpenAI uses one type for every bad image request).
 * OpenAI's own message is logged on the server but never sent to the browser.
 */
export function mapOpenAIError(status: number, body: unknown, model: string): AppError {
  const err = isRecord(body) && isRecord(body.error) ? body.error : {};
  const code = safeToken(err.code);
  const type = safeToken(err.type);
  const param = safeToken(err.param);
  console.warn(
    `OpenAI image error: HTTP ${status} code=${code || '-'} type=${type || '-'} param=${param || '-'}`,
    typeof err.message === 'string' ? err.message : '',
  );

  if (REFUSAL_CODES.has(code)) {
    return new AppError(
      'CONTENT_REFUSED',
      'The image model declined this prompt (content policy). Try again, or change one of the locations.',
      422,
    );
  }
  if (status === 401) {
    return new AppError(
      'INVALID_API_KEY',
      'The image provider rejected the API key. Check OPENAI_API_KEY in .env and restart the server.',
      502,
    );
  }
  if (status === 403) {
    return new AppError(
      'NOT_CONFIGURED',
      `This API key is not allowed to use the image model "${model}". The OpenAI organisation may need to be verified.`,
      502,
    );
  }
  if (status === 429) {
    const outOfCredit = QUOTA_CODES.has(code) || QUOTA_CODES.has(type);
    return new AppError(
      'RATE_LIMITED',
      outOfCredit
        ? 'The OpenAI account is out of credit or over its spending limit.'
        : 'Too many image requests right now. Wait a minute and try again.',
      429,
    );
  }
  if (status >= 500) {
    return new AppError('UPSTREAM_ERROR', 'The image provider is having problems. Try again in a moment.', 502);
  }

  // A retired or unknown model can come back as 400 or 404, so look at param/code, not only the status.
  const reason = safeReason(code, param);
  const prefix = `The image provider rejected the request (HTTP ${status})${reason ? `: ${reason}` : ''}.`;
  if (status === 404 || param === 'model' || code.includes('model')) {
    return new AppError('NOT_CONFIGURED', `${prefix} The image model "${model}" may be retired or unknown. Check OPENAI_IMAGE_MODEL in .env.`, 502);
  }
  return new AppError('UPSTREAM_ERROR', prefix, 502);
}
