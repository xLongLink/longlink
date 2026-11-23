import ViewLayout from './view-layout';
import { Map as ViewMap, Box } from '@/components/longlink';
import { InlineCode } from '@/components/shadcn/inline-code';

/** Documents the shared map container with a world overview. */
export default function MapPage() {
    return (
        <ViewLayout
            name="Map"
            example={{
                title: 'World map',
                preview: <WorldMapExample />,
                code: `export default function Example() {
  return (
    <Box width="100%" height={320}>
      <Map center={[0, 20]} zoom={0} projection={{ type: 'globe' }} />
    </Box>
  );
}`
            }}
        >
            <p>
                Use <InlineCode>{'<Map />'}</InlineCode> to render a map. In ordinary JavaScript expressions,{' '}
                <InlineCode>Map</InlineCode> is still the built-in constructor, so <InlineCode>new Map()</InlineCode>{' '}
                creates a key-value collection.
            </p>
        </ViewLayout>
    );
}

/** Shows the world without layers or controls obscuring the base map. */
export function WorldMapExample({ height = 320, isCompact = false }: { height?: number; isCompact?: boolean }) {
    return (
        <Box width="100%" height={height}>
            <ViewMap center={[0, 20]} zoom={0} projection={{ type: 'globe' }} interactive={!isCompact} />
        </Box>
    );
}
