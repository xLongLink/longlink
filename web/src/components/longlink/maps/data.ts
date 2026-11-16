import { z } from 'zod';
import type { MapCoordinate, MapRoute } from './types';

const coordinate = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]).rest(z.number());
const ring = z
    .array(coordinate)
    .min(4)
    .refine((points) => {
        const first = points[0];
        const last = points.at(-1);
        return first?.[0] === last?.[0] && first?.[1] === last?.[1];
    });
const polygon = z.array(ring).min(1);

export const geographySchema = z.object({
    type: z.literal('FeatureCollection'),
    features: z.array(
        z.object({
            type: z.literal('Feature'),
            id: z.union([z.string(), z.number()]).optional(),
            properties: z.record(z.string(), z.json()).nullable(),
            geometry: z.discriminatedUnion('type', [
                z.object({ type: z.literal('Polygon'), coordinates: polygon }),
                z.object({ type: z.literal('MultiPolygon'), coordinates: z.array(polygon).min(1) })
            ])
        })
    )
});

/** Rejects nonfinite or out-of-range geographic coordinates before rendering. */
export function coordinateError(coordinates: readonly MapCoordinate[]): string | undefined {
    if (
        coordinates.some(
            ([longitude, latitude]) =>
                !Number.isFinite(longitude) ||
                !Number.isFinite(latitude) ||
                longitude < -180 ||
                longitude > 180 ||
                latitude < -90 ||
                latitude > 90
        )
    )
        return 'Map coordinates must contain a valid longitude and latitude.';
}

/** Rejects route geometry that cannot form a geographic line. */
export function routeError(routes: readonly MapRoute[]): string | undefined {
    return (
        coordinateError(routes.flatMap((route) => route.coordinates)) ??
        (routes.some((route) => route.coordinates.length < 2) ? 'Routes require at least two coordinates.' : undefined)
    );
}
