import { MapCanvas } from './canvas';
import { coordinateError } from './data';
import * as mapcn from '@/components/mapcn/map';
import type { MapArc, MapOptions } from './types';

/** Connects supplied origin and destination pairs with curved lines. */
export function ArcMap({
    data,
    onSelect,
    curvature = 0.2,
    ...props
}: MapOptions & { data: readonly MapArc[]; curvature?: number; onSelect?: (arc: MapArc) => void }) {
    const error =
        coordinateError(data.flatMap((arc) => [arc.from, arc.to])) ??
        (!Number.isFinite(curvature) ? 'Arc curvature must be finite.' : undefined);

    return (
        <MapCanvas {...props} empty={!data.length} error={error}>
            <ArcLayer data={data} curvature={curvature} onSelect={onSelect} interactive={props.interactive} />
        </MapCanvas>
    );
}

/** Renders origin and destination connections inside an existing map. */
export function ArcLayer({
    data,
    onSelect,
    curvature = 0.2,
    interactive = true
}: {
    data: readonly MapArc[];
    curvature?: number;
    onSelect?: (arc: MapArc) => void;
    interactive?: boolean;
}) {
    return (
        <mapcn.MapArc
            data={[...data]}
            curvature={curvature}
            interactive={interactive && Boolean(onSelect)}
            onClick={(event) => onSelect?.(event.arc)}
        />
    );
}
