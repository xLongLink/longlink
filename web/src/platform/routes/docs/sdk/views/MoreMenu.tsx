import ViewLayout from './ViewLayout';

/** Documents MoreMenu in LongLink Views. */
export default function MoreMenuPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="MoreMenu"
            examples={[
                {
                    title: 'MoreMenu',
                    code: `function Example() {
  return (
    <MoreMenu
      items={[{ id: 'edit', label: 'Edit', onClick: () => navigate('/edit') }]}
    />
  );
}`,
                },
            ]}
        />
    );
}
