import ViewLayout from './ViewLayout';
import { Link } from '@/components/ui/Link';

/** Documents Link in LongLink Views. */
export default function LinkPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Link"
            examples={[
                {
                    title: 'Link',
                    preview: <LinkExample />,
                    code: `function Example() {
  return <Link to="/orders">Orders</Link>;
}`,
                },
            ]}
        />
    );
}

/** Demonstrates navigation to an existing documentation page. */
export function LinkExample() {
    // Avoid navigating to a nonexistent Solution route from the example.
    return <Link to="/docs/sdk/views">Docs</Link>;
}
