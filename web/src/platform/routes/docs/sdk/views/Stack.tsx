import ViewLayout from './ViewLayout';
import { Stack } from '@astryxdesign/core/Stack';

/** Documents Stack in LongLink Views. */
export default function StackPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Stack"
            introduction={'Arranges View content using the LongLink spacing scale.'}
            properties={[
                {
                    name: 'children',
                    type: 'ReactNode',
                    description: 'Stack content.',
                },
                {
                    name: 'width',
                    type: 'string | number',
                    description: 'Container width; numbers are pixels and strings are CSS sizes.',
                },
                {
                    name: 'height',
                    type: 'string | number',
                    description: 'Container height; numbers are pixels and strings are CSS sizes.',
                },
                {
                    name: 'maxWidth',
                    type: 'string | number',
                    description: 'Maximum container width; numbers are pixels and strings are CSS sizes.',
                },
                {
                    name: 'minHeight',
                    type: 'string | number',
                    description: 'Minimum container height; numbers are pixels and strings are CSS sizes.',
                },
                {
                    name: 'gap',
                    type: '0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 | 8 | 10',
                    description: 'Spacing between items.',
                },
                {
                    name: 'padding',
                    type: '0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 | 8 | 10',
                    description: 'Inner padding using the spacing scale.',
                },
                {
                    name: 'paddingInline',
                    type: '0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 | 8 | 10',
                    description: 'Horizontal padding, overriding padding on the inline axis.',
                },
                {
                    name: 'paddingBlock',
                    type: '0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 | 8 | 10',
                    description: 'Vertical padding, overriding padding on the block axis.',
                },
                {
                    name: 'background',
                    type: '"muted"',
                    description: 'Optional muted surface background; omitted stacks remain transparent.',
                },
                {
                    name: 'direction',
                    type: '"horizontal" | "vertical"',
                    description: 'Horizontal or vertical layout direction.',
                },
                {
                    name: 'justify',
                    type: '"start" | "center" | "end" | "between" | "around" | "evenly"',
                    description: 'Main-axis alignment.',
                },
                {
                    name: 'align',
                    type: '"start" | "center" | "end" | "stretch"',
                    description: 'Cross-axis alignment alias. Mirrors CSS align-items.',
                },
                {
                    name: 'wrap',
                    type: '"nowrap" | "wrap" | "wrap-reverse"',
                    description: 'Flex wrap behavior.',
                },
                {
                    name: 'StackItem.children',
                    type: 'ReactNode',
                    description: 'Content rendered inside the stack item.',
                },
                {
                    name: 'StackItem.size',
                    type: '"fill" | "static"',
                },
                {
                    name: 'StackItem.isScrollable',
                    type: 'boolean',
                },
                {
                    name: 'StackItem.crossAlignSelf',
                    type: '"start" | "center" | "end" | "stretch"',
                    description:
                        "Overrides this item's cross-axis alignment; omitted values inherit the parent alignment.",
                },
            ]}
            example={{
                title: 'Stack',
                preview: <StackExample />,
                code: `function Example() {
  return (
    <Stack direction="horizontal" gap={3}>
      <Text>Label</Text>
      <StackItem size="fill">
        <Text>Flexible content</Text>
      </StackItem>
    </Stack>
  );
}`,
            }}
        />
    );
}

/** Renders the page's stack example for documentation and the catalog. */
export function StackExample() {
    // Arrange presentation-only items with consistent spacing.
    return (
        <Stack align="center" gap={2}>
            <Stack aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
            <Stack aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
            <Stack aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
        </Stack>
    );
}
