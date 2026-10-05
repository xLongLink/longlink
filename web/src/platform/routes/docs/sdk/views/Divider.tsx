import ViewLayout from './ViewLayout';
import { Divider } from '@/components/ui/Divider';

/** Documents Divider in LongLink Views. */
export default function DividerPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Divider"
            examples={[
                {
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
                },
            ]}
        />
    );
}

/** Renders the page's divider example for documentation and the catalog. */
export function DividerExample() {
    // Display the standard content separator.
    return <Divider />;
}
