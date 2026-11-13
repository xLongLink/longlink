import ViewLayout from './ViewLayout';
import { ChartExample, type ChartName } from './ChartExample';

/** Documents the shared data contract without duplicating it across chart types. */
export default function ChartDocumentation({ name }: { name: ChartName }) {
    return (
        <ViewLayout
            name={name}
            properties={[
                { name: 'label', type: 'string', description: 'Accessible chart name.' },
                {
                    name: 'data',
                    type: 'Record<string, string | number>[]',
                    description: 'Category rows containing numeric series values. Empty data displays an empty state.',
                },
                {
                    name: 'categoryKey',
                    type: 'string',
                    description: 'Row field used for axis labels or category names.',
                },
                {
                    name: 'series',
                    type: '{ key: string; label: string }[]',
                    description:
                        'Numeric row fields and readable labels. PieChart and RadialChart use the first series only.',
                },
                {
                    name: 'height',
                    type: 'number',
                    description: 'Height in pixels; defaults to 280. Width follows the parent.',
                },
            ]}
            example={{
                title: name,
                preview: <ChartExample name={name} />,
                code: `function Example() {
  return (
    <${name}
      label="Monthly requests"
      categoryKey="month"
      data={[
        { month: 'Jan', requests: 120, responses: 90 },
        { month: 'Feb', requests: 180, responses: 140 },
        { month: 'Mar', requests: 150, responses: 130 },
        { month: 'Apr', requests: 240, responses: 190 },
        { month: 'May', requests: 210, responses: 170 },
      ]}
      series={[
        { key: 'requests', label: 'Requests' },
        { key: 'responses', label: 'Responses' },
      ]}
    />
  );
}`,
            }}
        />
    );
}
