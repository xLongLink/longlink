import { useMemo, useState } from 'react';
import { prepareMap, type MapData } from './map-data';
import { ZoomableGroup } from 'react-simple-maps/zoom';
import { Empty, EmptyHeader, EmptyTitle } from '@/components/shadcn/empty';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps/core';

/** Renders generic polygon boundaries from supplied GeoJSON or TopoJSON data. */
export function Maps(props: {
    label: string;
    geography: MapData;
    objectName?: string;
    labelKey?: string;
    selectedId?: string;
    selectableIds?: string[];
    onSelect?: (id: string) => void;
    projection?: 'geoEqualEarth' | 'geoMercator' | 'geoEquirectangular';
    center?: [number, number];
    scale?: number;
    zoom?: number;
    height?: number | string;
    fit?: 'contain' | 'cover';
}) {
    const result = useMemo(() => prepareMap(props.geography, props.objectName), [props.geography, props.objectName]);
    const [isMoving, setIsMoving] = useState(false);

    if (result.status === 'invalid' || !result.data.features.length) {
        return (
            <Empty role="status">
                <EmptyHeader>
                    <EmptyTitle>{result.status === 'invalid' ? 'Invalid map data' : 'No map data'}</EmptyTitle>
                </EmptyHeader>
            </Empty>
        );
    }

    const boundaries = (
        <Geographies geography={result.data}>
            {({ geographies }) =>
                geographies.map((geography, index) => {
                    const id = geography.id === undefined ? undefined : String(geography.id);
                    const feature = result.data.features[index];
                    const name = feature?.properties?.[props.labelKey ?? 'name'];
                    const label = String(name ?? id ?? 'Region');

                    const interactive = Boolean(
                        props.onSelect && id !== undefined && (!props.selectableIds || props.selectableIds.includes(id))
                    );

                    const selected = id !== undefined && props.selectedId === id;

                    return (
                        <Geography
                            key={geography.rsmKey}
                            geography={geography}
                            role={interactive ? 'button' : undefined}
                            tabIndex={interactive ? 0 : -1}
                            aria-label={label}
                            aria-pressed={interactive ? selected : undefined}
                            fill={selected ? 'var(--analytics-map, var(--chart-1))' : 'var(--muted)'}
                            stroke="var(--analytics-map-border, var(--background))"
                            strokeWidth={0.75}
                            vectorEffect="non-scaling-stroke"
                            className={
                                interactive
                                    ? 'cursor-pointer hover:fill-[var(--analytics-map,var(--primary))] focus-visible:stroke-ring focus-visible:stroke-2 focus-visible:outline-none'
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
    );

    return (
        <ComposableMap
            width={800}
            height={400}
            preserveAspectRatio={props.fit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'}
            projection={props.projection ?? 'geoEqualEarth'}
            projectionConfig={{
                center: props.zoom === undefined ? (props.center ?? [0, 0]) : [0, 0],
                scale: props.scale ?? 140
            }}
            className="w-full min-w-0"
            style={{ height: props.height ?? 320 }}
            role={props.onSelect ? 'group' : 'img'}
            aria-label={props.label}
        >
            {props.zoom === undefined ? (
                boundaries
            ) : (
                <ZoomableGroup
                    center={props.center}
                    zoom={props.zoom}
                    minZoom={1}
                    maxZoom={4}
                    filterZoomEvent={(event) => event.type !== 'wheel'}
                    onMoveStart={() => setIsMoving(true)}
                    onMoveEnd={() => setIsMoving(false)}
                    className={
                        isMoving
                            ? undefined
                            : 'transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none'
                    }
                >
                    {boundaries}
                </ZoomableGroup>
            )}
        </ComposableMap>
    );
}
