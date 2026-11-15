import { IconTile } from '@/components/reui/icon-tile';
import { Badge } from '@/components/longlink/display/badge';
import { Empty } from '@/components/longlink/display/empty';
import { useId, useState, type ReactNode, type ComponentProps } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { Area, AreaChart, CartesianGrid, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/shadcn/chart';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from '@/components/shadcn/card';

export type AnalyticsMetric = {
    label: string;
    value: string;
    change: string;
    changeVariant?: ComponentProps<typeof Badge>['variant'];
    icon?: ReactNode;
    trend: number[];
};

const compactNumber = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

/** Keeps KPI breakpoints consistent with the dashboard's compact layout. */
export function MetricGrid({ metrics }: { metrics: AnalyticsMetric[] }) {
    return (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric, index) => (
                <MetricCard key={metric.label} metric={metric} index={index} />
            ))}
        </div>
    );
}

/** Pairs a metric with a quiet, full-width angular sparkline. */
export function MetricCard({ metric, index = 0 }: { metric: AnalyticsMetric; index?: number }) {
    const id = useId().replaceAll(':', '');
    const color = `var(--chart-${(index % 5) + 1})`;

    return (
        <Card size="sm" className="min-w-0 gap-6 overflow-hidden pb-0">
            <CardHeader className="flex flex-row items-center gap-3">
                {metric.icon && (
                    <IconTile size="lg" variant="soft" style={{ color }}>
                        {metric.icon}
                    </IconTile>
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="text-[13px] text-muted-foreground">{metric.label}</p>
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xl font-medium tabular-nums">{metric.value}</p>
                        <Badge variant={metric.changeVariant ?? 'secondary'}>{metric.change}</Badge>
                    </div>
                </div>
            </CardHeader>
            <ChartContainer
                config={{ value: { label: metric.label, color } }}
                className="h-24 w-full aspect-auto"
                aria-label={`${metric.label} trend`}
            >
                <AreaChart
                    data={metric.trend.map((value) => ({ value }))}
                    margin={{ top: 4, bottom: 0, left: 0, right: 0 }}
                >
                    <defs>
                        <linearGradient id={`metric-${id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.12} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
                        </linearGradient>
                    </defs>
                    <Area
                        dataKey="value"
                        type="linear"
                        stroke={color}
                        strokeWidth={2}
                        fill={`url(#metric-${id})`}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ChartContainer>
        </Card>
    );
}

export type ProviderShare = { name: string; value: number; providerCount?: number };

/** Shows provider shares with a centered total and a compact aligned legend. */
export function ProviderChart({
    providers,
    total,
    title,
    description,
    totalLabel,
    footer
}: {
    providers: ProviderShare[];
    total: number;
    title: ReactNode;
    description?: ReactNode;
    totalLabel: ReactNode;
    footer?: ReactNode;
}) {
    const data = providers.map((provider, index) => ({ ...provider, fill: `var(--chart-${(index % 5) + 1})` }));

    const topShare = [...providers]
        .sort((left, right) => right.value - left.value)
        .slice(0, 3)
        .reduce((sum, provider) => sum + provider.value, 0);

    return (
        <Card className="@container/provider h-full min-w-0">
            <CardHeader className="gap-0 border-b">
                <CardTitle>{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
                <CardAction>
                    <Badge variant="secondary">
                        {providers.reduce((sum, provider) => sum + (provider.providerCount ?? 1), 0)} providers
                    </Badge>
                </CardAction>
            </CardHeader>
            <CardContent className="flex min-h-64 flex-1 flex-col items-center justify-center gap-4 @min-[360px]/provider:flex-row">
                <div className="relative size-40 shrink-0 @min-[360px]/provider:size-48">
                    <ChartContainer
                        config={{ value: { label: 'Share' } }}
                        className="size-full aspect-square"
                        aria-label="Provider shares"
                    >
                        <PieChart>
                            <Pie
                                data={data}
                                dataKey="value"
                                nameKey="name"
                                innerRadius="66%"
                                outerRadius="94%"
                                paddingAngle={4}
                                cornerRadius={5}
                                stroke="none"
                                isAnimationActive={false}
                            />
                            <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                        </PieChart>
                    </ChartContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0 text-center">
                        <span className="text-2xl font-medium tabular-nums">{compactNumber.format(total)}</span>
                        <span className="text-xs text-muted-foreground">{totalLabel}</span>
                    </div>
                </div>
                <div className="flex w-full min-w-0 flex-1 flex-col divide-y">
                    {data.map((provider) => (
                        <div key={provider.name} className="flex items-center gap-2 py-3 text-[13px]">
                            <span className="size-2 shrink-0 rounded-full" style={{ background: provider.fill }} />
                            <span className="flex-1">{provider.name}</span>
                            <span className="font-medium tabular-nums">{provider.value.toFixed(1)}%</span>
                        </div>
                    ))}
                </div>
            </CardContent>
            <CardFooter className="justify-between gap-2 border-t bg-transparent py-1.5 text-xs text-muted-foreground">
                <span>{topShare.toFixed(1)}% from the top 3 providers</span>
                {footer}
            </CardFooter>
        </Card>
    );
}

export type UsagePoint = { date: string } & Record<string, string | number>;

/** Keeps period selection and multi-series readouts inside a bounded trend panel. */
export function UsageChart({
    data,
    config,
    periods,
    title,
    description,
    label,
    emptyMessage = 'No data',
    formatValue = compactNumber.format
}: {
    data: UsagePoint[];
    config: ChartConfig;
    periods: { value: number; label: string }[];
    title: ReactNode;
    description?: ReactNode;
    label: string;
    emptyMessage?: ReactNode;
    formatValue?: (value: number) => string;
}) {
    const [period, setPeriod] = useState(String(periods.at(-1)?.value ?? 0));
    const id = useId().replaceAll(':', '');

    const selectedPeriod = periods.some((option) => String(option.value) === period)
        ? period
        : String(periods.at(-1)?.value ?? 0);

    const visible = data.slice(-Number(selectedPeriod));
    const latest = visible.at(-1);
    const keys = Object.keys(config);

    const plot = (
        <ChartContainer config={config} className="h-64 w-full aspect-auto md:h-80" aria-label={label}>
            <AreaChart data={visible} accessibilityLayer margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
                <defs>
                    {keys.map((key) => (
                        <linearGradient key={key} id={`${id}-${key}`} x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor={`var(--color-${key})`} stopOpacity={0.25} />
                            <stop offset="100%" stopColor={`var(--color-${key})`} stopOpacity={0.01} />
                        </linearGradient>
                    ))}
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    minTickGap={40}
                    tickFormatter={(value: string) => value.slice(5)}
                />
                <YAxis tickLine={false} axisLine={false} tickFormatter={formatValue} />
                <ChartTooltip cursor={{ strokeDasharray: '4 4' }} content={<ChartTooltipContent />} />
                {keys.map((key) => (
                    <Area
                        key={key}
                        dataKey={key}
                        type="monotone"
                        stroke={`var(--color-${key})`}
                        strokeWidth={2}
                        fill={`url(#${id}-${key})`}
                        activeDot={{ r: 4 }}
                        isAnimationActive={false}
                    />
                ))}
            </AreaChart>
        </ChartContainer>
    );

    return (
        <Tabs
            value={selectedPeriod}
            onValueChange={(value) => {
                if (periods.some((option) => String(option.value) === value)) setPeriod(value);
            }}
        >
            <Card className="min-w-0">
                <CardHeader className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                    <div className="flex min-w-0 flex-col gap-0">
                        <CardTitle>{title}</CardTitle>
                        {description && <CardDescription>{description}</CardDescription>}
                    </div>
                    <CardAction>
                        <TabsList aria-label="Usage period" activateOnFocus>
                            {periods.map((option) => (
                                <TabsTrigger key={option.value} value={String(option.value)}>
                                    {option.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </CardAction>
                </CardHeader>
                <CardContent>
                    {periods.map((option) => (
                        <TabsContent key={option.value} value={String(option.value)}>
                            {data.length ? plot : <Empty role="status" title={emptyMessage} />}
                        </TabsContent>
                    ))}
                </CardContent>
                <CardFooter className="flex flex-wrap gap-x-6 gap-y-1 border-t bg-transparent py-1.5 text-xs">
                    {keys.map((key) => (
                        <div key={key} className="flex items-center gap-2">
                            <span className="size-2 rounded-full" style={{ background: config[key].color }} />
                            <span className="text-muted-foreground">{config[key].label}</span>
                            <span className="font-medium tabular-nums">
                                {latest ? formatValue(Number(latest[key])) : '—'}
                            </span>
                        </div>
                    ))}
                </CardFooter>
            </Card>
        </Tabs>
    );
}
