import { ArcLayer } from './arcs';
import { MapCanvas } from './canvas';
import { RouteLayer } from './routes';
import { MarkerLayer } from './markers';
import { ClusterLayer } from './clusters';
import { coordinateError, routeError } from './data';
import type { MapOptions, MapMarker, MapRoute, MapArc } from './types';

/** Displays one street map with optional location, route, cluster, and connection layers. */
export function StreetMap({
    locations = [],
    routes = [],
    clusters = [],
    connections = [],
    onSelectLocation,
    ...props
}: MapOptions & {
    locations?: readonly MapMarker[];
    routes?: readonly MapRoute[];
    clusters?: readonly MapMarker[];
    connections?: readonly MapArc[];
    onSelectLocation?: (location: MapMarker) => void;
}) {
    const error =
        coordinateError([
            ...locations.map((location) => location.coordinates),
            ...clusters.map((location) => location.coordinates),
            ...connections.flatMap((connection) => [connection.from, connection.to])
        ]) ?? routeError(routes);

    return (
        <MapCanvas {...props} error={error}>
            {routes.length > 0 && <RouteLayer data={routes} interactive={props.interactive} />}
            {connections.length > 0 && <ArcLayer data={connections} interactive={props.interactive} />}
            {clusters.length > 0 && (
                <ClusterLayer data={clusters} interactive={props.interactive} onSelect={onSelectLocation} />
            )}
            {locations.length > 0 && (
                <MarkerLayer data={locations} interactive={props.interactive} onSelect={onSelectLocation} />
            )}
        </MapCanvas>
    );
}
