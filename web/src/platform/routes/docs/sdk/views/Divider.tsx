import ViewLayout from './ViewLayout';
import { Divider } from '@/components/ui/Divider';

/** Documents Divider in LongLink Views. */
export default function DividerPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Divider"
            introduction={'Separates View content with an optional label and configurable line presentation.'}
            properties={[
                {
                    name: 'label',
                    type: 'ReactNode',
                    description: 'Optional label centered on the divider.',
                },
                {
                    name: 'variant',
                    type: '"subtle" | "strong"',
                    description: 'Visual weight of the divider line.',
                },
                {
                    name: 'orientation',
                    type: '"horizontal" | "vertical"',
                    description: 'Orientation of the divider.',
                },
                {
                    name: 'isFullBleed',
                    type: 'boolean',
                    description: 'Extend the divider to container edges with negative margins.',
                },
            ]}
            example={{
                title: 'Divider',
                preview: <DividerExample />,
                code: `function Example() {
  return (
    <Stack gap={3}>
      <Text>Before</Text>
      <Divider />
      <Text>After</Text>
    </Stack>
  );
}`,
            }}
        />
    );
}

/** Renders the page's divider example for documentation and the catalog. */
export function DividerExample() {
    // Display the standard content separator.
    return <Divider />;
}
