import ViewLayout from './view-layout';
import { MapExample, type MapName } from './map-example';

/** Documents the props-based map elements with parent-controlled sizing. */
export default function MapDocumentation({ name }: { name: Exclude<MapName, 'GeoJSONMap'> }) {
    const dataType = name === 'RouteMap' ? 'MapRoute[]' : name === 'ArcMap' ? 'MapArc[]' : 'MapMarker[]';
    const data =
        name === 'StreetMap'
            ? ''
            : name === 'RouteMap'
              ? `const data = [{ id: 'delivery', coordinates: [[8.5417, 47.3769], [8.3093, 47.0502], [7.4474, 46.948]] }];`
              : name === 'ArcMap'
                ? `const data = [
    { id: 'paris', from: [8.5417, 47.3769], to: [2.3522, 48.8566] },
    { id: 'rome', from: [8.5417, 47.3769], to: [12.4964, 41.9028] },
  ];`
                : `const data = [
    { id: 'zurich', coordinates: [8.5417, 47.3769], label: 'Zurich', description: 'Main office' },
    { id: 'bern', coordinates: [7.4474, 46.948], label: 'Bern', description: 'Regional office' },
    { id: 'lucerne', coordinates: [8.3093, 47.0502], label: 'Lucerne', description: 'Service center' },
  ];`;

    return (
        <ViewLayout
            name={name}
            example={{
                title: name,
                preview: <MapExample name={name} />,
                code: `function Example() {
  ${data ? `/** @type {${dataType}} */\n  ${data}\n\n  ` : ''}return (
    <Box width="100%" height={320}>
      <${name}${name === 'StreetMap' ? '' : ' data={data}'} center={[8.1, 47.2]} zoom={${name === 'ArcMap' ? '3.5' : '6.5'}} aria-label="${name === 'ArcMap' ? 'Office connections' : 'Swiss service network'}" />
    </Box>
  );
}`
            }}
        />
    );
}
