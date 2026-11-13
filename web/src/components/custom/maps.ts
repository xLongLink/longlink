import { z } from 'zod';
import * as topojson from 'topojson-client';
import type { FeatureCollection, Geometry } from 'geojson';

const position = z.array(z.number()).min(2);

const ring = z.array(position).min(4);

const polygon = z.array(ring);

const properties = z.record(z.string(), z.json()).nullable().optional();

const identity = { id: z.union([z.string(), z.number()]).optional(), properties };

const geometry = z.discriminatedUnion('type', [
    z.object({ type: z.literal('Polygon'), coordinates: polygon }),
    z.object({ type: z.literal('MultiPolygon'), coordinates: z.array(polygon) })
]);

const topologyGeometry = z.discriminatedUnion('type', [
    z.object({ type: z.literal('Polygon'), arcs: z.array(z.array(z.number().int())), ...identity }),
    z.object({ type: z.literal('MultiPolygon'), arcs: z.array(z.array(z.array(z.number().int()))), ...identity })
]);

const topologyObject = z.union([
    topologyGeometry,
    z.object({ type: z.literal('GeometryCollection'), geometries: z.array(topologyGeometry) })
]);

const mapDataSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('FeatureCollection'),
        features: z.array(z.object({ type: z.literal('Feature'), geometry, ...identity }))
    }),
    z.object({
        type: z.literal('Topology'),
        objects: z.record(z.string(), topologyObject),
        arcs: z.array(z.array(position)),
        transform: z
            .object({ scale: z.tuple([z.number(), z.number()]), translate: z.tuple([z.number(), z.number()]) })
            .optional()
    })
]);

export type MapData = z.infer<ReturnType<typeof z.json>>;

export type MapProperties = Record<string, MapData>;

export type MapFeatures = FeatureCollection<Geometry, MapProperties | null>;

export type MapResult = { status: 'ready'; data: MapFeatures } | { status: 'invalid' };

/** Validates polygon boundaries and converts the chosen TopoJSON object to GeoJSON. */
export function prepareMap(geography: MapData, objectName?: string): MapResult {
    const parsed = mapDataSchema.safeParse(geography);

    if (!parsed.success) return { status: 'invalid' };
    const data = parsed.data;

    if (data.type === 'FeatureCollection') {
        return {
            status: 'ready',
            data: {
                ...data,
                features: data.features.map((feature) => ({ ...feature, properties: feature.properties ?? null }))
            }
        };
    }

    // A topology can contain multiple layers; select one explicitly or use its first object.
    const object = data.objects[objectName ?? Object.keys(data.objects)[0]];

    if (!object) {
        return Object.keys(data.objects).length
            ? { status: 'invalid' }
            : { status: 'ready', data: { type: 'FeatureCollection', features: [] } };
    }

    try {
        const converted = topojson.feature<MapProperties | null>(data, object);

        return {
            status: 'ready',
            data:
                converted.type === 'FeatureCollection'
                    ? converted
                    : { type: 'FeatureCollection', features: [converted] }
        };
    } catch {
        return { status: 'invalid' };
    }
}
