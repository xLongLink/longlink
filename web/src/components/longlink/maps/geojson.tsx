import { useMemo } from 'react';
import { MapCanvas } from './canvas';
import { geographySchema } from './data';
import * as mapcn from '@/components/mapcn/map';
import type { MapGeography, MapOptions } from './types';

/** Displays supplied polygon features without fetching caller-provided URLs. */
export function GeoJSONMap({
    data: input,
    onSelect,
    ...props
}: MapOptions & { data: MapGeography; onSelect?: (feature: MapGeography['features'][number]) => void }) {
    const result = useMemo(() => geographySchema.safeParse(input), [input]);

    if (!result.success) return <MapCanvas {...props} error="Invalid polygon GeoJSON data." />;
    const data = result.data;

    return (
        <MapCanvas {...props} empty={!data.features.length}>
            <mapcn.MapGeoJSON
                data={data}
                interactive={props.interactive !== false && Boolean(onSelect)}
                onClick={(event) => {
                    if (event.feature.geometry.type !== 'Polygon' && event.feature.geometry.type !== 'MultiPolygon')
                        return;
                    onSelect?.({
                        type: 'Feature',
                        id: event.feature.id,
                        properties: event.feature.properties,
                        geometry: event.feature.geometry
                    });
                }}
            />
        </MapCanvas>
    );
}
