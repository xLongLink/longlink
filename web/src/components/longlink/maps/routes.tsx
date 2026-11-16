import { routeError } from './data';
import { MapCanvas } from './canvas';
import * as mapcn from '@/components/mapcn/map';
import type { MapOptions, MapRoute } from './types';

/** Draws supplied route geometry without requesting a routing service. */
export function RouteMap({
    data,
    onSelect,
    ...props
}: MapOptions & { data: readonly MapRoute[]; onSelect?: (route: MapRoute) => void }) {
    const error = routeError(data);

    return (
        <MapCanvas {...props} empty={!data.length} error={error}>
            <RouteLayer data={data} onSelect={onSelect} interactive={props.interactive} />
        </MapCanvas>
    );
}

/** Renders supplied routes inside an existing map. */
export function RouteLayer({
    data,
    onSelect,
    interactive = true
}: {
    data: readonly MapRoute[];
    onSelect?: (route: MapRoute) => void;
    interactive?: boolean;
}) {
    return (
        <>
            {data.map((route) => (
                <mapcn.MapRoute
                    key={route.id}
                    coordinates={route.coordinates}
                    interactive={interactive && Boolean(onSelect)}
                    onClick={() => onSelect?.(route)}
                />
            ))}
        </>
    );
}
