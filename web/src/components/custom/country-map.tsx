import { useEffect, useMemo } from 'react';
import * as mapcn from '@/components/mapcn/map';
import { prepareMap, type MapData } from './map-data';
import { MapCanvas } from '@/components/longlink/maps/canvas';

/** Synchronizes country selection with the external map camera. */
function CountryFocus({ center = [0, 20], zoom = 1.5 }: { center?: [number, number]; zoom?: number }) {
    const { map, isLoaded } = mapcn.useMap();
    const [longitude, latitude] = center;

    useEffect(() => {
        if (!map || !isLoaded) return;
        const current = map.getCenter();
        if (current.lng === longitude && current.lat === latitude && map.getZoom() === zoom) return;

        map.easeTo({ center: [longitude, latitude], zoom, duration: 300 });
        return () => {
            map.stop();
        };
    }, [map, isLoaded, longitude, latitude, zoom]);

    return null;
}

/** Renders local atlas boundaries with ranked-country selection through mapcn. */
export function CountryMap({
    countries,
    geography,
    selected,
    label,
    onSelect
}: {
    countries: readonly { id: string }[];
    geography: MapData;
    selected?: { id: string; center: [number, number]; zoom?: number };
    label: string;
    onSelect: (id: string) => void;
}) {
    const result = useMemo(() => prepareMap(geography), [geography]);

    if (result.status === 'invalid') return <MapCanvas aria-label={label} error="Invalid map data" />;

    return (
        <MapCanvas
            blank
            controls={false}
            center={selected?.center}
            zoom={selected?.zoom ?? 1.5}
            aria-label={label}
            empty={!result.data.features.length}
        >
            <CountryFocus center={selected?.center} zoom={selected?.zoom} />
            <mapcn.MapGeoJSON
                data={result.data}
                fillPaint={{ 'fill-opacity': ['case', ['==', ['to-string', ['id']], selected?.id ?? ''], 1, 0.35] }}
                interactive={countries.length > 0}
                onClick={(event) => {
                    const id = event.feature.id;
                    if (id === undefined) return;
                    const country = countries.find((country) => country.id === String(id));
                    if (country) onSelect(country.id);
                }}
            />
        </MapCanvas>
    );
}
