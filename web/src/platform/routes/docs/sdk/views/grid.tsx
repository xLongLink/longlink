import ViewLayout from './view-layout';
import { Box } from '@/components/longlink/layout/box';
import { Text } from '@/components/longlink/display/text';
import { Grid, GridItem } from '@/components/longlink/layout/grid';

/** Documents Grid in LongLink Views. */
export default function GridPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Grid"
            example={{
                title: 'Grid',
                preview: <GridExample />,
                code: `function Example() {
  return (
    <Box width={320} maxWidth="100%">
      <Grid columns={2} gap={3}>
        <Box background="outline" padding={3} center>
          <Text>First column</Text>
        </Box>
        <Box background="outline" padding={3} center>
          <Text>Second column</Text>
        </Box>
        <GridItem columns="full">
          <Box background="outline" padding={3} center>
            <Text>Full-width content</Text>
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
                <Box background="outline" padding={3} center>
                    <Text>First column</Text>
                </Box>
                <Box background="outline" padding={3} center>
                    <Text>Second column</Text>
                </Box>
                <GridItem columns="full">
                    <Box background="outline" padding={3} center>
                        <Text>Full-width content</Text>
                    </Box>
                </GridItem>
            </Grid>
        </Box>
    );
}
