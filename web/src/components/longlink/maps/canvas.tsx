import { coordinateError } from './data';
import type { MapOptions } from './types';
import * as mapcn from '@/components/mapcn/map';
import { Button } from '@/components/shadcn/button';
import { ErrorBoundary } from 'react-error-boundary';
import { useEffect, useState, type ReactNode } from 'react';

/** Reports asynchronous map resource failures inside the map region. */
function MapStatus() {
    const { map, isLoaded } = mapcn.useMap();
    const [failed, setFailed] = useState(false);

    // MapLibre reports tile and style failures through events rather than React errors.
    useEffect(() => {
        if (!map) return;
        const fail = () => setFailed(true);
        map.on('error', fail);
        return () => {
            map.off('error', fail);
        };
    }, [map]);

    if (failed) throw new Error('Map resources could not be loaded.');
    return isLoaded ? null : (
        <span role="status" className="sr-only">
            Loading map
        </span>
    );
}

/** Owns map sizing, provider policy, accessible naming, and region-local recovery. */
export function MapCanvas({
    center = [0, 20],
    zoom = 2,
    controls = true,
    interactive = true,
    blank = false,
    projection = 'mercator',
    viewport,
    onViewportChange,
    empty,
    error,
    children,
    'aria-label': label = 'Map',
    ...props
}: MapOptions & { empty?: boolean; error?: string; children?: ReactNode }) {
    // Reject invalid viewport values before allocating a WebGL context.
    const viewportError =
        coordinateError([center, ...(viewport?.center ? [viewport.center] : [])]) ??
        ([zoom, viewport?.zoom, viewport?.pitch, viewport?.bearing].some(
            (value) => value !== undefined && !Number.isFinite(value)
        )
            ? 'Map viewport values must be finite.'
            : undefined);
    const message = error ?? viewportError;

    return (
        <div
            {...props}
            role="group"
            aria-label={label}
            data-slot="map-root"
            className="relative h-full min-w-0 w-full overflow-hidden"
        >
            {message || empty ? (
                <div
                    role={message ? 'alert' : 'status'}
                    className="flex h-full items-center justify-center text-sm text-muted-foreground"
                >
                    {message ?? 'No map data'}
                </div>
            ) : (
                <ErrorBoundary
                    fallbackRender={({ resetErrorBoundary }) => (
                        <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 text-sm">
                            <span>Unable to load map</span>
                            <Button type="button" size="sm" variant="outline" onClick={resetErrorBoundary}>
                                Retry
                            </Button>
                        </div>
                    )}
                >
                    <mapcn.Map
                        center={center}
                        zoom={zoom}
                        interactive={interactive}
                        blank={blank}
                        projection={{ type: projection }}
                        viewport={viewport}
                        onViewportChange={onViewportChange}
                        transformRequest={(url) => ({ url, credentials: 'same-origin' })}
                    >
                        <MapStatus />
                        {controls && interactive && (
                            <mapcn.MapControls {...(typeof controls === 'object' ? controls : {})} />
                        )}
                        {children}
                    </mapcn.Map>
                </ErrorBoundary>
            )}
        </div>
    );
}
