import ViewLayout from './view-layout';
import { Box } from '@/components/longlink/layout/box';
import { Text } from '@/components/longlink/display/text';
import { Stack, StackItem } from '@/components/longlink/layout/stack';

/** Documents Stack in LongLink Views. */
export default function StackPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Stack"
            properties={[
                { name: 'children', type: 'ReactNode' },
                { name: 'gap', type: 'number' },
                { name: 'padding', type: 'number' },
                { name: 'paddingInline', type: 'number' },
                { name: 'paddingBlock', type: 'number' },
                { name: 'background', type: '"muted"' },
                { name: 'direction', type: '"horizontal" | "vertical"' },
                { name: 'justify', type: '"start" | "center" | "end" | "between" | "around" | "evenly"' },
                { name: 'align', type: '"start" | "center" | "end" | "stretch"' },
                { name: 'wrap', type: '"nowrap" | "wrap" | "wrap-reverse"' },
                { name: 'StackItem.children', type: 'ReactNode' },
                { name: 'StackItem.size', type: '"fill" | "static"' },
                { name: 'StackItem.isScrollable', type: 'boolean' },
                { name: 'StackItem.crossAlignSelf', type: '"start" | "center" | "end" | "stretch"' }
            ]}
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
