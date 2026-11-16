import ViewLayout from './view-layout';
import { switzerlandAttribution } from './switzerland';
import { SwitzerlandExample } from './switzerland-example';
import catalog from '../../../../../../../sdk/longlink/.static/jsx/components.json';

/** Documents native mapcn composition with a local Switzerland boundary. */
export default function MapcnDocumentation({ name }: { name: 'Map' | 'MapGeoJSON' | 'MapControls' }) {
    const component = catalog.components.find((entry) => entry.name === name);

    return (
        <ViewLayout
            name={name}
            properties={component?.properties ?? []}
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
