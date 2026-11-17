import { Box } from '@/components/longlink/layout/box';
import { ArcMap } from '@/components/longlink/maps/arcs';
import { RouteMap } from '@/components/longlink/maps/routes';
import { StreetMap } from '@/components/longlink/maps/street';
import { MarkerMap } from '@/components/longlink/maps/markers';
import { ClusterMap } from '@/components/longlink/maps/clusters';
import type { MapMarker, MapRoute, MapArc, MapOptions } from '@/components/longlink/maps/types';

export type MapName = 'StreetMap' | 'MarkerMap' | 'RouteMap' | 'ClusterMap' | 'ArcMap';

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
const arcs: MapArc[] = locations
    .slice(1)
    .map((location) => ({ id: `zurich-${location.id}`, from: locations[0].coordinates, to: location.coordinates }));
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
        center: [8.23, 46.8],
        zoom: isCompact ? 4.8 : 5.8,
        controls: !isCompact,
        interactive: !isCompact,
        'aria-label': name.replace(/([a-z])([A-Z])/g, '$1 $2')
    } satisfies MapOptions;

    return (
        <Box width="100%" height={height}>
            {name === 'StreetMap' && <StreetMap {...options} />}
            {name === 'MarkerMap' && <MarkerMap {...options} data={locations} />}
            {name === 'RouteMap' && <RouteMap {...options} data={routes} />}
            {name === 'ClusterMap' && <ClusterMap {...options} data={clusterLocations} />}
            {name === 'ArcMap' && <ArcMap {...options} data={arcs} />}
        </Box>
    );
}
