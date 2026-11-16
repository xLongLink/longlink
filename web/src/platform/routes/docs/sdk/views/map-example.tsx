import { switzerland } from './switzerland';
import { Box } from '@/components/longlink/layout/box';
import { ArcMap } from '@/components/longlink/maps/arcs';
import { RouteMap } from '@/components/longlink/maps/routes';
import { StreetMap } from '@/components/longlink/maps/street';
import { MarkerMap } from '@/components/longlink/maps/markers';
import { GeoJSONMap } from '@/components/longlink/maps/geojson';
import { ClusterMap } from '@/components/longlink/maps/clusters';
import { SwitzerlandAttribution } from './switzerland-attribution';
import type { MapMarker, MapRoute, MapArc, MapOptions } from '@/components/longlink/maps/types';

export type MapName = 'StreetMap' | 'MarkerMap' | 'RouteMap' | 'ClusterMap' | 'GeoJSONMap' | 'ArcMap';

const locations: MapMarker[] = [
    { id: 'zurich', coordinates: [8.5417, 47.3769], label: 'Zurich', description: 'Main office' },
    { id: 'bern', coordinates: [7.4474, 46.948], label: 'Bern', description: 'Regional office' },
    { id: 'lucerne', coordinates: [8.3093, 47.0502], label: 'Lucerne', description: 'Service center' }
];
const routes: MapRoute[] = [
    {
        id: 'delivery',
        coordinates: [
            [8.5417, 47.3769],
            [8.3093, 47.0502],
            [7.4474, 46.948]
        ]
    }
];
const arcs: MapArc[] = [
    { id: 'zurich-paris', from: [8.5417, 47.3769], to: [2.3522, 48.8566] },
    { id: 'zurich-rome', from: [8.5417, 47.3769], to: [12.4964, 41.9028] }
];
const clusterLocations: MapMarker[] = locations.flatMap((location) =>
    Array.from({ length: 12 }, (_, index) => ({
        id: `${location.id}-${index}`,
        label: `${location.label} ${index + 1}`,
        coordinates: [
            location.coordinates[0] + (index % 4) * 0.025,
            location.coordinates[1] + Math.floor(index / 4) * 0.02
        ]
    }))
);

/** Shares real map examples between component pages and compact catalog previews. */
export function MapExample({
    name,
    height = 320,
    isCompact = false
}: {
    name: MapName;
    height?: number;
    isCompact?: boolean;
}) {
    const options = {
        center: name === 'GeoJSONMap' ? [8.23, 46.8] : name === 'ArcMap' ? [7, 46] : [8.1, 47.2],
        zoom: name === 'GeoJSONMap' ? (isCompact ? 4.8 : 6) : name === 'ArcMap' ? 3.5 : 6.5,
        blank: name === 'GeoJSONMap',
        controls: isCompact
            ? false
            : name === 'GeoJSONMap'
              ? { position: 'top-right', showZoom: true, showCompass: true, showLocate: true, showFullscreen: true }
              : true,
        interactive: !isCompact,
        'aria-label': name === 'GeoJSONMap' ? 'Swiss cantons' : name.replace(/([a-z])([A-Z])/g, '$1 $2')
    } satisfies MapOptions;

    return (
        <div className="flex w-full flex-col gap-2">
            <Box width="100%" height={height}>
                {name === 'StreetMap' && <StreetMap {...options} />}
                {name === 'MarkerMap' && <MarkerMap {...options} data={locations} />}
                {name === 'RouteMap' && <RouteMap {...options} data={routes} />}
                {name === 'ClusterMap' && <ClusterMap {...options} data={clusterLocations} />}
                {name === 'GeoJSONMap' && <GeoJSONMap {...options} data={switzerland} />}
                {name === 'ArcMap' && <ArcMap {...options} data={arcs} />}
            </Box>
            {name === 'GeoJSONMap' && <SwitzerlandAttribution />}
        </div>
    );
}
