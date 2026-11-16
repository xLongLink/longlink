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
                { name: 'children', type: 'ReactNode', description: 'Stack content.' },
                { name: 'gap', type: 'number', description: 'Spacing between items using the shared spacing scale.' },
                { name: 'padding', type: 'number', description: 'Inner padding using the spacing scale.' },
                {
                    name: 'paddingInline',
                    type: 'number',
                    description: 'Horizontal padding, overriding padding on the inline axis.'
                },
                {
                    name: 'paddingBlock',
                    type: 'number',
                    description: 'Vertical padding, overriding padding on the block axis.'
                },
                {
                    name: 'background',
                    type: '"muted"',
                    description: 'Optional muted surface background; omitted stacks remain transparent.'
                },
                {
                    name: 'direction',
                    type: '"horizontal" | "vertical"',
                    description: 'Horizontal or vertical layout direction.'
                },
                {
                    name: 'justify',
                    type: '"start" | "center" | "end" | "between" | "around" | "evenly"',
                    description: 'Main-axis alignment.'
                },
                {
                    name: 'align',
                    type: '"start" | "center" | "end" | "stretch"',
                    description: 'Cross-axis alignment alias. Mirrors CSS align-items.'
                },
                { name: 'wrap', type: '"nowrap" | "wrap" | "wrap-reverse"', description: 'Flex wrap behavior.' },
                {
                    name: 'StackItem.children',
                    type: 'ReactNode',
                    description: 'Content rendered inside the stack item.'
                },
                {
                    name: 'StackItem.size',
                    type: '"fill" | "static"',
                    description: 'Fill items grow into available space; static items keep their intrinsic size.'
                },
                {
                    name: 'StackItem.isScrollable',
                    type: 'boolean',
                    description: 'Scroll overflowing content within a size-constrained stack item.'
                },
                {
                    name: 'StackItem.crossAlignSelf',
                    type: '"start" | "center" | "end" | "stretch"',
                    description:
                        "Overrides this item's cross-axis alignment; omitted values inherit the parent alignment."
                }
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
