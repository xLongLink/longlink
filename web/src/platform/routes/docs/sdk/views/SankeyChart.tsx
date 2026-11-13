import ViewLayout from './ViewLayout';
import { ChartExample } from './ChartExample';

/** Documents directed flow charts in Views. */
export default function SankeyChartPage() {
    return (
        <ViewLayout
            name="SankeyChart"
            properties={[
                { name: 'label', type: 'string', description: 'Accessible name for the scrollable chart region.' },
                {
                    name: 'nodes',
                    type: '{ name: string }[]',
                    description: 'Named nodes, referenced by their zero-based array index.'
                },
                {
                    name: 'links',
                    type: '{ source: number; target: number; value: number }[]',
                    description: 'Directed flows referencing existing nodes. Cycles and self-links are not supported.'
                },
                {
                    name: 'height',
                    type: 'number',
                    description: 'Height in pixels; defaults to 360. Minimum diagram width is 640 pixels.'
                }
            ]}
            example={{
                title: 'SankeyChart',
                preview: <ChartExample name="SankeyChart" />,
                code: `function Example() {
  return (
    <SankeyChart
      label="Revenue allocation"
      nodes={[{ name: 'Revenue' }, { name: 'Costs' }, { name: 'Profit' }]}
      links={[
        { source: 0, target: 1, value: 60 },
        { source: 0, target: 2, value: 40 },
      ]}
    />
  );
}`
            }}
        />
    );
}
