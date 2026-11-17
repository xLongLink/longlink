import ViewLayout from './view-layout';
import { switzerlandAttribution } from './switzerland';
import { SwitzerlandExample } from './switzerland-example';

/** Documents native mapcn composition with a local Switzerland boundary. */
export default function MapcnDocumentation({ name }: { name: 'Map' | 'MapGeoJSON' | 'MapControls' }) {
    return (
        <ViewLayout
            name={name}
            example={{
                title: 'Swiss cantons',
                preview: <SwitzerlandExample />,
                code: `/** @param {{ cantons: MapGeography }} props */
function Switzerland({ cantons }) {
  return (
    <Stack gap={2}>
      <Box width="100%" height={320}>
        <Map blank center={[8.23, 46.8]} zoom={6}>
          <MapGeoJSON data={cantons} linePaint={{ 'line-width': 1 }} />
          <MapControls
            position="top-right"
            showZoom
            showCompass
            showLocate
            showFullscreen
          />
        </Map>
      </Box>
      <Text className="text-xs text-muted-foreground">${switzerlandAttribution}</Text>
    </Stack>
  );
}`
            }}
        />
    );
}
