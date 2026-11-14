import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent
} from '@/components/shadcn/chart';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    Pie,
    PieChart,
    PolarAngleAxis,
    PolarGrid,
    Radar,
    RadarChart,
    RadialBar,
    RadialBarChart,
    Sankey,
    XAxis,
    YAxis
} from 'recharts';

const charts = { AreaChart, BarChart, LineChart, PieChart, RadarChart, RadialBarChart, Sankey };

export type ChartName = keyof typeof charts;

const data = [
    { month: 'Jan', requests: 120, responses: 90, fill: 'var(--chart-1)' },
    { month: 'Feb', requests: 180, responses: 140, fill: 'var(--chart-2)' },
    { month: 'Mar', requests: 150, responses: 130, fill: 'var(--chart-3)' },
    { month: 'Apr', requests: 240, responses: 190, fill: 'var(--chart-4)' },
    { month: 'May', requests: 210, responses: 170, fill: 'var(--chart-5)' }
];

const config = {
    requests: { label: 'Requests', color: 'var(--chart-1)' },
    responses: { label: 'Responses', color: 'var(--chart-2)' }
};

/** Renders native chart composition for the documentation page and catalog. */
export function ChartExample({
    name,
    height = 280,
    isCompact
}: {
    name: ChartName;
    height?: number;
    isCompact?: boolean;
}) {
    // Keep catalog presentation separate from the native components exposed to Views.
    if (name === 'Sankey') {
        return (
            <ChartContainer
                config={config}
                className="w-full min-w-0 aspect-auto"
                style={{ height }}
                aria-label="Revenue allocation"
            >
                <Sankey
                    data={{
                        nodes: [{ name: 'Revenue' }, { name: 'Costs' }, { name: 'Profit' }],
                        links: [
                            { source: 0, target: 1, value: 60 },
                            { source: 0, target: 2, value: 40 }
                        ]
                    }}
                    node={{ fill: 'var(--chart-1)' }}
                    link={{ stroke: 'var(--chart-1)', strokeOpacity: 0.25 }}
                    nodePadding={28}
                    margin={{ top: 16, right: 16, bottom: 16, left: 16 }}
                >
                    {!isCompact && <ChartTooltip content={<ChartTooltipContent />} />}
                </Sankey>
            </ChartContainer>
        );
    }

    // Compose polar charts with their native data keys and geometry.
    if (name === 'PieChart' || name === 'RadialBarChart') {
        const Plot = charts[name];

        return (
            <ChartContainer
                config={config}
                className="w-full min-w-0 aspect-auto"
                style={{ height }}
                aria-label="Monthly requests"
            >
                <Plot data={data} innerRadius="35%" outerRadius="90%" accessibilityLayer>
                    {name === 'PieChart' ? (
                        <Pie
                            data={data}
                            dataKey="requests"
                            nameKey="month"
                            innerRadius="60%"
                            paddingAngle={3}
                            isAnimationActive={false}
                        />
                    ) : (
                        <RadialBar dataKey="requests" background isAnimationActive={false} />
                    )}
                    {!isCompact && <ChartTooltip content={<ChartTooltipContent nameKey="month" />} />}
                    {!isCompact && <ChartLegend content={<ChartLegendContent nameKey="month" />} />}
                </Plot>
            </ChartContainer>
        );
    }

    // Let Recharts own series selection, axes, and chart geometry.
    const Plot = charts[name];

    return (
        <ChartContainer
            config={config}
            className="w-full min-w-0 aspect-auto"
            style={{ height }}
            aria-label="Monthly requests"
        >
            <Plot data={data} accessibilityLayer margin={{ top: 16, right: 16, bottom: 4, left: 0 }}>
                {name === 'RadarChart' ? (
                    <>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="month" tick={!isCompact} />
                        <Radar
                            dataKey="requests"
                            stroke="var(--color-requests)"
                            fill="var(--color-requests)"
                            fillOpacity={0.15}
                            isAnimationActive={false}
                        />
                        <Radar
                            dataKey="responses"
                            stroke="var(--color-responses)"
                            fill="var(--color-responses)"
                            fillOpacity={0.15}
                            isAnimationActive={false}
                        />
                    </>
                ) : (
                    <>
                        {!isCompact && <CartesianGrid vertical={false} />}
                        {!isCompact && <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={8} />}
                        {!isCompact && <YAxis axisLine={false} tickLine={false} width={48} />}
                        {name === 'AreaChart' ? (
                            <>
                                <Area
                                    dataKey="requests"
                                    type="monotone"
                                    stroke="var(--color-requests)"
                                    fill="var(--color-requests)"
                                    fillOpacity={0.12}
                                    isAnimationActive={false}
                                />
                                <Area
                                    dataKey="responses"
                                    type="monotone"
                                    stroke="var(--color-responses)"
                                    fill="var(--color-responses)"
                                    fillOpacity={0.12}
                                    isAnimationActive={false}
                                />
                            </>
                        ) : name === 'BarChart' ? (
                            <>
                                <Bar dataKey="requests" fill="var(--color-requests)" isAnimationActive={false} />
                                <Bar dataKey="responses" fill="var(--color-responses)" isAnimationActive={false} />
                            </>
                        ) : (
                            <>
                                <Line
                                    dataKey="requests"
                                    type="monotone"
                                    stroke="var(--color-requests)"
                                    dot={false}
                                    isAnimationActive={false}
                                />
                                <Line
                                    dataKey="responses"
                                    type="monotone"
                                    stroke="var(--color-responses)"
                                    dot={false}
                                    isAnimationActive={false}
                                />
                            </>
                        )}
                    </>
                )}
                {!isCompact && <ChartTooltip content={<ChartTooltipContent />} />}
                {!isCompact && <ChartLegend content={<ChartLegendContent />} />}
            </Plot>
        </ChartContainer>
    );
}
