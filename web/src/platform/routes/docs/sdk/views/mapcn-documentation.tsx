import ViewLayout from './view-layout';
import { switzerlandAttribution } from './switzerland';
import { SwitzerlandExample } from './switzerland-example';

/** Documents native mapcn composition with a local Switzerland boundary. */
export default function MapcnDocumentation({ name }: { name: 'MapGeoJSON' | 'MapControls' }) {
    return (
        <ViewLayout
            name={name}
            example={{
                title: 'Swiss cantons',
                preview: <SwitzerlandExample showControls={name === 'MapControls'} />,
                code: `/** @param {{ cantons: MapGeography }} props */
function Switzerland({ cantons }) {
  return (
    <Box width="100%" height={320}>
      <Map
        blank
        center={[8.23, 46.8]}
        zoom={6}
        attributionControl={{ compact: true, customAttribution: ${JSON.stringify(switzerlandAttribution)} }}
      >
        <MapGeoJSON data={cantons} linePaint={{ 'line-width': 1 }} />${
            name === 'MapControls'
                ? `
        <MapControls
          position="top-right"
          showZoom
          showCompass
          showLocate
          showFullscreen
        />`
                : ''
        }
      </Map>
    </Box>
  );
}`
            }}
        />
    );
}
