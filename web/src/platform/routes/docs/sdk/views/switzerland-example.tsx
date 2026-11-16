import { switzerland } from './switzerland';
import { Box } from '@/components/longlink/layout/box';
import { SwitzerlandAttribution } from './switzerland-attribution';
import { Map as ViewMap, MapGeoJSON, MapControls } from '@/components/longlink';

/** Shows detailed Swiss canton boundaries without street tiles. */
export function SwitzerlandExample({ height = 320, isCompact = false }: { height?: number; isCompact?: boolean }) {
    return (
        <div className="flex w-full flex-col gap-2">
            <Box width="100%" height={height}>
                <ViewMap
                    blank
                    center={[8.23, 46.8]}
                    zoom={isCompact || height < 320 ? 4.8 : 6}
                    interactive={!isCompact}
                >
                    <MapGeoJSON data={switzerland} linePaint={{ 'line-width': 1 }} />
                    {!isCompact && <MapControls position="top-right" showZoom showCompass showLocate showFullscreen />}
                </ViewMap>
            </Box>
            <SwitzerlandAttribution />
        </div>
    );
}
