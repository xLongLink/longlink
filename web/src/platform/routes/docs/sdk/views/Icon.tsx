import ViewLayout from './ViewLayout';

/** Documents Icon in LongLink Views. */
export default function IconPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Icon"
            examples={[
                {
                    title: 'Icon',
                    code: `function Example() {
  return <Icon icon="search" size="md" />;
}`,
                },
            ]}
        />
    );
}
