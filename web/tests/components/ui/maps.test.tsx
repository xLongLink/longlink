// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { act, useState } from 'react';
import { withMounted } from '../../render';
import { Maps } from '@/components/custom/maps';
import userEvent from '@testing-library/user-event';
import { prepareMap, type MapData } from '@/components/custom/map-data';

it('selects custom regions by stable ID through pointer and keyboard controls', async () => {
    const user = userEvent.setup();

    const geography: MapData = {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                id: 12,
                properties: { title: 'West' },
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
                properties: { title: 'East' },
                geometry: {
                    type: 'Polygon',
                    coordinates: [
                        [
                            [0, 0],
                            [0, 20],
                            [20, 20],
                            [20, 0],
                            [0, 0]
                        ]
                    ]
                }
            },
            {
                type: 'Feature',
                properties: { title: 'Unassigned' },
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
            }
        ]
    };

    function Regions() {
        const [selectedId, setSelectedId] = useState('east');

        return (
            <Maps
                label="Delivery zones"
                geography={geography}
                labelKey="title"
                selectedId={selectedId}
                onSelect={setSelectedId}
            />
        );
    }

    await withMounted(<Regions />, async (output) => {
        const west = output.querySelector<SVGPathElement>('[role="button"][aria-label="West"]');
        const east = output.querySelector<SVGPathElement>('[role="button"][aria-label="East"]');
        const unassigned = output.querySelector<SVGPathElement>('[aria-label="Unassigned"]');

        if (!west || !east || !unassigned) throw new Error('Expected custom region boundaries');

        expect(east.getAttribute('aria-pressed')).toBe('true');
        await act(async () => user.click(west));
        expect(west.getAttribute('aria-pressed')).toBe('true');
        expect(east.getAttribute('aria-pressed')).toBe('false');
        east.focus();
        await act(async () => user.keyboard('{Enter}'));
        expect(east.getAttribute('aria-pressed')).toBe('true');
        expect(west.getAttribute('aria-pressed')).toBe('false');
        west.focus();
        await act(async () => user.keyboard(' '));
        expect(west.getAttribute('aria-pressed')).toBe('true');
        expect(unassigned.getAttribute('role')).toBeNull();
        expect(unassigned.getAttribute('tabindex')).toBe('-1');
    });
});

it('chooses the requested topology layer and rejects missing layers or broken arcs', () => {
    const geography: MapData = {
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

    const selected = prepareMap(geography, 'regions');
    const first = prepareMap(geography);

    if (selected.status !== 'ready' || first.status !== 'ready') throw new Error('Expected valid map data');

    expect(selected.data.features.map((feature) => feature.id)).toEqual(['region']);
    expect(first.data.features.map((feature) => feature.id)).toEqual(['district']);
    expect(prepareMap(geography, 'missing').status).toBe('invalid');
    expect(prepareMap(geography, 'broken').status).toBe('invalid');
});

it('replaces stale boundaries with an empty state and recovers on the next result', async () => {
    const user = userEvent.setup();

    function Results() {
        const [empty, setEmpty] = useState(false);

        return (
            <>
                <button type="button" onClick={() => setEmpty(!empty)}>
                    Toggle results
                </button>
                <Maps
                    label="Zones"
                    geography={{
                        type: 'FeatureCollection',
                        features: empty
                            ? []
                            : [
                                  {
                                      type: 'Feature',
                                      id: 'zone',
                                      properties: { name: 'Zone' },
                                      geometry: {
                                          type: 'Polygon',
                                          coordinates: [
                                              [
                                                  [0, 0],
                                                  [0, 10],
                                                  [10, 10],
                                                  [10, 0],
                                                  [0, 0]
                                              ]
                                          ]
                                      }
                                  }
                              ]
                    }}
                />
            </>
        );
    }

    await withMounted(<Results />, async (output) => {
        const toggle = output.querySelector('button');

        if (!toggle) throw new Error('Expected result toggle');

        expect(output.querySelector('path[aria-label="Zone"]')).not.toBeNull();
        await act(async () => user.click(toggle));
        expect(output.textContent).toContain('No map data');
        expect(output.querySelector('path')).toBeNull();
        await act(async () => user.click(toggle));
        expect(output.textContent).not.toContain('No map data');
        expect(output.querySelector('path[aria-label="Zone"]')).not.toBeNull();
    });
});
