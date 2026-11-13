import { useMemo } from 'react';
import { EmptyState } from './empty-state';
import { prepareMap, type MapData } from './map-data';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps/core';

/** Renders generic polygon boundaries from supplied GeoJSON or TopoJSON data. */
export function Maps(props: {
    label: string;
    geography: MapData;
    objectName?: string;
    labelKey?: string;
    selectedId?: string;
    onSelect?: (id: string) => void;
    projection?: 'geoEqualEarth' | 'geoMercator' | 'geoEquirectangular';
    center?: [number, number];
    scale?: number;
    height?: number;
}) {
    const result = useMemo(() => prepareMap(props.geography, props.objectName), [props.geography, props.objectName]);

    if (result.status === 'invalid') return <EmptyState title="Invalid map data" isCompact />;

    if (!result.data.features.length) return <EmptyState title="No map data" isCompact />;

    return (
        <ComposableMap
            width={800}
            height={400}
            projection={props.projection ?? 'geoEqualEarth'}
            projectionConfig={{ center: props.center ?? [0, 0], scale: props.scale ?? 140 }}
            className="w-full min-w-0"
            style={{ height: props.height ?? 320 }}
            role={props.onSelect ? 'group' : 'img'}
            aria-label={props.label}
        >
            <Geographies geography={result.data}>
                {({ geographies }) =>
                    geographies.map((geography, index) => {
                        const id = geography.id === undefined ? undefined : String(geography.id);
                        const feature = result.data.features[index];
                        const name = feature?.properties?.[props.labelKey ?? 'name'];
                        const label = String(name ?? id ?? 'Region');
                        const interactive = Boolean(props.onSelect && id !== undefined);
                        const selected = id !== undefined && props.selectedId === id;

                        return (
                            <Geography
                                key={geography.rsmKey}
                                geography={geography}
                                role={interactive ? 'button' : undefined}
                                tabIndex={interactive ? 0 : -1}
                                aria-label={label}
                                aria-pressed={interactive ? selected : undefined}
                                fill={selected ? 'var(--chart-1)' : 'var(--muted)'}
                                stroke="var(--background)"
                                strokeWidth={0.75}
                                vectorEffect="non-scaling-stroke"
                                className={
                                    interactive
                                        ? 'cursor-pointer hover:fill-primary focus-visible:stroke-ring focus-visible:stroke-2 focus-visible:outline-none'
                                        : undefined
                                }
                                onClick={interactive ? () => props.onSelect?.(id ?? '') : undefined}
                                onKeyDown={
                                    interactive
                                        ? (event) => {
                                              if (event.key === 'Enter' || event.key === ' ') {
                                                  event.preventDefault();
                                                  props.onSelect?.(id ?? '');
                                              }
                                          }
                                        : undefined
                                }
                            >
                                <title>{label}</title>
                            </Geography>
                        );
                    })
                }
            </Geographies>
        </ComposableMap>
    );
}
