import { switzerland, switzerlandAttribution } from './switzerland';
import { Box, Map as ViewMap, MapGeoJSON, MapControls } from '@/components/longlink';

/** Shows detailed Swiss canton boundaries without street tiles. */
export function SwitzerlandExample({
    height = 320,
    isCompact = false,
    showControls = false
}: {
    height?: number;
    isCompact?: boolean;
    showControls?: boolean;
}) {
    return (
        <Box width="100%" height={height}>
            <ViewMap
                blank
                center={[8.23, 46.8]}
                zoom={isCompact || height < 320 ? 4.8 : 6}
                interactive={!isCompact}
                attributionControl={{ compact: true, customAttribution: switzerlandAttribution }}
            >
                <MapGeoJSON data={switzerland} linePaint={{ 'line-width': 1 }} />
                {showControls && !isCompact && (
                    <MapControls position="top-right" showZoom showCompass showLocate showFullscreen />
                )}
            </ViewMap>
        </Box>
    );
}
