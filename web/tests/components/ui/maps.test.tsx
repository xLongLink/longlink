// @vitest-environment happy-dom
import { act } from 'react';
import * as React from 'react';
import { transform } from 'sucrase';
import * as components from '@/views';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { it, expect, vi, beforeEach } from 'vitest';
import { createExpression } from '@maplibre/maplibre-gl-style-spec';
import type { FeatureCollection, Polygon, MultiPolygon } from 'geojson';
import atlas from '../../../../sdk/longlink/.static/new/src/assets/world.json';
import modelSource from '../../../../sdk/longlink/.static/new/src/views/models.jsx?raw';
import analyticsFixture from '../../../../sdk/longlink/.static/new/src/assets/analytics.json';

type Layer = { id: string; type: string; source: string; paint: Record<string, unknown> };
type Source = {
    data: FeatureCollection<Polygon, { name: string }>;
    setData: (data: FeatureCollection<Polygon, { name: string }>) => Promise<void>;
};
type Listener = (event?: unknown) => void;
type Engine = {
    removed: boolean;
    layers: Map<string, Layer>;
    sources: Map<string, Source>;
    listeners: Map<string, Set<Listener>>;
    getCenter: () => { lng: number; lat: number };
    fire: (event: string, layer?: string, value?: unknown) => void;
};

const engines = vi.hoisted(() => ({ maps: [] as Engine[], failNext: false }));

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
            if (engines.failNext) {
                engines.failNext = false;
                throw new Error('WebGL initialization failed');
            }
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
        addSource(id: string, options: { data: Source['data'] }) {
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
    engines.failNext = false;
});

const countries = [
    { id: '12', name: 'West', flag: '🇺🇸', share: 60, center: [-10, 10], zoom: 2 },
    { id: 'east', name: 'East', flag: '🇯🇵', share: 40, center: [30, 10], zoom: 2 }
];
const geography: Source['data'] = {
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

it('coordinates the composed starter country panel and recovers its map without losing selection', async () => {
    const analytics = {
        ...analyticsFixture,
        countries: countries.map((country) => ({ ...country, messages: 1200, people: 23, model: 'Sample' }))
    };
    const bindings = {
        __jsx: React.createElement,
        ...components,
        useApi: (path: string) => [path === '/assets/analytics.json' ? analytics : geography]
    };
    const code = transform(modelSource, {
        transforms: ['jsx', 'imports'],
        jsxRuntime: 'classic',
        jsxPragma: '__jsx',
        production: true
    }).code;
    const module = { exports: {} };

    // oxlint-disable-next-line typescript/no-implied-eval -- Exercise the shipped View with real shared components.
    const evaluate = new Function(
        'module',
        'exports',
        ...Object.keys(bindings),
        `${code}\nreturn module.exports.default;`
    );
    const Models = evaluate(module, module.exports, ...Object.values(bindings)) as React.ComponentType;
    const user = userEvent.setup();

    await withMounted(<Models />, async (output) => {
        const card = [...output.querySelectorAll('[data-slot="card"]')].find(
            (card) => card.querySelector('h2')?.textContent === 'Top countries this month'
        );
        const east = [...(card?.querySelectorAll<HTMLButtonElement>('button[aria-pressed]') ?? [])].find((button) =>
            button.textContent?.includes('East')
        );
        const next = card?.querySelector<HTMLButtonElement>('[aria-label="Next country"]');
        if (!card || !east || !next) throw new Error('Expected the composed country panel');
        const map = await loadMap();

        expect(map.getCenter()).toEqual({ lng: -10, lat: 10 });
        await act(async () => user.hover(east));
        expect(card.querySelector('[aria-live="polite"]')?.textContent).toContain('#2 East');
        expect(east.getAttribute('aria-pressed')).toBe('true');
        expect(opacity(map, 'east')).toBeGreaterThan(opacity(map, '12'));
        expect(map.getCenter()).toEqual({ lng: 30, lat: 10 });

        await act(async () => {
            next.focus();
            await user.keyboard('{Enter}');
        });
        expect(card.querySelector('[aria-live="polite"]')?.textContent).toContain('#1 West');
        const layer = selectionLayer(map);
        const feature = map.sources.get(layer.source)?.data.features.find((feature) => feature.id === 'east');
        if (!feature) throw new Error('Expected the selectable East boundary');
        await act(async () => map.fire('click', layer.id, { features: [feature], lngLat: { lng: 30, lat: 10 } }));
        expect(card.querySelector('[aria-live="polite"]')?.textContent).toContain('#2 East');

        await act(async () => map.fire('error'));
        expect(card.querySelector('[role="alert"]')?.textContent).toContain('Unable to load map');
        expect(map.removed).toBe(true);
        expect(east.getAttribute('aria-pressed')).toBe('true');
        const retry = [...card.querySelectorAll('button')].find((button) => button.textContent === 'Retry');
        if (!retry) throw new Error('Expected map recovery');
        engines.failNext = true;
        await act(async () => user.click(retry));
        await vi.waitFor(() =>
            expect(card.querySelector('[role="alert"]')?.textContent).toContain('Unable to load map')
        );
        expect(east.getAttribute('aria-pressed')).toBe('true');
        const retryInitialization = [...card.querySelectorAll('button')].find(
            (button) => button.textContent === 'Retry'
        );
        if (!retryInitialization) throw new Error('Expected WebGL initialization recovery');
        await act(async () => user.click(retryInitialization));
        const recovered = await loadMap();
        expect(recovered.getCenter()).toEqual({ lng: 30, lat: 10 });
        expect(opacity(recovered, 'east')).toBeGreaterThan(opacity(recovered, '12'));
        expect(card.querySelector('[aria-live="polite"]')?.textContent).toContain('#2 East');
    });
});

it('keeps bundled country boundaries from stretching across the map at the date line', () => {
    const boundaries = atlas as FeatureCollection<Polygon | MultiPolygon>;
    expect(boundaries.features.length).toBeGreaterThan(0);

    // Planar renderers require date-line splits; only a pole connector can span the world.
    for (const feature of boundaries.features) {
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
