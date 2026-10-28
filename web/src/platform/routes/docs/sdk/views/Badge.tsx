import ViewLayout from './ViewLayout';
import { Badge } from '@/components/ui/Badge';

/** Documents Badge in LongLink Views. */
export default function BadgePage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Badge"
            introduction={'Displays a count or enumerated state.'}
            properties={[
                {
                    name: 'label',
                    type: 'ReactNode',
                    description: 'Badge content, truncated when space is limited.',
                },
                {
                    name: 'icon',
                    type: 'StoneIconName',
                    description: 'Optional leading icon.',
                },
                {
                    name: 'variant',
                    type: '"success" | "error" | "warning" | "info" | "neutral"',
                    description: 'Status or color variant.',
                },
            ]}
            examples={[
                {
                    title: 'Badge',
                    preview: <BadgeExample />,
                    code: `function Example() {
  return <Badge label="Open" variant="info" />;
}`,
                },
            ]}
        />
    );
}

/** Renders the page's badge example for documentation and the catalog. */
export function BadgeExample() {
    // Display the sample order state.
    return <Badge label="Open" variant="info" />;
}
