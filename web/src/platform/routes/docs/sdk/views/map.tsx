import ViewLayout from './view-layout';
import { Map as ViewMap, Box } from '@/components/longlink';

/** Documents the shared map container with a world overview. */
export default function MapPage() {
    return (
        <ViewLayout
            name="Map"
            example={{
                title: 'World map',
                preview: <WorldMapExample />,
                code: `function Example() {
  return (
    <Box width="100%" height={320}>
      <Map center={[0, 20]} zoom={0} projection={{ type: 'globe' }} />
    </Box>
  );
}`
            }}
        />
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
