import { Sankey } from 'recharts';
import { useId, useState } from 'react';
import { Badge } from '@/components/reui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/shadcn/toggle-group';
import './analytics.css';
import { formatFlowValue, traceFlow, type FlowNode, type RevenueQuarter } from './flow';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/shadcn/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/shadcn/card';

const categories = { revenue: 'Revenue', expense: 'Costs', profit: 'Profit' } as const;

const colors = { revenue: 'var(--chart-5)', profit: 'var(--chart-2)', expense: 'var(--analytics-negative)' };

const categoryKeys = ['revenue', 'expense', 'profit'] as const;

/** Presents balanced revenue flows with directed node tracing and category isolation. */
export function RevenueFlow({ quarters }: { quarters: RevenueQuarter[] }) {
    const [quarterIndex, setQuarterIndex] = useState('0');

    const [selection, setSelection] = useState<
        { type: 'node'; index: number } | { type: 'category'; value: FlowNode['category'] } | null
    >(null);

    const id = useId().replaceAll(':', '');
    const quarter = quarters[Number(quarterIndex)];
    const previous = quarters[Number(quarterIndex) + 1];
    const selected = selection?.type === 'node' ? selection.index : null;
    const category = selection?.type === 'category' ? selection.value : null;

    if (!quarter) return null;

    const { data } = quarter;
    const grossMargin = (quarter.grossProfit / quarter.revenue) * 100;
    const operatingMargin = (quarter.operatingIncome / quarter.revenue) * 100;

    const metrics = [
        {
            label: 'Revenue',
            value: formatFlowValue(quarter.revenue),
            change: previous ? (quarter.revenue / previous.revenue - 1) * 100 : null,
            unit: '%'
        },
        {
            label: 'Gross Margin',
            value: `${grossMargin.toFixed(1)}%`,
            change: previous ? grossMargin - (previous.grossProfit / previous.revenue) * 100 : null,
            unit: 'pp'
        },
        {
            label: 'Operating Margin',
            value: `${operatingMargin.toFixed(1)}%`,
            change: previous ? operatingMargin - (previous.operatingIncome / previous.revenue) * 100 : null,
            unit: 'pp'
        },
        {
            label: 'Net Income',
            value: formatFlowValue(quarter.netIncome),
            change: previous ? (quarter.netIncome / previous.netIncome - 1) * 100 : null,
            unit: '%'
        }
    ];

    const seeds =
        selected !== null
            ? [selected]
            : data.nodes.flatMap((node, index) => (node.category === category ? [index] : []));

    const traced = seeds.length ? traceFlow(data, seeds) : null;

    const activeNodes = traced
        ? new Set([...traced].flatMap((index) => [data.links[index].source, data.links[index].target]))
        : null;

    const values = data.nodes.map((_, index) =>
        Math.max(
            data.links.filter((link) => link.target === index).reduce((sum, link) => sum + link.value, 0),
            data.links.filter((link) => link.source === index).reduce((sum, link) => sum + link.value, 0)
        )
    );

    return (
        <Card className="analytics-card min-w-0">
            <CardHeader>
                <CardTitle>Revenue Flow</CardTitle>
                <CardAction>
                    <Select
                        value={quarterIndex}
                        onValueChange={(value) => {
                            if (value === null) return;

                            setQuarterIndex(value);
                            setSelection(null);
                        }}
                    >
                        <SelectTrigger aria-label="Revenue quarter" className="min-w-36">
                            <SelectValue>{quarter.label}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {quarters.map((item, index) => (
                                <SelectItem key={item.label} value={String(index)}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardAction>
            </CardHeader>
            <CardContent className="flex min-w-0 flex-col gap-4">
                <div className="grid grid-cols-2 gap-4 border-y py-4 sm:grid-cols-4">
                    {metrics.map((metric) => (
                        <div key={metric.label} className="flex flex-col gap-1">
                            <p className="text-xs text-muted-foreground">{metric.label}</p>
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-xl font-medium tabular-nums">{metric.value}</p>
                                {metric.change !== null && (
                                    <Badge
                                        variant={
                                            metric.change > 0
                                                ? 'success-light'
                                                : metric.change < 0
                                                  ? 'destructive-light'
                                                  : 'secondary'
                                        }
                                    >
                                        {metric.change >= 0 ? '+' : ''}
                                        {metric.change.toFixed(1)}
                                        {metric.unit}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <ToggleGroup
                        size="sm"
                        variant="outline"
                        spacing={0}
                        aria-label="Revenue category"
                        value={selected !== null ? [] : [category ?? 'all']}
                        onValueChange={(values) => {
                            const value = values[0];
                            setSelection(
                                value === 'revenue' || value === 'expense' || value === 'profit'
                                    ? { type: 'category', value }
                                    : null
                            );
                        }}
                    >
                        <ToggleGroupItem value="all" type="button">
                            All
                        </ToggleGroupItem>
                        {categoryKeys.map((key) => (
                            <ToggleGroupItem key={key} value={key} type="button">
                                {categories[key]}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                    {selected !== null && <Badge variant="secondary">{data.nodes[selected].name}</Badge>}
                </div>
                <div
                    className="min-w-0 overflow-x-auto outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    role="region"
                    aria-label="Revenue flow diagram"
                    tabIndex={0}
                >
                    <ChartContainer
                        config={{ value: { label: 'Revenue' } }}
                        className="h-110 min-w-260 w-full aspect-auto overflow-hidden"
                        aria-label={`${quarter.label} revenue allocation`}
                    >
                        <Sankey
                            data={data}
                            nodeWidth={10}
                            nodePadding={20}
                            margin={{ top: 16, bottom: 16, left: 132, right: 152 }}
                            sort={false}
                            node={({ x, y, width, height, index }) => {
                                const node = data.nodes[index];
                                const isEnd = !data.links.some((link) => link.source === index);
                                const value = values[index];
                                const labelX = isEnd ? x + width + 8 : x - 8;
                                const label = `${node.name}, ${formatFlowValue(value)}, ${Math.round((value / quarter.revenue) * 100)}%`;

                                return (
                                    <g
                                        role="button"
                                        tabIndex={0}
                                        aria-label={label}
                                        aria-pressed={selected === index}
                                        className="cursor-pointer outline-none focus-visible:[&>rect]:stroke-ring focus-visible:[&>rect]:stroke-3"
                                        opacity={!activeNodes || activeNodes.has(index) ? 1 : 0.2}
                                        onClick={() => {
                                            setSelection(selected === index ? null : { type: 'node', index });
                                        }}
                                        onKeyDown={(event) => {
                                            if (event.key !== 'Enter' && event.key !== ' ') return;

                                            event.preventDefault();
                                            setSelection(selected === index ? null : { type: 'node', index });
                                        }}
                                    >
                                        <rect
                                            x={x}
                                            y={y}
                                            width={width}
                                            height={height}
                                            fill={colors[node.category]}
                                            rx={2}
                                        />
                                        <text
                                            x={labelX}
                                            y={y + height / 2 - 6}
                                            textAnchor={isEnd ? 'start' : 'end'}
                                            fill="var(--foreground)"
                                            className="text-xs"
                                        >
                                            <tspan x={labelX}>{node.name}</tspan>
                                            <tspan x={labelX} dy={17} fill="var(--muted-foreground)">
                                                {formatFlowValue(value)} · {Math.round((value / quarter.revenue) * 100)}
                                                %
                                            </tspan>
                                        </text>
                                    </g>
                                );
                            }}
                            link={({
                                sourceX,
                                targetX,
                                sourceY,
                                targetY,
                                sourceControlX,
                                targetControlX,
                                linkWidth,
                                index
                            }) => {
                                const link = data.links[index];
                                const gradient = `${id}-flow-${index}`;

                                return (
                                    <g>
                                        <defs>
                                            <linearGradient
                                                id={gradient}
                                                gradientUnits="userSpaceOnUse"
                                                x1={sourceX}
                                                x2={targetX}
                                            >
                                                <stop
                                                    offset="0%"
                                                    stopColor={colors[data.nodes[link.source].category]}
                                                />
                                                <stop
                                                    offset="100%"
                                                    stopColor={colors[data.nodes[link.target].category]}
                                                />
                                            </linearGradient>
                                        </defs>
                                        <path
                                            d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
                                            fill="none"
                                            stroke={`url(#${gradient})`}
                                            strokeWidth={linkWidth}
                                            strokeOpacity={!traced || traced.has(index) ? 0.3 : 0.035}
                                        />
                                    </g>
                                );
                            }}
                        >
                            <ChartTooltip
                                content={<ChartTooltipContent formatter={(value) => formatFlowValue(Number(value))} />}
                            />
                        </Sankey>
                    </ChartContainer>
                </div>
            </CardContent>
            <CardFooter className="justify-between gap-2 bg-transparent py-1.5 text-xs text-muted-foreground">
                <span>{quarter.label} · USD</span>
                <span role="status">
                    {selected !== null
                        ? `Tracing ${data.nodes[selected].name}`
                        : category
                          ? `${categories[category]} connections`
                          : 'All revenue connections'}
                </span>
            </CardFooter>
        </Card>
    );
}
