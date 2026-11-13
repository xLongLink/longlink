import ViewLayout from './view-layout';
import { Badge } from '@/components/reui/badge';

/** Documents Badge in LongLink Views. */
export default function BadgePage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Badge"
            properties={[
                { name: 'children', type: 'ReactNode', description: 'Badge content, including optional icons.' },
                { name: 'size', type: '"default" | "xs" | "sm" | "lg" | "xl"', description: 'Badge size.' },
                { name: 'radius', type: '"default" | "full"', description: 'Style radius or pill shape.' },
                {
                    name: 'variant',
                    type: '"default" | "secondary" | "outline" | "info" | "success" | "warning" | "destructive" | "focus" | "invert" | "primary-light" | "warning-light" | "success-light" | "info-light" | "destructive-light" | "invert-light" | "focus-light" | "primary-outline" | "warning-outline" | "success-outline" | "info-outline" | "destructive-outline" | "invert-outline" | "focus-outline"',
                    description: 'Status or color variant.'
                }
            ]}
            example={{
                title: 'Badge',
                preview: <BadgeExample />,
                code: `function Example() {
  return <Badge variant="info-light">Open</Badge>;
}`
            }}
        />
    );
}

/** Renders the page's badge example for documentation and the catalog. */
export function BadgeExample() {
    // Display the sample order state.
    return <Badge variant="info-light">Open</Badge>;
}
