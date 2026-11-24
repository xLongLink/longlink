import type { ComponentPropsWithoutRef } from 'react';
import type { MapControlsProps, MapViewport } from '@/components/mapcn/map';
import type { FeatureCollection, Polygon, MultiPolygon, GeoJsonProperties } from 'geojson';

export type { MapViewport } from '@/components/mapcn/map';

export type MapCoordinate = [longitude: number, latitude: number];
export type MapMarker = { id: string; coordinates: MapCoordinate; label: string; description?: string };
export type MapRoute = { id: string; coordinates: MapCoordinate[]; label?: string };
export type MapArc = { id: string; from: MapCoordinate; to: MapCoordinate };
export type MapGeography = FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>;
export type MapControlsOptions = Omit<MapControlsProps, 'className'>;

export type MapOptions = Omit<
    ComponentPropsWithoutRef<'div'>,
    'children' | 'className' | 'style' | 'onError' | 'onSelect'
> & {
    center?: MapCoordinate;
    zoom?: number;
    controls?: boolean | MapControlsOptions;
    interactive?: boolean;
    blank?: boolean;
    projection?: 'mercator' | 'globe';
    viewport?: Partial<MapViewport>;
    onViewportChange?: (viewport: MapViewport) => void;
};
