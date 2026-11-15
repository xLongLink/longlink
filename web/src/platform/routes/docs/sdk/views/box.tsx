import ViewLayout from './view-layout';
import { Box } from '@/components/longlink/layout/box';
import { Grid } from '@/components/longlink/layout/grid';
import { Text } from '@/components/longlink/display/text';
import { Stack } from '@/components/longlink/layout/stack';

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
                { name: 'background', type: '"none" | "primary" | "secondary" | "outline"' }
            ]}
            example={{
                title: 'Box styles',
                preview: <BoxExample />,
                code: `function Example() {
  return (
    <Box width={320} maxWidth="100%">
      <Grid columns={2} gap={3}>
        <Box background="none">
          <Stack padding={4} align="center"><Text>none</Text></Stack>
        </Box>
        <Box background="primary">
          <Stack padding={4} align="center"><Text>primary</Text></Stack>
        </Box>
        <Box background="secondary">
          <Stack padding={4} align="center"><Text>secondary</Text></Stack>
        </Box>
        <Box background="outline">
          <Stack padding={4} align="center"><Text>outline</Text></Stack>
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
                <Box background="none">
                    <Stack padding={4} align="center">
                        <Text>none</Text>
                    </Stack>
                </Box>
                <Box background="primary">
                    <Stack padding={4} align="center">
                        <Text>primary</Text>
                    </Stack>
                </Box>
                <Box background="secondary">
                    <Stack padding={4} align="center">
                        <Text>secondary</Text>
                    </Stack>
                </Box>
                <Box background="outline">
                    <Stack padding={4} align="center">
                        <Text>outline</Text>
                    </Stack>
                </Box>
            </Grid>
        </Box>
    );
}
