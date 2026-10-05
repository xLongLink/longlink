import ViewLayout from './ViewLayout';
import { EmptyState } from '@/components/ui/EmptyState';

/** Documents EmptyState in LongLink Views. */
export default function EmptyStatePage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="EmptyState"
            examples={[
                {
                    title: 'EmptyState',
                    preview: <EmptyStateExample />,
                    code: `function Example() {
  return <EmptyState title="No results found" />;
}`,
                },
            ]}
        />
    );
}

/** Renders the page's empty-state example for documentation and the catalog. */
export function EmptyStateExample() {
    // Display feedback for an empty result set.
    return <EmptyState title="No results found" />;
}
