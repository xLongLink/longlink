import ViewLayout from './view-layout';
import { ChartLegend } from '@/components/longlink';

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
        <ChartLegend
            data={[
                { status: 'Queued', count: 18 },
                { status: 'Processing', count: 7 },
                { status: 'Complete', count: 42 }
            ]}
            nameKey="status"
            valueKey="count"
            orientation="vertical"
        />
    );
}

/** Documents standalone legends beside the chart components. */
export default function ChartLegendPage() {
    return (
        <ViewLayout
            name="ChartLegend"
            example={{
                title: 'ChartLegend',
                preview: <ChartLegendExample />,
                code: `function Example() {
  return (
    <ChartLegend
      data={[
        { status: 'Queued', count: 18 },
        { status: 'Processing', count: 7 },
        { status: 'Complete', count: 42 },
      ]}
      nameKey="status"
      valueKey="count"
      orientation="vertical"
    />
  );
}`
            }}
        />
    );
}
