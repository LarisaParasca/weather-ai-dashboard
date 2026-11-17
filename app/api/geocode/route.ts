import type { NextRequest } from 'next/server';
import { AppError, errorResponse } from '@/lib/http';
import { searchPlaces } from '@/lib/openMeteo';
import { MIN_QUERY_LENGTH, parseQuery } from '@/lib/validate';

/** GET /api/geocode?q=Springfield → { results: Location[] } (empty array = no match) */
export async function GET(request: NextRequest) {
  // Read outside the try: during prerendering Next throws an internal signal here
  // to mark this route dynamic, and our catch must not swallow it.
  const params = request.nextUrl.searchParams;
  try {
    const query = parseQuery(params.get('q'));
    if (!query) {
      throw new AppError('BAD_REQUEST', `Type at least ${MIN_QUERY_LENGTH} characters to search.`, 400);
    }
    return Response.json({ results: await searchPlaces(query) });
  } catch (err) {
    return errorResponse(err);
  }
}
