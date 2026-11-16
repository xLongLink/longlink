// @vitest-environment happy-dom
import { act, useState } from 'react';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { it, expect, vi, beforeEach } from 'vitest';
import { CountryMap } from '@/components/custom/country-map';
import { createExpression } from '@maplibre/maplibre-gl-style-spec';
import atlas from '../../../../sdk/longlink/.static/new/src/assets/world.json';
import { CountryChart, type CountryUsage } from '@/components/custom/country-chart';
import { prepareMap, type MapData, type MapFeatures } from '@/components/custom/map-data';

type Layer = { id: string; type: string; source: string; paint: Record<string, unknown> };
type Source = { data: MapFeatures; setData: (data: MapFeatures) => Promise<void> };
type Listener = (event?: unknown) => void;
type Engine = {
    removed: boolean;
    layers: Map<string, Layer>;
    sources: Map<string, Source>;
    listeners: Map<string, Set<Listener>>;
    getCenter: () => { lng: number; lat: number };
    fire: (event: string, layer?: string, value?: unknown) => void;
};

const engines = vi.hoisted(() => ({ maps: [] as Engine[] }));

// Replace only the WebGL engine; mapcn's layer lifecycle and the application selection remain real.
vi.mock('maplibre-gl', () => ({
    getWorkerUrl: () => 'bundled-worker',
    Map: class implements Engine {
        painter = {};
        removed = false;
        layers = new Map<string, Layer>();
        sources = new Map<string, Source>();
        listeners = new Map<string, Set<Listener>>();
        canvas = document.createElement('canvas');
        center: [number, number];
        zoom: number;

        constructor(options: { center: [number, number]; zoom: number }) {
            this.center = options.center;
            this.zoom = options.zoom;
            engines.maps.push(this);
        }
        on(event: string, layer: string | Listener, callback?: Listener) {
            const key = typeof layer === 'string' ? `${event}:${layer}` : event;
            const listener = typeof layer === 'string' ? callback : layer;
            if (!listener) throw new Error('Expected map listener');
            const listeners = this.listeners.get(key) ?? new Set<Listener>();
            listeners.add(listener);
            this.listeners.set(key, listeners);
            return this;
        }
        off(event: string, layer: string | Listener, callback?: Listener) {
            const key = typeof layer === 'string' ? `${event}:${layer}` : event;
            const listener = typeof layer === 'string' ? callback : layer;
            if (listener) this.listeners.get(key)?.delete(listener);
            return this;
        }
        fire(event: string, layer?: string, value?: unknown) {
            for (const listener of this.listeners.get(layer ? `${event}:${layer}` : event) ?? []) listener(value);
        }
        addSource(id: string, options: { data: MapFeatures }) {
            const source: Source = {
                data: options.data,
                setData: async (data) => {
                    source.data = data;
                }
            };
            this.sources.set(id, source);
        }
        getSource(id: string) {
            return this.sources.get(id);
        }
        removeSource(id: string) {
            this.sources.delete(id);
        }
        addLayer(layer: Layer) {
            this.layers.set(layer.id, layer);
        }
        getLayer(id: string) {
            return this.layers.get(id);
        }
        removeLayer(id: string) {
            this.layers.delete(id);
        }
        setPaintProperty(id: string, name: string, value: unknown) {
            const layer = this.layers.get(id);
            if (!layer) throw new Error('Expected live map layer');
            layer.paint[name] = value;
        }
        getCenter() {
            return { lng: this.center[0], lat: this.center[1] };
        }
        getZoom() {
            return this.zoom;
        }
        getCanvas() {
            return this.canvas;
        }
        easeTo(options: { center: [number, number]; zoom: number }) {
            this.center = options.center;
            this.zoom = options.zoom;
        }
        stop() {}
        setProjection() {}
        setStyle() {
            this.fire('style.load');
        }
        remove() {
            this.removed = true;
            this.layers.clear();
            this.sources.clear();
            this.listeners.clear();
        }
    }
}));

beforeEach(() => {
    engines.maps.length = 0;
});

const countries: CountryUsage[] = [
    { id: '12', name: 'West', flag: '🇺🇸', share: 60, center: [-10, 10], zoom: 2 },
    { id: 'east', name: 'East', flag: '🇯🇵', share: 40, center: [30, 10], zoom: 2 }
];
const geography: MapData = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            id: 12,
            properties: { name: 'West' },
            geometry: {
                type: 'Polygon',
                coordinates: [
                    [
                        [-20, 0],
                        [-20, 20],
                        [0, 20],
                        [0, 0],
                        [-20, 0]
                    ]
                ]
            }
        },
        {
            type: 'Feature',
            id: 'east',
            properties: { name: 'East' },
            geometry: {
                type: 'Polygon',
                coordinates: [
                    [
                        [20, 0],
                        [20, 20],
                        [40, 20],
                        [40, 0],
                        [20, 0]
                    ]
                ]
            }
        },
        {
            type: 'Feature',
            id: 'other',
            properties: { name: 'Other' },
            geometry: {
                type: 'Polygon',
                coordinates: [
                    [
                        [40, 0],
                        [40, 20],
                        [60, 20],
                        [60, 0],
                        [40, 0]
                    ]
                ]
            }
        }
    ]
};

/** Completes the engine load while retaining the real mapcn effects. */
async function loadMap() {
    await vi.waitFor(() => expect(engines.maps.some((map) => !map.removed)).toBe(true));
    const map = engines.maps.find((map) => !map.removed);
    if (!map) throw new Error('Expected live map');
    await act(async () => {
        map.fire('load');
        map.fire('style.load');
    });
    return map;
}

/** Finds the actual interactive layer installed by mapcn. */
function selectionLayer(map: Engine) {
    const layer = [...map.layers.values()].find((layer) => map.listeners.has(`click:${layer.id}`));
    if (!layer) throw new Error('Expected interactive country layer');
    return layer;
}

/** Evaluates the installed highlight paint through MapLibre's expression implementation. */
function opacity(map: Engine, id: string) {
    const expression = createExpression(selectionLayer(map).paint['fill-opacity'], 'fill-opacity');
    if (expression.result !== 'success') throw new Error('Invalid country highlight expression');
    const value: unknown = expression.value.evaluate({ zoom: 2 }, { type: 'Polygon', id, properties: {} });
    if (typeof value !== 'number') throw new Error('Expected numeric country opacity');
    return value;
}

it('draws country fills once and selects only ranked countries by stable feature IDs', async () => {
    function Regions() {
        const [selectedId, setSelectedId] = useState('east');
        return (
            <>
                <CountryMap
                    label="Country usage"
                    countries={countries}
                    geography={geography}
                    selected={countries.find((country) => country.id === selectedId)}
                    onSelect={setSelectedId}
                />
                <output>{selectedId}</output>
            </>
        );
    }

    await withMounted(<Regions />, async (output) => {
        const map = await loadMap();
        const layer = selectionLayer(map);
        const source = map.sources.get(layer.source);
        if (!source) throw new Error('Expected country source');
        const other = [...map.sources.values()]
            .flatMap((source) => source.data.features)
            .find((feature) => feature.id === 'other');
        if (!other) throw new Error('Expected an unranked country boundary');
        const fills = [...map.layers.values()]
            .filter((layer) => layer.type === 'fill')
            .flatMap((layer) => map.sources.get(layer.source)?.data.features ?? []);

        // Duplicate fills compound opacity and introduce competing tile-clipping passes.
        for (const feature of source.data.features) {
            expect(fills.filter((fill) => fill.id === feature.id)).toHaveLength(1);
        }
        expect(fills).toContain(other);
        await act(async () =>
            map.fire('click', layer.id, { features: [source.data.features[0]], lngLat: { lng: -10, lat: 10 } })
        );
        expect(output.querySelector('output')?.textContent).toBe('12');
        expect(opacity(map, '12')).toBeGreaterThan(opacity(map, 'east'));
        await act(async () => map.fire('click', layer.id, { features: [other], lngLat: { lng: 50, lat: 10 } }));
        expect(output.querySelector('output')?.textContent).toBe('12');
    });
});

it('keeps country details, highlights, and map focus together when selection or results change', async () => {
    const user = userEvent.setup();
    function Results() {
        const [visible, setVisible] = useState(countries);
        return (
            <>
                <button type="button" onClick={() => setVisible([countries[0]])}>
                    Refresh countries
                </button>
                <CountryChart countries={visible} geography={geography} title="Countries" label="Country usage" />
            </>
        );
    }

    await withMounted(<Results />, async (output) => {
        const map = await loadMap();
        const previousEast = map.sources
            .get(selectionLayer(map).source)
            ?.data.features.find((feature) => feature.id === 'east');
        if (!previousEast) throw new Error('Expected the previously ranked country');
        const east = [...output.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')].find((button) =>
            button.textContent?.includes('East')
        );
        const next = output.querySelector<HTMLButtonElement>('[aria-label="Next country"]');
        const refresh = [...output.querySelectorAll('button')].find(
            (button) => button.textContent === 'Refresh countries'
        );
        if (!east || !next || !refresh) throw new Error('Expected country controls');
        expect(map.getCenter()).toEqual({ lng: -10, lat: 10 });
        await act(async () => user.hover(east));
        expect(output.querySelector('[aria-live="polite"]')?.textContent).toContain('#2 East');
        expect(east.getAttribute('aria-pressed')).toBe('true');
        expect(opacity(map, 'east')).toBeGreaterThan(opacity(map, '12'));
        expect(map.getCenter()).toEqual({ lng: 30, lat: 10 });
        await act(async () => user.click(next));
        expect(output.querySelector('[aria-live="polite"]')?.textContent).toContain('#1 West');
        expect(map.getCenter()).toEqual({ lng: -10, lat: 10 });
        await act(async () => east.focus());
        expect(output.querySelector('[aria-live="polite"]')?.textContent).toContain('#2 East');
        await act(async () => user.click(refresh));
        expect(output.querySelector('[aria-live="polite"]')?.textContent).toContain('#1 West');
        expect(map.getCenter()).toEqual({ lng: -10, lat: 10 });
        const layer = selectionLayer(map);
        expect(opacity(map, '12')).toBeGreaterThan(opacity(map, 'east'));
        await act(async () => map.fire('click', layer.id, { features: [previousEast], lngLat: { lng: 30, lat: 10 } }));
        expect(output.querySelector('[aria-live="polite"]')?.textContent).toContain('#1 West');
    });
});

it('keeps bundled country boundaries from stretching across the map at the date line', () => {
    const result = prepareMap(atlas as MapData);
    if (result.status !== 'ready') throw new Error('Expected valid country boundaries');
    expect(result.data.features.length).toBeGreaterThan(0);

    // Planar renderers require date-line splits; only a pole connector can span the world.
    for (const feature of result.data.features) {
        const geometry = feature.geometry;
        if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') throw new Error('Expected polygons');
        const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
        for (const polygon of polygons) {
            for (const ring of polygon) {
                expect(new Set(ring.map((point) => `${point[0]},${point[1]}`)).size).toBeGreaterThanOrEqual(3);
                expect(ring[0]).toEqual(ring[ring.length - 1]);
                for (let index = 1; index < ring.length; index++) {
                    const previous = ring[index - 1];
                    const current = ring[index];
                    if (previous[1] === -90 && current[1] === -90) continue;
                    expect(Math.abs(current[0] - previous[0]), String(feature.properties?.name)).toBeLessThanOrEqual(
                        180
                    );
                }
            }
        }
    }
});

it('chooses the requested topology layer and rejects missing layers or broken arcs', () => {
    const topology: MapData = {
        type: 'Topology',
        objects: {
            districts: {
                type: 'GeometryCollection',
                geometries: [{ type: 'Polygon', id: 'district', arcs: [[0]], properties: { name: 'District' } }]
            },
            regions: {
                type: 'GeometryCollection',
                geometries: [{ type: 'Polygon', id: 'region', arcs: [[0]], properties: { name: 'Region' } }]
            },
            broken: { type: 'Polygon', arcs: [[4]] }
        },
        arcs: [
            [
                [0, 0],
                [0, 10],
                [10, 10],
                [10, 0],
                [0, 0]
            ]
        ]
    };
    const selected = prepareMap(topology, 'regions');
    const first = prepareMap(topology);
    if (selected.status !== 'ready' || first.status !== 'ready') throw new Error('Expected valid map data');
    expect(selected.data.features.map((feature) => feature.id)).toEqual(['region']);
    expect(first.data.features.map((feature) => feature.id)).toEqual(['district']);
    expect(prepareMap(topology, 'missing').status).toBe('invalid');
    expect(prepareMap(topology, 'broken').status).toBe('invalid');
});

it('releases stale boundaries for empty results and recovers on the next result', async () => {
    const user = userEvent.setup();
    function Results() {
        const [empty, setEmpty] = useState(false);
        return (
            <>
                <button type="button" onClick={() => setEmpty(!empty)}>
                    Toggle results
                </button>
                <CountryMap
                    countries={countries}
                    geography={empty ? { type: 'FeatureCollection', features: [] } : geography}
                    selected={countries[0]}
                    label="Country usage"
                    onSelect={() => {}}
                />
            </>
        );
    }

    await withMounted(<Results />, async (output) => {
        const map = await loadMap();
        const toggle = output.querySelector('button');
        if (!toggle) throw new Error('Expected result toggle');
        expect(map.sources.size).toBeGreaterThan(0);
        await act(async () => user.click(toggle));
        expect(output.textContent).toContain('No map data');
        expect(map.removed).toBe(true);
        expect(map.sources.size).toBe(0);
        await act(async () => user.click(toggle));
        const recovered = await loadMap();
        expect(recovered).not.toBe(map);
        expect(output.textContent).not.toContain('No map data');
        expect(recovered.sources.size).toBeGreaterThan(0);
    });
});
