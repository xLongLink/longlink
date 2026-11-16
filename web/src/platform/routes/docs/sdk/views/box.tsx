import ViewLayout from './view-layout';
import { Box } from '@/components/longlink/layout/box';
import { Grid } from '@/components/longlink/layout/grid';
import { Text } from '@/components/longlink/display/text';

/** Documents Box sizing and semantic backgrounds in LongLink Views. */
export default function BoxPage() {
    return (
        <ViewLayout
            name="Box"
            properties={[
                { name: 'children', type: 'ReactNode' },
                { name: 'width', type: 'string | number' },
                { name: 'height', type: 'string | number' },
                { name: 'maxWidth', type: 'string | number' },
                { name: 'minHeight', type: 'string | number' },
                { name: 'center', type: 'boolean' },
                { name: 'background', type: '"none" | "primary" | "secondary" | "outline"' }
            ]}
            example={{
                title: 'Box styles',
                preview: <BoxExample />,
                code: `function Example() {
  return (
    <Box width={320} maxWidth="100%">
      <Grid columns={2} gap={3}>
        <Box height={96} center background="none">
          <Text>none</Text>
        </Box>
        <Box height={96} center background="primary">
          <Text>primary</Text>
        </Box>
        <Box height={96} center background="secondary">
          <Text>secondary</Text>
        </Box>
        <Box height={96} center background="outline">
          <Text>outline</Text>
        </Box>
      </Grid>
    </Box>
  );
}`
            }}
        />
    );
}

/** Shows each semantic background with its inherited foreground color. */
export function BoxExample() {
    return (
        <Box width={320} maxWidth="100%">
            <Grid columns={2} gap={3}>
                <Box height={96} center background="none">
                    <Text>none</Text>
                </Box>
                <Box height={96} center background="primary">
                    <Text>primary</Text>
                </Box>
                <Box height={96} center background="secondary">
                    <Text>secondary</Text>
                </Box>
                <Box height={96} center background="outline">
                    <Text>outline</Text>
                </Box>
            </Grid>
        </Box>
    );
}
