import ViewLayout from './view-layout';
import { Box } from '@/components/longlink/layout/box';
import { Text } from '@/components/longlink/display/text';
import { Stack } from '@/components/longlink/layout/stack';
import { Grid, GridItem } from '@/components/longlink/layout/grid';

/** Documents Grid in LongLink Views. */
export default function GridPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Grid"
            properties={[
                { name: 'children', type: 'ReactNode', description: 'Grid content.' },
                {
                    name: 'columns',
                    type: 'number',
                    description:
                        'Number of equal-width columns. Automatically uses one column at viewport widths of 768px or less.'
                },
                { name: 'gap', type: 'number', description: 'Spacing between all items.' },
                {
                    name: 'align',
                    type: '"start" | "center" | "end" | "stretch"',
                    description: 'Vertical alignment of items.'
                },
                {
                    name: 'justify',
                    type: '"start" | "center" | "end" | "stretch"',
                    description: 'Horizontal alignment of items.'
                },
                { name: 'GridItem.children', type: 'ReactNode', description: 'Content rendered inside the grid item.' },
                {
                    name: 'GridItem.columns',
                    type: 'number | "full"',
                    description: 'Number of columns to occupy, or full to span the entire grid.'
                }
            ]}
            example={{
                title: 'Grid',
                preview: <GridExample />,
                code: `function Example() {
  return (
    <Box width={320} maxWidth="100%">
      <Grid columns={2} gap={3}>
        <Box background="outline">
          <Stack padding={3} align="center">
            <Text>First column</Text>
          </Stack>
        </Box>
        <Box background="outline">
          <Stack padding={3} align="center">
            <Text>Second column</Text>
          </Stack>
        </Box>
        <GridItem columns="full">
          <Box background="outline">
            <Stack padding={3} align="center">
              <Text>Full-width content</Text>
            </Stack>
          </Box>
        </GridItem>
      </Grid>
    </Box>
  );
}`
            }}
        />
    );
}

/** Renders the page's grid example for documentation and the catalog. */
export function GridExample() {
    // Show two columns and an item spanning the full row.
    return (
        <Box width={320} maxWidth="100%">
            <Grid columns={2} gap={3}>
                <Box background="outline">
                    <Stack padding={3} align="center">
                        <Text>First column</Text>
                    </Stack>
                </Box>
                <Box background="outline">
                    <Stack padding={3} align="center">
                        <Text>Second column</Text>
                    </Stack>
                </Box>
                <GridItem columns="full">
                    <Box background="outline">
                        <Stack padding={3} align="center">
                            <Text>Full-width content</Text>
                        </Stack>
                    </Box>
                </GridItem>
            </Grid>
        </Box>
    );
}
