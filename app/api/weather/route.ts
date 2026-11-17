import type { NextRequest } from 'next/server';
import { AppError, errorResponse } from '@/lib/http';
import { getWeather } from '@/lib/openMeteo';
import { parseCoordinate } from '@/lib/validate';

/** GET /api/weather?lat=39.8&lon=-89.6 → { weather: Weather } */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const lat = parseCoordinate(params.get('lat'), 90);
    const lon = parseCoordinate(params.get('lon'), 180);
    if (lat === null || lon === null) {
      throw new AppError('BAD_REQUEST', 'Invalid coordinates for this location.', 400);
    }
    return Response.json({ weather: await getWeather(lat, lon) });
  } catch (err) {
    return errorResponse(err);
  }
}
