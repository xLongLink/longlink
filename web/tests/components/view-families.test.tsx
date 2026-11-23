import { withMounted } from '../render';
import { expect, it, vi } from 'vitest';
import type { MapRef } from '@/components/mapcn/map';
// @vitest-environment happy-dom
import { act, createContext, createRef, useContext, useImperativeHandle, type ReactNode } from 'react';

/** Holds an external dependency pending until the test admits its load. */
function deferred() {
    let resolve = () => {};
    const promise = new Promise<void>((complete) => {
        resolve = complete;
    });
    return { promise, resolve };
}

it('loads chart and composed map families independently without hiding siblings or losing map context and refs', async () => {
    // Arrange
    const charts = deferred();
    const maps = deferred();
    const loaded = { charts: false, maps: false };
    const MapContext = createContext(false);
    const ref = createRef<MapRef>();
    const map = { id: 'map' };

    vi.doMock('recharts', async (original) => {
        loaded.charts = true;
        await charts.promise;
        return await original();
    });
    vi.doMock('@/components/mapcn/map', async () => {
        loaded.maps = true;
        await maps.promise;
        return {
            Map: ({ children, ref: mapRef }: { children: ReactNode; ref: React.Ref<unknown> }) => {
                useImperativeHandle(mapRef, () => map);
                return <MapContext value={true}>{children}</MapContext>;
            },
            MapControls: () => <span>{useContext(MapContext) ? 'Map controls' : 'Missing context'}</span>,
            MapGeoJSON: () => <span>{useContext(MapContext) ? 'Map geography' : 'Missing context'}</span>
        };
    });
    const { ChartLegend, Map, MapControls, MapGeoJSON } = await import('@/views/lazy');
    expect(loaded).toEqual({ charts: false, maps: false });

    // Act
    await withMounted(
        <>
            <button type="button">Sibling</button>
            <ChartLegend series={[{ key: 'orders', label: 'Orders' }]} />
            <Map ref={ref}>
                <MapControls />
                <MapGeoJSON data={{ type: 'FeatureCollection', features: [] }} />
            </Map>
        </>,
        async (output) => {
            // Assert
            expect(output.querySelector('button')?.textContent).toBe('Sibling');
            expect(output.querySelector('[aria-label="Loading chart"]')).not.toBeNull();
            expect(output.querySelector('[aria-label="Loading map"]')).not.toBeNull();
            await vi.waitFor(() => expect(loaded).toEqual({ charts: true, maps: true }));

            await act(async () => {
                charts.resolve();
                await import('@/views/charts');
            });
            expect(output.textContent).toContain('Orders');
            expect(output.querySelector('[aria-label="Loading map"]')).not.toBeNull();

            await act(async () => {
                maps.resolve();
                await import('@/views/maps');
            });
            await vi.waitFor(() => {
                expect(output.textContent).toContain('Map controls');
                expect(output.textContent).toContain('Map geography');
                expect(ref.current).toBe(map);
            });
            expect(output.textContent).not.toContain('Missing context');
            expect(output.querySelector('[role="status"]')).toBeNull();
        }
    );
});

it('keeps a failed optional chart dependency local to its region', async () => {
    // Arrange
    vi.resetModules();
    const charts = deferred();
    vi.doMock('recharts', async () => {
        await charts.promise;
        throw new Error('Chart chunk unavailable');
    });
    const { ChartLegend } = await import('@/views/lazy');
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
        await withMounted(
            <>
                <button type="button">Sibling</button>
                <ChartLegend series={[{ key: 'orders' }]} />
            </>,
            async (output) => {
                // Act
                await act(async () => charts.resolve());

                // Assert
                await vi.waitFor(() =>
                    expect(output.querySelector('[role="alert"]')?.textContent).toContain('Unable to load chart')
                );
                expect(output.querySelector('[role="alert"]')?.textContent).toContain('Reload the View');
                expect(output.querySelector('[role="alert"] button')).toBeNull();
                expect(output.querySelector('button')?.textContent).toBe('Sibling');
                expect(output.querySelector('[role="status"]')).toBeNull();
            }
        );
    } finally {
        error.mockRestore();
        vi.doUnmock('recharts');
        vi.doUnmock('@/components/mapcn/map');
    }
});

it('recovers a child query render failure after its dependency is corrected and Retry is pressed', async () => {
    // Arrange
    vi.resetModules();
    const { ChartLegend } = await import('@/views/lazy');
    const { QueryErrorResetBoundary, useSuspenseQuery } = await import('@tanstack/react-query');
    let available = false;
    const request = vi.fn(async () => {
        if (!available) throw new Error('Chart data unavailable');
        return 'Recovered chart data';
    });
    function ChartData() {
        const { data } = useSuspenseQuery({ queryKey: ['chart-data'], queryFn: request });
        return <span>{data}</span>;
    }
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
        await withMounted(
            <QueryErrorResetBoundary>
                <button type="button">Sibling</button>
                <ChartLegend
                    data={[{ name: 'Orders', value: 1 }]}
                    nameKey="name"
                    valueKey="value"
                    formatValue={() => <ChartData />}
                />
            </QueryErrorResetBoundary>,
            async (output) => {
                await vi.waitFor(() =>
                    expect(output.querySelector('[role="alert"]')?.textContent).toContain('Unable to load chart')
                );
                const retry = output.querySelector<HTMLButtonElement>('[role="alert"] button');
                if (!retry) throw new Error('Expected local Retry');
                expect(request).toHaveBeenCalledTimes(1);

                // Act
                available = true;
                await act(async () => retry.click());

                // Assert
                await vi.waitFor(() => expect(output.textContent).toContain('Recovered chart data'));
                expect(request).toHaveBeenCalledTimes(2);
                expect(output.querySelector('[role="alert"]')).toBeNull();
                expect(output.querySelector('button')?.textContent).toBe('Sibling');
            }
        );
    } finally {
        error.mockRestore();
    }
});
