import ViewLayout from './ViewLayout';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { StatusDot } from '@/components/ui/StatusDot';

/** Documents StatusDot in LongLink Views. */
export default function StatusDotPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="StatusDot"
            examples={[
                {
                    title: 'StatusDot',
                    preview: <StatusDotExample />,
                    code: `function Example() {
  return <StatusDot label="Online" variant="success" />;
}`,
                },
            ]}
        />
    );
}

/** Renders the page's status example for documentation and the catalog. */
export function StatusDotExample() {
    // Pair the visual indicator with a readable status label.
    return (
        <Stack direction="horizontal" align="center" gap={2}>
            <StatusDot label="Online" variant="success" />
            <Text>Online</Text>
        </Stack>
    );
}
