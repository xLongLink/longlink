import ViewLayout from './ViewLayout';

/** Documents StatusDot in LongLink Views. */
export default function StatusDotPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="StatusDot"
            examples={[
                {
                    title: 'StatusDot',
                    code: `function Example() {
  return <StatusDot label="Online" variant="success" />;
}`,
                },
            ]}
        />
    );
}
