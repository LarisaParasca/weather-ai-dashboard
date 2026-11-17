import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_IMAGE_MODEL, generateImage, readImageConfig } from './openaiImage';

const config = { apiKey: 'sk-test-key', model: 'gpt-image-2', timeoutMs: 1000 };

/** A fake OpenAI error response. `message` is a secret-looking string that must never reach the user. */
function openAIError(status: number, error: { code?: string | null; type?: string; param?: string | null }) {
  return Response.json({ error: { message: 'INTERNAL DETAIL sk-abc***xyz', param: null, ...error } }, { status });
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('generateImage', () => {
  it('sends a fast, cheap request and returns the base64 image', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: [{ b64_json: 'aGVsbG8=' }] }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(generateImage('a prompt', config)).resolves.toBe('aGVsbG8=');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/images/generations');
    expect(init.headers.Authorization).toBe('Bearer sk-test-key');
    expect(JSON.parse(init.body)).toMatchObject({
      model: 'gpt-image-2',
      prompt: 'a prompt',
      n: 1,
      size: '1024x1024',
      quality: 'low',
      output_format: 'jpeg',
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  const cases: [string, Response, { code: string; status: number; message: RegExp }][] = [
    [
      'invalid key (401)',
      openAIError(401, { code: 'invalid_api_key', type: 'invalid_request_error' }),
      { code: 'INVALID_API_KEY', status: 502, message: /rejected the API key/ },
    ],
    [
      'content-policy refusal (moderation_blocked)',
      openAIError(400, { code: 'moderation_blocked', type: 'image_generation_user_error' }),
      { code: 'CONTENT_REFUSED', status: 422, message: /declined this prompt/ },
    ],
    [
      'content-policy refusal (older content_policy_violation code)',
      openAIError(400, { code: 'content_policy_violation', type: 'invalid_request_error' }),
      { code: 'CONTENT_REFUSED', status: 422, message: /declined this prompt/ },
    ],
    [
      'rate limit (429)',
      openAIError(429, { code: 'rate_limit_exceeded', type: 'requests' }),
      { code: 'RATE_LIMITED', status: 429, message: /Too many image requests/ },
    ],
    [
      'out of credit (429 credit_balance_exhausted)',
      openAIError(429, { code: 'credit_balance_exhausted', type: 'insufficient_quota' }),
      { code: 'RATE_LIMITED', status: 429, message: /out of credit/ },
    ],
    [
      'out of credit (429 with only type insufficient_quota)',
      openAIError(429, { code: null, type: 'insufficient_quota' }),
      { code: 'RATE_LIMITED', status: 429, message: /out of credit/ },
    ],
    [
      'organisation not verified / no access (403)',
      openAIError(403, { type: 'invalid_request_error' }),
      { code: 'NOT_CONFIGURED', status: 502, message: /not allowed to use the image model "gpt-image-2"/ },
    ],
    [
      'unknown model (404)',
      openAIError(404, { code: 'model_not_found', type: 'invalid_request_error' }),
      { code: 'NOT_CONFIGURED', status: 502, message: /OPENAI_IMAGE_MODEL/ },
    ],
    [
      'retired model (400 invalid_value on param model, e.g. gpt-image-1)',
      openAIError(400, { code: 'invalid_value', type: 'image_generation_user_error', param: 'model' }),
      {
        code: 'NOT_CONFIGURED',
        status: 502,
        message: /^The image provider rejected the request \(HTTP 400\): invalid_value \(model\)\. .*OPENAI_IMAGE_MODEL/,
      },
    ],
    [
      'other 400 with the image error type is NOT a content refusal',
      openAIError(400, { code: 'invalid_value', type: 'image_generation_user_error', param: 'quality' }),
      { code: 'UPSTREAM_ERROR', status: 502, message: /^The image provider rejected the request \(HTTP 400\): invalid_value \(quality\)\.$/ },
    ],
    [
      '400 with the image error type and no code is NOT a content refusal',
      openAIError(400, { code: null, type: 'image_generation_user_error' }),
      { code: 'UPSTREAM_ERROR', status: 502, message: /^The image provider rejected the request \(HTTP 400\)\.$/ },
    ],
    [
      'unsafe code text is dropped from the reason',
      openAIError(400, { code: '<script>alert(1)</script>', type: 'invalid_request_error' }),
      { code: 'UPSTREAM_ERROR', status: 502, message: /^The image provider rejected the request \(HTTP 400\)\.$/ },
    ],
    [
      'provider outage (503)',
      openAIError(503, { code: 'server_is_overloaded', type: 'service_unavailable_error' }),
      { code: 'UPSTREAM_ERROR', status: 502, message: /having problems/ },
    ],
    [
      'other bad request (400)',
      openAIError(400, { code: 'invalid_value', type: 'invalid_request_error' }),
      { code: 'UPSTREAM_ERROR', status: 502, message: /rejected the request \(HTTP 400\): invalid_value\./ },
    ],
    [
      'success without an image',
      Response.json({ data: [] }),
      { code: 'UPSTREAM_ERROR', status: 502, message: /Unexpected response/ },
    ],
    [
      'non-JSON error page',
      new Response('<html>Bad gateway</html>', { status: 502 }),
      { code: 'UPSTREAM_ERROR', status: 502, message: /having problems/ },
    ],
  ];

  it.each(cases)('maps %s', async (_name, response, expected) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    const err = await generateImage('a prompt', config).catch((e: unknown) => e);
    expect(err).toMatchObject({ code: expected.code, status: expected.status });
    expect((err as Error).message).toMatch(expected.message);
    expect((err as Error).message).not.toContain('INTERNAL DETAIL'); // OpenAI's own message stays on the server
    if (expected.code !== 'CONTENT_REFUSED') expect((err as Error).message).not.toMatch(/content policy/);
  });

  it('maps a timeout to UPSTREAM_TIMEOUT (504)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('timed out', 'TimeoutError')));
    await expect(generateImage('a prompt', config)).rejects.toMatchObject({
      code: 'UPSTREAM_TIMEOUT',
      status: 504,
      message: 'The image service did not respond in time. Try again.',
    });
  });
});

describe('readImageConfig', () => {
  it('uses defaults when only the key is set', () => {
    expect(readImageConfig({ OPENAI_API_KEY: ' sk-x ' })).toEqual({
      apiKey: 'sk-x',
      model: DEFAULT_IMAGE_MODEL,
      timeoutMs: 60_000,
    });
  });

  it('treats an empty key as missing', () => {
    expect(readImageConfig({ OPENAI_API_KEY: '  ' }).apiKey).toBeNull();
    expect(readImageConfig({}).apiKey).toBeNull();
  });

  it('reads the model and timeout, ignoring an invalid timeout', () => {
    expect(readImageConfig({ OPENAI_IMAGE_MODEL: 'gpt-image-2.6-flare', IMAGE_TIMEOUT_MS: '90000' })).toMatchObject({
      model: 'gpt-image-2.6-flare',
      timeoutMs: 90_000,
    });
    expect(readImageConfig({ IMAGE_TIMEOUT_MS: 'soon' }).timeoutMs).toBe(60_000);
    expect(readImageConfig({ IMAGE_TIMEOUT_MS: '-5' }).timeoutMs).toBe(60_000);
  });
});
