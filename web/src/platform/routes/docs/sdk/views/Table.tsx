import ViewLayout from './ViewLayout';

/** Documents Table in LongLink Views. */
export default function TablePage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Table"
            examples={[
                {
                    title: 'Table',
                    code: `function Example() {
  return (
    <Table
      data={[{ id: '1', name: 'Order', status: 'Open' }]}
      idKey="id"
      columns={[
        { key: 'name', header: 'Name', width: proportional(2) },
        { key: 'status', header: 'Status', width: proportional(1) },
      ]}
    />
  );
}`,
                },
            ]}
        />
    );
}
