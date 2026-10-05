import ViewLayout from './ViewLayout';

/** Documents Link in LongLink Views. */
export default function LinkPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Link"
            examples={[
                {
                    title: 'Link',
                    code: `function Example() {
  return <Link to="/orders">Orders</Link>;
}`,
                },
            ]}
        />
    );
}
