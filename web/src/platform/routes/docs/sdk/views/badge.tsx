import ViewLayout from './view-layout';
import { Stack } from '@/components/longlink/layout/stack';
import { Badge } from '@/components/longlink/display/badge';

/** Documents Badge in LongLink Views. */
export default function BadgePage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Badge"
            example={{
                title: 'Badge variants',
                preview: <BadgeExample />,
                code: `function Example() {
  return (
    <Stack direction="horizontal" wrap="wrap" align="center" justify="center" gap={2}>
      <Badge variant="primary">primary</Badge>
      <Badge variant="secondary">secondary</Badge>
      <Badge variant="destructive">destructive</Badge>
      <Badge variant="outline">outline</Badge>
    </Stack>
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
        <Stack direction="horizontal" wrap="wrap" align="center" justify="center" gap={2}>
            <Badge variant="primary">primary</Badge>
            <Badge variant="secondary">secondary</Badge>
            <Badge variant="destructive">destructive</Badge>
            <Badge variant="outline">outline</Badge>
        </Stack>
    );
}
