import MapcnDocumentation from './mapcn-documentation';
import { Box, Map as ViewMap, MapControls } from '@/components/longlink';

/** Documents mapcn zoom, compass, location, and fullscreen controls. */
export default function MapControlsPage() {
    return <MapcnDocumentation name="MapControls" />;
}

/** Isolates the controls on a transparent map for the catalog card. */
export function MapControlsPreview() {
    return (
        <Box width={50} height={202}>
            <ViewMap blank interactive={false}>
                <MapControls position="top-right" showZoom showCompass showLocate showFullscreen />
            </ViewMap>
        </Box>
    );
}
