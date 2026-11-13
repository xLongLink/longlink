import ViewLayout from './ViewLayout';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/shadcn/empty';

/** Documents EmptyState in LongLink Views. */
export default function EmptyStatePage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="EmptyState"
            properties={[
                {
                    name: 'Empty.children',
                    type: 'ReactNode',
                    description: 'Compose EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, and EmptyMedia.'
                },
                {
                    name: 'Empty.className',
                    type: 'string',
                    description:
                        'Native div props are forwarded unchanged. EmptyState is a custom adapter for semantic headings and scoped result announcements.'
                },
                {
                    name: 'title',
                    type: 'string',
                    description: 'Custom EmptyState heading with scoped result announcements.'
                },
                {
                    name: 'isCompact',
                    type: 'boolean',
                    description: 'Custom EmptyState compact spacing for constrained result regions.'
                }
            ]}
            example={{
                title: 'Native composition',
                preview: <EmptyStateExample />,
                code: `function Example() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>No results found</EmptyTitle>
        <EmptyDescription>Try changing your filters.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}`
            }}
        />
    );
}

/** Renders the page's empty-state example for documentation and the catalog. */
export function EmptyStateExample() {
    // Display feedback for an empty result set.
    return (
        <Empty>
            <EmptyHeader>
                <EmptyTitle>No results found</EmptyTitle>
                <EmptyDescription>Try changing your filters.</EmptyDescription>
            </EmptyHeader>
        </Empty>
    );
}
