import ViewLayout from './ViewLayout';

/** Documents EmptyState in LongLink Views. */
export default function EmptyStatePage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="EmptyState"
            examples={[
                {
                    title: 'EmptyState',
                    code: `function Example() {
  return <EmptyState title="No results found" />;
}`,
                },
            ]}
        />
    );
}
