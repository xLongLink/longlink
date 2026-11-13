import { EmptyState } from './EmptyState';
import { sankeyDataSchema } from './charts';
import type { ChartProps, ChartRow, SankeyChartProps } from './charts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/shadcn/chart';
import {
    Area,
    AreaChart as RechartsAreaChart,
    Bar,
    BarChart as RechartsBarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart as RechartsLineChart,
    Pie,
    PieChart as RechartsPieChart,
    PolarAngleAxis,
    PolarGrid,
    Radar,
    RadarChart as RechartsRadarChart,
    RadialBar,
    RadialBarChart as RechartsRadialChart,
    Sankey,
    XAxis,
    YAxis,
} from 'recharts';

/** Renders categorical series using the shared chart theme and tooltip. */
function SeriesChart({ kind, ...props }: ChartProps & { kind: 'area' | 'bar' | 'line' | 'radar' }) {
    // Use generated series identifiers rather than inserting authored keys into chart CSS.
    const config: ChartConfig = {};

    const data = props.data.map((row) => {
        const values: ChartRow = { category: row[props.categoryKey] ?? '' };

        props.series.forEach((series, index) => {
            values[`series${index}`] = row[series.key] ?? 0;
        });

        return values;
    });

    props.series.forEach((series, index) => {
        config[`series${index}`] = { label: series.label, color: `var(--chart-${(index % 5) + 1})` };
    });

    if (!data.length || !props.series.length) return <EmptyState title="No chart data" isCompact />;

    const Plot =
        kind === 'area'
            ? RechartsAreaChart
            : kind === 'bar'
              ? RechartsBarChart
              : kind === 'radar'
                ? RechartsRadarChart
                : RechartsLineChart;

    return (
        <ChartContainer
            config={config}
            className="w-full min-w-0 aspect-auto"
            style={{ height: props.height ?? 280 }}
            aria-label={props.label}
        >
            <Plot
                data={data}
                accessibilityLayer
                margin={
                    props.isCompact
                        ? { top: 16, right: 0, bottom: kind === 'radar' ? 16 : 0, left: 0 }
                        : { top: 12, right: 16, bottom: 4, left: 0 }
                }
            >
                {kind === 'radar' ? (
                    <>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="category" tick={!props.isCompact} />
                    </>
                ) : !props.isCompact ? (
                    <>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="category" axisLine={false} tickLine={false} tickMargin={8} minTickGap={24} />
                        <YAxis axisLine={false} tickLine={false} width={48} />
                    </>
                ) : null}
                {!props.isCompact && <ChartTooltip content={<ChartTooltipContent />} />}
                {!props.isCompact && <Legend />}
                {props.series.map((series, index) => {
                    const key = `series${index}`;
                    const color = `var(--color-${key})`;

                    if (kind === 'bar') {
                        return (
                            <Bar
                                key={series.key}
                                dataKey={key}
                                name={series.label}
                                fill={color}
                                isAnimationActive={false}
                            />
                        );
                    }

                    if (kind === 'radar') {
                        return (
                            <Radar
                                key={series.key}
                                dataKey={key}
                                name={series.label}
                                stroke={color}
                                fill={color}
                                fillOpacity={0.15}
                                isAnimationActive={false}
                            />
                        );
                    }

                    if (kind === 'area') {
                        return (
                            <Area
                                key={series.key}
                                dataKey={key}
                                name={series.label}
                                type="monotone"
                                stroke={color}
                                strokeWidth={2}
                                fill={color}
                                fillOpacity={0.12}
                                isAnimationActive={false}
                            />
                        );
                    }

                    return (
                        <Line
                            key={series.key}
                            dataKey={key}
                            name={series.label}
                            type="monotone"
                            stroke={color}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                        />
                    );
                })}
            </Plot>
        </ChartContainer>
    );
}

/** Shows values over time as filled series. */
export function AreaChart(props: ChartProps) {
    return <SeriesChart {...props} kind="area" />;
}

/** Compares category values as grouped bars. */
export function BarChart(props: ChartProps) {
    return <SeriesChart {...props} kind="bar" />;
}

/** Shows trends as continuous lines. */
export function LineChart(props: ChartProps) {
    return <SeriesChart {...props} kind="line" />;
}

/** Compares series across shared radial dimensions. */
export function RadarChart(props: ChartProps) {
    return <SeriesChart {...props} kind="radar" />;
}

/** Displays one value series as slices or concentric radial bars. */
function CircularChart({ kind, ...props }: ChartProps & { kind: 'pie' | 'radial' }) {
    const series = props.series[0];

    if (!series || !props.data.length) return <EmptyState title="No chart data" isCompact />;

    // Give every category its own stable theme color and tooltip label.
    const config: ChartConfig = { value: { label: series.label } };

    const data = props.data.map((row, index) => {
        const key = `slice${index}`;
        const name = String(row[props.categoryKey] ?? '');
        config[key] = { label: name, color: `var(--chart-${(index % 5) + 1})` };

        return { name, value: row[series.key], fill: `var(--color-${key})` };
    });

    const Plot = kind === 'pie' ? RechartsPieChart : RechartsRadialChart;

    return (
        <ChartContainer
            config={config}
            className="w-full min-w-0 aspect-auto"
            style={{ height: props.height ?? 280 }}
            aria-label={props.label}
        >
            <Plot
                data={data}
                innerRadius="35%"
                outerRadius={props.isCompact ? '100%' : '90%'}
                margin={props.isCompact ? { top: 16, right: 0, bottom: 16, left: 0 } : undefined}
                accessibilityLayer
            >
                {!props.isCompact && <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />}
                {!props.isCompact && <Legend />}
                {kind === 'pie' ? (
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="60%"
                        outerRadius={props.isCompact ? '100%' : '85%'}
                        paddingAngle={3}
                        isAnimationActive={false}
                    >
                        {data.map((row) => (
                            <Cell key={row.name} fill={row.fill} />
                        ))}
                    </Pie>
                ) : (
                    <RadialBar dataKey="value" background isAnimationActive={false} />
                )}
            </Plot>
        </ChartContainer>
    );
}

/** Displays a part-to-whole breakdown as a doughnut. */
export function PieChart(props: ChartProps) {
    return <CircularChart {...props} kind="pie" />;
}

/** Compares category values on concentric radial tracks. */
export function RadialChart(props: ChartProps) {
    return <CircularChart {...props} kind="radial" />;
}

/** Displays a directed, acyclic flow between indexed nodes. */
export function SankeyChart(props: SankeyChartProps) {
    if (!props.nodes.length || !props.links.length) return <EmptyState title="No chart data" isCompact />;
    const parsed = sankeyDataSchema.safeParse({ nodes: props.nodes, links: props.links });

    if (!parsed.success) return <EmptyState title="Invalid chart data" isCompact />;

    return (
        <div
            className="w-full min-w-0 overflow-x-auto focus-visible:outline-2 focus-visible:outline-ring"
            role="region"
            aria-label={props.label}
            tabIndex={0}
        >
            <ChartContainer
                config={{ value: { label: 'Value', color: 'var(--chart-1)' } }}
                className={props.isCompact ? 'w-full min-w-0 aspect-auto' : 'min-w-[640px] aspect-auto'}
                style={{ height: props.height ?? 360 }}
            >
                <Sankey
                    data={parsed.data}
                    nodeWidth={10}
                    nodePadding={28}
                    margin={
                        props.isCompact
                            ? { top: 16, right: 0, bottom: 16, left: 0 }
                            : { top: 20, right: 100, bottom: 20, left: 100 }
                    }
                    node={({ x, y, width, height, payload, index }) => (
                        <g>
                            <rect x={x} y={y} width={width} height={height} fill="var(--chart-1)" />
                            {!props.isCompact && (
                                <text
                                    x={index === 0 ? x - 8 : x + width + 8}
                                    y={y + height / 2}
                                    textAnchor={index === 0 ? 'end' : 'start'}
                                    dominantBaseline="middle"
                                    fill="var(--foreground)"
                                >
                                    {props.nodes[index]?.name}
                                    <title>{`${props.nodes[index]?.name}: ${payload.value}`}</title>
                                </text>
                            )}
                        </g>
                    )}
                    link={{ stroke: 'var(--chart-1)', strokeOpacity: 0.25 }}
                >
                    {!props.isCompact && <ChartTooltip content={<ChartTooltipContent />} />}
                </Sankey>
            </ChartContainer>
        </div>
    );
}
