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
                title: 'Order statuses',
                preview: <BadgeExample />,
                code: `function Example() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Badge variant="secondary">Draft</Badge>
      <Badge variant="info-light">Open</Badge>
      <Badge variant="warning-light">Pending</Badge>
      <Badge variant="success-light">Paid</Badge>
      <Badge variant="destructive-light">Overdue</Badge>
    </div>
  );
}`
            }}
        />
    );
}

/** Renders the page's badge example for documentation and the catalog. */
export function BadgeExample() {
    // Keep status badges at their default size in a wrapping row.
    return (
        <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge variant="secondary">Draft</Badge>
            <Badge variant="info-light">Open</Badge>
            <Badge variant="warning-light">Pending</Badge>
            <Badge variant="success-light">Paid</Badge>
            <Badge variant="destructive-light">Overdue</Badge>
        </div>
    );
}
