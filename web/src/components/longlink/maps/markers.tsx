import { MapCanvas } from './canvas';
import { coordinateError } from './data';
import * as mapcn from '@/components/mapcn/map';
import type { MapMarker, MapOptions } from './types';

/** Displays named locations with keyboard-accessible markers and optional popups. */
export function MarkerMap({
    data,
    onSelect,
    ...props
}: MapOptions & { data: readonly MapMarker[]; onSelect?: (marker: MapMarker) => void }) {
    const error = coordinateError(data.map((marker) => marker.coordinates));

    return (
        <MapCanvas {...props} empty={!data.length} error={error}>
            <MarkerLayer data={data} onSelect={onSelect} interactive={props.interactive} />
        </MapCanvas>
    );
}

/** Renders named locations inside an existing map. */
export function MarkerLayer({
    data,
    onSelect,
    interactive = true
}: {
    data: readonly MapMarker[];
    onSelect?: (marker: MapMarker) => void;
    interactive?: boolean;
}) {
    return (
        <>
            {data.map((marker) => (
                <mapcn.MapMarker key={marker.id} longitude={marker.coordinates[0]} latitude={marker.coordinates[1]}>
                    <mapcn.MarkerContent>
                        <button
                            type="button"
                            disabled={!interactive}
                            aria-label={marker.label}
                            className="size-4 rounded-full border-2 border-background bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                            onClick={() => onSelect?.(marker)}
                        />
                    </mapcn.MarkerContent>
                    <mapcn.MarkerPopup closeButton>
                        <div className="flex flex-col gap-1">
                            <span className="font-medium">{marker.label}</span>
                            {marker.description && <span className="text-muted-foreground">{marker.description}</span>}
                        </div>
                    </mapcn.MarkerPopup>
                </mapcn.MapMarker>
            ))}
        </>
    );
}
