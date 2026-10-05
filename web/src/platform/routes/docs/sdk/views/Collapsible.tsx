import ViewLayout from './ViewLayout';

/** Documents Collapsible in LongLink Views. */
export default function CollapsiblePage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Collapsible"
            examples={[
                {
                    title: 'Collapsible',
                    code: `function Example() {
  return (
    <Collapsible trigger="Details">
      <Text>Additional information</Text>
    </Collapsible>
  );
}`,
                },
            ]}
        />
    );
}
