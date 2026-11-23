import { z } from 'zod';
import type { MapCoordinate, MapRoute } from './types';

const coordinate = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]).rest(z.number());

/** Rejects nonfinite or out-of-range geographic coordinates before rendering. */
export function coordinateError(coordinates: readonly MapCoordinate[]): string | undefined {
    if (coordinates.some(([longitude, latitude]) => !coordinate.safeParse([longitude, latitude]).success))
        return 'Map coordinates must contain a valid longitude and latitude.';
}

/** Rejects route geometry that cannot form a geographic line. */
export function routeError(routes: readonly MapRoute[]): string | undefined {
    return (
        coordinateError(routes.flatMap((route) => route.coordinates)) ??
        (routes.some((route) => route.coordinates.length < 2) ? 'Routes require at least two coordinates.' : undefined)
    );
}
