import ViewLayout from './view-layout';
import { Filters } from '@/components/longlink';

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
                code: `function Example() {\n  return <Filters fields={[{ id: 'city', label: 'City' }]} />;\n}`
            }}
        />
    );
}
