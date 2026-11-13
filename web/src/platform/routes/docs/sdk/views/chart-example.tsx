import {
    AreaChart,
    BarChart,
    LineChart,
    PieChart,
    RadarChart,
    RadialChart,
    SankeyChart
} from '@/components/custom/chart';

const charts = { AreaChart, BarChart, LineChart, PieChart, RadarChart, RadialChart };

export type ChartName = keyof typeof charts | 'SankeyChart';

/** Renders the same chart and data in the catalog and its documentation page. */
export function ChartExample({
    name,
    height = 280,
    isCompact
}: {
    name: ChartName;
    height?: number;
    isCompact?: boolean;
}) {
    if (name === 'SankeyChart') {
        return (
            <SankeyChart
                label="Revenue allocation"
                height={height}
                isCompact={isCompact}
                nodes={[{ name: 'Revenue' }, { name: 'Costs' }, { name: 'Profit' }]}
                links={[
                    { source: 0, target: 1, value: 60 },
                    { source: 0, target: 2, value: 40 }
                ]}
            />
        );
    }

    const Plot = charts[name];

    return (
        <Plot
            label="Monthly requests"
            height={height}
            isCompact={isCompact}
            categoryKey="month"
            data={[
                { month: 'Jan', requests: 120, responses: 90 },
                { month: 'Feb', requests: 180, responses: 140 },
                { month: 'Mar', requests: 150, responses: 130 },
                { month: 'Apr', requests: 240, responses: 190 },
                { month: 'May', requests: 210, responses: 170 }
            ]}
            series={[
                { key: 'requests', label: 'Requests' },
                { key: 'responses', label: 'Responses' }
            ]}
        />
    );
}
