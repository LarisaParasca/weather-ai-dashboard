import { AppError, errorResponse } from '@/lib/http';
import { buildImagePrompt, PANEL_POSITIONS } from '@/lib/imagePrompt';
import { generateImage, readImageConfig } from '@/lib/openaiImage';
import { getWeather } from '@/lib/openMeteo';
import { parseImageRequest } from '@/lib/validate';

/**
 * POST /api/image  { locations: [{ latitude, longitude }] x4, in slot order }
 *   → { prompt, image }   (image = base64 JPEG)
 * The weather is fetched here on the server, so every number in the prompt
 * comes straight from Open-Meteo and cannot be changed by the browser.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  let prompt: string | undefined;

  try {
    const coords = parseImageRequest(body, PANEL_POSITIONS.length);
    if (!coords) {
      throw new AppError('BAD_REQUEST', 'Add 4 locations before generating an image.', 400);
    }

    const { apiKey, model, timeoutMs } = readImageConfig();
    if (!apiKey) {
      throw new AppError(
        'NOT_CONFIGURED',
        'Image generation is not set up: add OPENAI_API_KEY to .env and restart the server.',
        500,
      );
    }

    const weathers = await Promise.all(
      coords.map((c, i) =>
        getWeather(c.latitude, c.longitude).catch((err: unknown) => {
          const reason = err instanceof AppError ? ` ${err.message}` : '';
          throw new AppError(
            err instanceof AppError ? err.code : 'UPSTREAM_ERROR',
            `Couldn't get the weather for the ${PANEL_POSITIONS[i].toLowerCase()} location, so no image was generated.${reason}`,
            err instanceof AppError ? err.status : 502,
          );
        }),
      ),
    );

    prompt = buildImagePrompt(weathers);
    const image = await generateImage(prompt, { apiKey, model, timeoutMs });
    return Response.json({ prompt, image });
  } catch (err) {
    return errorResponse(err, { prompt });
  }
}
