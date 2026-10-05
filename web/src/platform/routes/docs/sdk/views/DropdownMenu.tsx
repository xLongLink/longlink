import ViewLayout from './ViewLayout';

/** Documents DropdownMenu in LongLink Views. */
export default function DropdownMenuPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="DropdownMenu"
            examples={[
                {
                    title: 'DropdownMenu',
                    code: `function Example() {
  return (
    <DropdownMenu
      button={{ label: 'Actions' }}
      items={[{ id: 'edit', label: 'Edit', onClick: () => navigate('/edit') }]}
    />
  );
}`,
                },
            ]}
        />
    );
}
