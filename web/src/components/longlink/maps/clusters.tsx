import { useMemo } from 'react';
import { MapCanvas } from './canvas';
import { coordinateError } from './data';
import * as mapcn from '@/components/mapcn/map';
import type { MapMarker, MapOptions } from './types';
import type { FeatureCollection, Point } from 'geojson';

/** Groups nearby locations on the map and expands clusters when activated. */
export function ClusterMap({
    data,
    onSelect,
    radius = 50,
    ...props
}: MapOptions & { data: readonly MapMarker[]; radius?: number; onSelect?: (marker: MapMarker) => void }) {
    const error =
        coordinateError(data.map((marker) => marker.coordinates)) ??
        (!Number.isFinite(radius) || radius <= 0 ? 'Cluster radius must be positive.' : undefined);

    return (
        <MapCanvas {...props} empty={!data.length} error={error}>
            <ClusterLayer data={data} radius={radius} onSelect={onSelect} interactive={props.interactive} />
        </MapCanvas>
    );
}

/** Renders clustered locations inside an existing map. */
export function ClusterLayer({
    data,
    onSelect,
    radius = 50,
    interactive = true
}: {
    data: readonly MapMarker[];
    radius?: number;
    onSelect?: (marker: MapMarker) => void;
    interactive?: boolean;
}) {
    const points = useMemo<FeatureCollection<Point, { id: string }>>(
        () => ({
            type: 'FeatureCollection',
            features: data.map((marker) => ({
                type: 'Feature',
                properties: { id: marker.id },
                geometry: { type: 'Point', coordinates: marker.coordinates }
            }))
        }),
        [data]
    );
    return (
        <mapcn.MapClusterLayer
            key={radius}
            data={points}
            clusterRadius={radius}
            onPointClick={(feature) => {
                const marker = data.find((location) => location.id === feature.properties.id);
                if (marker && interactive) onSelect?.(marker);
            }}
            onClusterClick={interactive ? undefined : () => {}}
        />
    );
}
