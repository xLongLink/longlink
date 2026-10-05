import ViewLayout from './ViewLayout';
import { useState, type ComponentProps } from 'react';
import { PowerSearch } from '@/components/ui/PowerSearch';

/** Documents PowerSearch in LongLink Views. */
export default function PowerSearchPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="PowerSearch"
            examples={[
                {
                    title: 'PowerSearch',
                    preview: <PowerSearchExample />,
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

/** Keeps structured search filters local to this example. */
export function PowerSearchExample() {
    const [filters, setFilters] = useState<ComponentProps<typeof PowerSearch>['filters']>([]);

    // Support adding, editing, and removing status filters without querying orders.
    return (
        <PowerSearch
            config={{
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
            }}
            filters={filters}
            onChange={setFilters}
            label="Search orders"
        />
    );
}
