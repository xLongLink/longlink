import ViewLayout from './view-layout';
import { Badge } from '@/components/longlink/display/badge';

/** Documents Badge in LongLink Views. */
export default function BadgePage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Badge"
            properties={[
                { name: 'children', type: 'ReactNode', description: 'Badge content, including optional icons.' },
                { name: 'size', type: '"xs" | "sm" | "md" | "lg" | "xl"', description: 'Badge size.' },
                { name: 'radius', type: '"sm" | "full"', description: 'Style radius or pill shape.' },
                {
                    name: 'variant',
                    type: '"primary" | "secondary" | "destructive" | "outline"',
                    description: 'Status or color variant.'
                }
            ]}
            example={{
                title: 'Badge variants',
                preview: <BadgeExample />,
                code: `function Example() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Badge variant="primary">primary</Badge>
      <Badge variant="secondary">secondary</Badge>
      <Badge variant="destructive">destructive</Badge>
      <Badge variant="outline">outline</Badge>
    </div>
  );
}`
            }}
        />
    );
}

/** Renders the page's badge example for documentation and the catalog. */
export function BadgeExample() {
    // Show each variant at its default size in a wrapping row.
    return (
        <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge variant="primary">primary</Badge>
            <Badge variant="secondary">secondary</Badge>
            <Badge variant="destructive">destructive</Badge>
            <Badge variant="outline">outline</Badge>
        </div>
    );
}
