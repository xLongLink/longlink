import ViewLayout from './ViewLayout';

/** Documents Heading in LongLink Views. */
export default function HeadingPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Heading"
            examples={[
                {
                    title: 'Heading',
                    code: `function Example() {
  return <Heading level={2}>Order details</Heading>;
}`,
                },
            ]}
        />
    );
}
