import { ErrorBoundary } from 'react-error-boundary';
import { Spinner } from '@/components/shadcn/spinner';
import { lazy, Suspense, type ReactNode } from 'react';
import { Button } from '@/components/longlink/action/button';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';

class FamilyLoadError extends Error {}

async function loadCharts() {
    try {
        return await import('./charts');
    } catch (cause) {
        throw new FamilyLoadError('Unable to load charts', { cause });
    }
}

async function loadMaps() {
    try {
        return await import('./maps');
    } catch (cause) {
        throw new FamilyLoadError('Unable to load maps', { cause });
    }
}

// React.lazy erases generic row inference; the imported components retain their original props.
const LazyAreaChart = lazy(async () => ({
    default: (await loadCharts()).AreaChart
})) as unknown as typeof import('./charts').AreaChart;
const LazyBarChart = lazy(async () => ({
    default: (await loadCharts()).BarChart
})) as unknown as typeof import('./charts').BarChart;
const LazyLineChart = lazy(async () => ({
    default: (await loadCharts()).LineChart
})) as unknown as typeof import('./charts').LineChart;
const LazyPieChart = lazy(async () => ({
    default: (await loadCharts()).PieChart
})) as unknown as typeof import('./charts').PieChart;
const LazyRadarChart = lazy(async () => ({
    default: (await loadCharts()).RadarChart
})) as unknown as typeof import('./charts').RadarChart;
const LazyRadialBarChart = lazy(async () => ({
    default: (await loadCharts()).RadialBarChart
})) as unknown as typeof import('./charts').RadialBarChart;
const LazySankey = lazy(async () => ({ default: (await loadCharts()).Sankey })) as typeof import('./charts').Sankey;
const LazyChartLegend = lazy(async () => ({
    default: (await loadCharts()).ChartLegend
})) as typeof import('./charts').ChartLegend;
const LazyMap = lazy(async () => ({ default: (await loadMaps()).Map }));
export const MapGeoJSON: typeof import('./maps').MapGeoJSON = lazy(async () => ({
    default: (await loadMaps()).MapGeoJSON
}));
export const MapControls: typeof import('./maps').MapControls = lazy(async () => ({
    default: (await loadMaps()).MapControls
}));
const LazyStreetMap = lazy(async () => ({ default: (await loadMaps()).StreetMap }));
const LazyMarkerMap = lazy(async () => ({ default: (await loadMaps()).MarkerMap }));
const LazyRouteMap = lazy(async () => ({ default: (await loadMaps()).RouteMap }));
const LazyClusterMap = lazy(async () => ({ default: (await loadMaps()).ClusterMap }));
const LazyArcMap = lazy(async () => ({ default: (await loadMaps()).ArcMap }));

function Family({ children, name }: { children: ReactNode; name: 'chart' | 'map' }) {
    const { reset } = useQueryErrorResetBoundary();

    return (
        <ErrorBoundary
            onReset={reset}
            fallbackRender={({ error, resetErrorBoundary }) => (
                <div role="alert" className="grid justify-items-start gap-2">
                    <p>Unable to load {name}</p>
                    {error instanceof FamilyLoadError ? (
                        <p>Reload the View to try again.</p>
                    ) : (
                        <Button type="button" size="sm" variant="outline" onClick={resetErrorBoundary}>
                            Retry
                        </Button>
                    )}
                </div>
            )}
        >
            <Suspense
                fallback={
                    <div className="grid min-h-16 place-items-center" role="status">
                        <Spinner aria-label={`Loading ${name}`} className="motion-reduce:animate-none" />
                    </div>
                }
            >
                {children}
            </Suspense>
        </ErrorBoundary>
    );
}

export const AreaChart: typeof import('./charts').AreaChart = (props) => (
    <Family name="chart">
        <LazyAreaChart {...props} />
    </Family>
);
export const BarChart: typeof import('./charts').BarChart = (props) => (
    <Family name="chart">
        <LazyBarChart {...props} />
    </Family>
);
export const LineChart: typeof import('./charts').LineChart = (props) => (
    <Family name="chart">
        <LazyLineChart {...props} />
    </Family>
);
export const PieChart: typeof import('./charts').PieChart = (props) => (
    <Family name="chart">
        <LazyPieChart {...props} />
    </Family>
);
export const RadarChart: typeof import('./charts').RadarChart = (props) => (
    <Family name="chart">
        <LazyRadarChart {...props} />
    </Family>
);
export const RadialBarChart: typeof import('./charts').RadialBarChart = (props) => (
    <Family name="chart">
        <LazyRadialBarChart {...props} />
    </Family>
);
export const Sankey: typeof import('./charts').Sankey = (props) => (
    <Family name="chart">
        <LazySankey {...props} />
    </Family>
);
export const ChartLegend: typeof import('./charts').ChartLegend = (props) => (
    <Family name="chart">
        <LazyChartLegend {...props} />
    </Family>
);
export const Map: typeof import('./maps').Map = (props) => (
    <Family name="map">
        <LazyMap {...props} />
    </Family>
);
export const StreetMap: typeof import('./maps').StreetMap = (props) => (
    <Family name="map">
        <LazyStreetMap {...props} />
    </Family>
);
export const MarkerMap: typeof import('./maps').MarkerMap = (props) => (
    <Family name="map">
        <LazyMarkerMap {...props} />
    </Family>
);
export const RouteMap: typeof import('./maps').RouteMap = (props) => (
    <Family name="map">
        <LazyRouteMap {...props} />
    </Family>
);
export const ClusterMap: typeof import('./maps').ClusterMap = (props) => (
    <Family name="map">
        <LazyClusterMap {...props} />
    </Family>
);
export const ArcMap: typeof import('./maps').ArcMap = (props) => (
    <Family name="map">
        <LazyArcMap {...props} />
    </Family>
);
