import ViewLayout from './ViewLayout';
import { Stack } from '@astryxdesign/core/Stack';

/** Documents Stack in LongLink Views. */
export default function StackPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Stack"
            examples={[
                {
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
                },
            ]}
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
