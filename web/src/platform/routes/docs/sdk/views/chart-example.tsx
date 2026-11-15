import { Card } from '@/views/adapter/layouts/card';
import { Box } from '@/components/longlink/layout/box';
import * as charts from '@/views/adapter/charts/chart';

export type ChartName =
    | 'AreaChart'
    | 'BarChart'
    | 'LineChart'
    | 'PieChart'
    | 'RadarChart'
    | 'RadialBarChart'
    | 'Sankey';

const data = [
    { month: 'Jan', requests: 120, responses: 90 },
    { month: 'Feb', requests: 180, responses: 140 },
    { month: 'Mar', requests: 150, responses: 130 },
    { month: 'Apr', requests: 240, responses: 190 },
    { month: 'May', requests: 210, responses: 170 }
];

const series: charts.ChartSeries<(typeof data)[number]>[] = [
    { key: 'requests', label: 'Requests' },
    { key: 'responses', label: 'Responses' }
];

/** Uses the public chart API for both documentation and catalog previews. */
export function ChartExample({
    name,
    height = 280,
    isCompact
}: {
    name: ChartName;
    height?: number;
    isCompact?: boolean;
}) {
    let plot;

    if (name === 'Sankey') {
        plot = (
            <charts.Sankey
                nodes={[{ name: 'Revenue' }, { name: 'Costs' }, { name: 'Profit' }]}
                links={[
                    { source: 0, target: 1, value: 60 },
                    { source: 0, target: 2, value: 40 }
                ]}
                tooltip={!isCompact}
                aria-label="Revenue allocation"
            />
        );
    } else if (name === 'PieChart') {
        plot = (
            <charts.PieChart
                data={data}
                nameKey="month"
                valueKey="requests"
                legend={false}
                tooltip={!isCompact}
                aria-label="Monthly requests"
            />
        );
    } else if (name === 'RadialBarChart') {
        plot = (
            <charts.RadialBarChart
                data={data}
                nameKey="month"
                valueKey="requests"
                max={300}
                legend={false}
                tooltip={!isCompact}
                aria-label="Requests against a target of 300"
            />
        );
    } else if (name === 'RadarChart') {
        plot = (
            <charts.RadarChart
                data={data}
                categoryKey="month"
                series={series}
                legend={false}
                tooltip={!isCompact}
                aria-label="Monthly requests and responses"
            />
        );
    } else {
        const Chart = charts[name];
        plot = (
            <Chart
                data={data}
                xKey="month"
                axes={!isCompact}
                series={series}
                legend={false}
                tooltip={!isCompact}
                aria-label="Monthly requests and responses"
            />
        );
    }

    const chart = (
        <Box width="100%" maxWidth="100%" height={height}>
            {plot}
        </Box>
    );

    if (isCompact || name === 'Sankey') return chart;

    return (
        <Box width="100%">
            <Card
                footer={
                    name === 'PieChart' || name === 'RadialBarChart' ? (
                        <charts.ChartLegend data={data} nameKey="month" />
                    ) : (
                        <charts.ChartLegend series={series} />
                    )
                }
            >
                {chart}
            </Card>
        </Box>
    );
}
