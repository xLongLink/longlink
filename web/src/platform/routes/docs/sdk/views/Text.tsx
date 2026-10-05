import ViewLayout from './ViewLayout';

/** Documents Text in LongLink Views. */
export default function TextPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Text"
            examples={[
                {
                    title: 'Text',
                    code: `function Example() {
  return <Text>Order details</Text>;
}`,
                },
            ]}
        />
    );
}
