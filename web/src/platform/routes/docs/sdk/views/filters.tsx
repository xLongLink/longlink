import ViewLayout from './view-layout';
import { Filters } from '@/components/longlink';
import { InlineCode } from '@/components/shadcn/inline-code';

export function FiltersExample() {
    return <Filters fields={[{ id: 'city', label: 'City' }]} />;
}

export default function FiltersPage() {
    return (
        <ViewLayout
            name="Filters"
            example={{
                title: 'Filter by city',
                preview: <FiltersExample />,
                code: `export default function Example() {\n  return <Filters fields={[{ id: 'city', label: 'City' }]} />;\n}`
            }}
        >
            <p>
                For controlled filters, initialize state with{' '}
                <InlineCode>useState(() =&gt; createFilterQuery())</InlineCode> and pass <InlineCode>query</InlineCode>{' '}
                and <InlineCode>onQueryChange</InlineCode> to <InlineCode>Filters</InlineCode>.
            </p>
            <p>
                <InlineCode>flattenFilterConditions(query)</InlineCode> returns complete rules as a flat list. It drops
                group structure, so traverse the original query when groups mix AND and OR.
            </p>
        </ViewLayout>
    );
}
