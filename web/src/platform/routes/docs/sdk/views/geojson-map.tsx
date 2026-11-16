import ViewLayout from './view-layout';
import { MapExample } from './map-example';
import { switzerlandAttribution } from './switzerland';
import catalog from '../../../../../../../sdk/longlink/.static/jsx/components.json';

/** Documents detailed canton boundaries from supplied GeoJSON. */
export default function GeoJSONMapPage() {
    const component = catalog.components.find((entry) => entry.name === 'GeoJSONMap');

    return (
        <ViewLayout
            name="GeoJSONMap"
            properties={component?.properties ?? []}
            example={{
                title: 'Swiss cantons',
                preview: <MapExample name="GeoJSONMap" />,
                code: `/** @param {{ cantons: MapGeography }} props */
function Switzerland({ cantons }) {
  return (
    <Stack gap={2}>
      <Box width="100%" height={320}>
        <GeoJSONMap
          data={cantons}
          blank
          controls={{
            position: 'top-right',
            showZoom: true,
            showCompass: true,
            showLocate: true,
            showFullscreen: true,
          }}
          center={[8.23, 46.8]}
          zoom={6}
          aria-label="Swiss cantons"
        />
      </Box>
      <Text className="text-xs text-muted-foreground">${switzerlandAttribution}</Text>
    </Stack>
  );
}`
            }}
        />
    );
}
