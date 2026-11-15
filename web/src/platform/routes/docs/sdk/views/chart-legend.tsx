import ViewLayout from './view-layout';
import { ChartLegend } from '@/views/adapter/charts/chart';
import catalog from '../../../../../../../sdk/longlink/.static/jsx/components.json';

/** Shows standalone legends for series and segment charts without chart context. */
export function ChartLegendExample({ isCompact = false }: { isCompact?: boolean }) {
    return isCompact ? (
        <ChartLegend
            series={[
                { key: 'requests', label: 'Requests' },
                { key: 'responses', label: 'Responses' }
            ]}
        />
    ) : (
        <ChartLegend data={[{ status: 'Queued' }, { status: 'Processing' }, { status: 'Complete' }]} nameKey="status" />
    );
}

/** Documents standalone legends beside the chart components. */
export default function ChartLegendPage() {
    const component = catalog.components.find((entry) => entry.name === 'ChartLegend');

    return (
        <ViewLayout
            name="ChartLegend"
            properties={component?.properties ?? []}
            example={{
                title: 'ChartLegend',
                preview: <ChartLegendExample />,
                code: `function Example() {
  return (
    <ChartLegend
      data={[
        { status: 'Queued' },
        { status: 'Processing' },
        { status: 'Complete' },
      ]}
      nameKey="status"
    />
  );
}`
            }}
        />
    );
}
