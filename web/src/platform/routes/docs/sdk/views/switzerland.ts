import { z } from 'zod';
import cantons from './switzerland.json';

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

const geographySchema = z.object({
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

export const switzerland = geographySchema.parse(cantons);
export const switzerlandAttribution = cantons.attribution;
