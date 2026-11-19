import ViewLayout from './view-layout';
import { Box, Text, Stack, StackItem } from '@/components/longlink';

/** Documents Stack in LongLink Views. */
export default function StackPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Stack"
            example={{
                title: 'Stack',
                preview: <StackExample />,
                code: `function Example() {
  return (
    <Box width={320} maxWidth="100%">
      <Stack direction="horizontal" align="center" gap={3}>
        <Box background="outline">
          <Stack padding={3}>
            <Text>Label</Text>
          </Stack>
        </Box>
        <StackItem size="fill">
          <Box background="outline">
            <Stack padding={3}>
              <Text>Flexible content</Text>
            </Stack>
          </Box>
        </StackItem>
      </Stack>
    </Box>
  );
}`
            }}
        />
    );
}

/** Renders the page's stack example for documentation and the catalog. */
export function StackExample() {
    // Arrange presentation-only items with consistent spacing.
    return (
        <Box width={320} maxWidth="100%">
            <Stack direction="horizontal" align="center" gap={3}>
                <Box background="outline">
                    <Stack padding={3}>
                        <Text>Label</Text>
                    </Stack>
                </Box>
                <StackItem size="fill">
                    <Box background="outline">
                        <Stack padding={3}>
                            <Text>Flexible content</Text>
                        </Stack>
                    </Box>
                </StackItem>
            </Stack>
        </Box>
    );
}
