import { z } from 'zod';
import world from './world.json';
import { useState } from 'react';
import ViewLayout from './ViewLayout';
import { Maps } from '@/components/custom/Maps';

const geography = z.json().parse(world);

/** Documents a single generic geographic map component. */
export default function MapsPage() {
    return (
        <ViewLayout
            name="Maps"
            properties={[
                { name: 'label', type: 'string', description: 'Accessible name for the map.' },
                {
                    name: 'geography',
                    type: 'GeoJSON FeatureCollection | TopoJSON Topology',
                    description:
                        'Parsed JSON containing Polygon or MultiPolygon boundaries. No URL fetching or built-in country dataset.'
                },
                {
                    name: 'objectName',
                    type: 'string',
                    description: 'TopoJSON object to display; defaults to the first object. Ignored for GeoJSON.'
                },
                {
                    name: 'labelKey',
                    type: 'string',
                    description: 'Feature property used for accessible labels and native tooltips; defaults to name.'
                },
                {
                    name: 'selectedId',
                    type: 'string',
                    description: 'Controlled selection matching the string form of a feature ID.'
                },
                {
                    name: 'onSelect',
                    type: '(id: string) => void',
                    description: 'Called on click, Enter or Space. Only features with an ID become interactive.'
                },
                {
                    name: 'projection',
                    type: '"geoEqualEarth" | "geoMercator" | "geoEquirectangular"',
                    description: 'Map projection; defaults to geoEqualEarth.'
                },
                {
                    name: 'center',
                    type: '[number, number]',
                    description: 'Projection center as longitude and latitude; defaults to [0, 0].'
                },
                {
                    name: 'scale',
                    type: 'number',
                    description: 'Projection scale in the fixed 800 × 400 coordinate space; defaults to 140.'
                },
                {
                    name: 'height',
                    type: 'number',
                    description: 'Height in pixels; defaults to 320. Width follows the parent.'
                }
            ]}
            example={{
                title: 'Maps',
                preview: <MapsExample />,
                code: `function Example({ geography }) {
  const [selectedId, setSelectedId] = useState('756');

  return (
    <Maps
      label="Regions"
      geography={geography}
      selectedId={selectedId}
      onSelect={setSelectedId}
    />
  );
}`
            }}
        />
    );
}

/** Shows real TopoJSON boundaries without making the runtime country-specific. */
export function MapsExample({ height = 320 }: { height?: number }) {
    const [selectedId, setSelectedId] = useState('756');

    return (
        <Maps
            label="Regions"
            geography={geography}
            objectName="countries"
            height={height}
            selectedId={selectedId}
            onSelect={setSelectedId}
        />
    );
}
