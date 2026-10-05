import ViewLayout from './ViewLayout';

/** Documents Badge in LongLink Views. */
export default function BadgePage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Badge"
            examples={[
                {
                    title: 'Badge',
                    code: `function Example() {
  return <Badge label="Open" variant="info" />;
}`,
                },
            ]}
        />
    );
}
