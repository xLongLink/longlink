import ViewLayout from './ViewLayout';

/** Documents PowerSearch in LongLink Views. */
export default function PowerSearchPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="PowerSearch"
            examples={[
                {
                    title: 'PowerSearch',
                    code: `function Example() {
  const [filters, setFilters] = useState([]);

  const config = {
    name: 'Orders',
    fields: [
      {
        key: 'status',
        label: 'Status',
        operators: [
          {
            key: 'is',
            label: 'is',
            value: {
              type: 'enum',
              values: [
                { value: 'open', label: 'Open' },
                { value: 'closed', label: 'Closed' },
              ],
            },
          },
        ],
      },
    ],
  };

  return (
    <PowerSearch
      config={config}
      filters={filters}
      onChange={setFilters}
      label="Search orders"
    />
  );
}`,
                },
            ]}
        />
    );
}
