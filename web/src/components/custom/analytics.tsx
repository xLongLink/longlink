import { useId, useState } from 'react';
import { Badge } from '@/components/reui/badge';
import { IconTile } from '@/components/reui/icon-tile';
import { Activity, Globe, MessageSquare, Sparkles } from 'lucide-react';
import './analytics.css';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { Area, AreaChart, CartesianGrid, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/shadcn/chart';
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
    icon: 'models' | 'reviews' | 'messages' | 'providers';
    trend: number[];
};

const metricIcons = { messages: Activity, reviews: MessageSquare, models: Sparkles, providers: Globe };

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
    const Glyph = metricIcons[metric.icon];
    const color = metric.change.startsWith('-') ? 'var(--analytics-negative)' : 'var(--chart-2)';
    const iconColor = `var(--chart-${(index % 5) + 1})`;

    return (
        <Card size="sm" className="analytics-card min-w-0 gap-6 overflow-hidden pb-0">
            <CardHeader className="flex flex-row items-center gap-3">
                <IconTile size="lg" variant="soft" style={{ color: iconColor }}>
                    <Glyph />
                </IconTile>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="text-[13px] text-muted-foreground">{metric.label}</p>
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xl font-medium tabular-nums">{metric.value}</p>
                        <Badge variant={metric.change.startsWith('-') ? 'destructive-light' : 'success-light'}>
                            {metric.change}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <ChartContainer
                config={{ value: { label: metric.label, color } }}
                className="h-24 w-full aspect-auto bg-[radial-gradient(var(--analytics-grid-dot)_1px,transparent_1px)] bg-size-[6px_6px]"
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
export function ProviderChart({ providers, total }: { providers: ProviderShare[]; total: number }) {
    const data = providers.map((provider, index) => ({ ...provider, fill: `var(--chart-${index + 1})` }));

    const topShare = [...providers]
        .sort((left, right) => right.value - left.value)
        .slice(0, 3)
        .reduce((sum, provider) => sum + provider.value, 0);

    return (
        <Card className="analytics-card @container/provider h-full min-w-0">
            <CardHeader className="gap-0 border-b">
                <CardTitle>Top providers</CardTitle>
                <CardDescription>Share of community messages this month</CardDescription>
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
                        aria-label="Provider message shares"
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
                        <span className="text-xs text-muted-foreground">Messages</span>
                        <span className="text-xs text-muted-foreground">this month</span>
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
                <span>Demo data</span>
            </CardFooter>
        </Card>
    );
}

export type UsagePoint = { date: string; claude: number; gpt: number; gemini: number };

const usageConfig = {
    claude: { label: 'Claude', color: 'var(--chart-1)' },
    gpt: { label: 'GPT', color: 'var(--chart-2)' },
    gemini: { label: 'Gemini', color: 'var(--chart-3)' }
};

const usageKeys = ['claude', 'gpt', 'gemini'] as const;

const usagePeriods = ['7', '30'] as const;

/** Keeps period selection and multi-series readouts inside a bounded trend panel. */
export function UsageChart({ data }: { data: UsagePoint[] }) {
    const [period, setPeriod] = useState('30');
    const id = useId().replaceAll(':', '');
    const visible = data.slice(-Number(period));
    const latest = visible.at(-1);

    const plot = (
        <ChartContainer
            config={usageConfig}
            className="h-64 w-full aspect-auto md:h-80"
            aria-label="Community messages by model"
        >
            <AreaChart data={visible} accessibilityLayer margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
                <defs>
                    {usageKeys.map((key) => (
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
                <YAxis tickLine={false} axisLine={false} tickFormatter={(value: number) => `${value / 1000000}M`} />
                <ChartTooltip cursor={{ strokeDasharray: '4 4' }} content={<ChartTooltipContent />} />
                {usageKeys.map((key) => (
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
            value={period}
            onValueChange={(value) => {
                if (value === '7' || value === '30') setPeriod(value);
            }}
        >
            <Card className="analytics-card min-w-0">
                <CardHeader className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                    <div className="flex min-w-0 flex-col gap-0">
                        <CardTitle>Intelligence in motion</CardTitle>
                        <CardDescription>Community model usage over time</CardDescription>
                    </div>
                    <CardAction>
                        <TabsList aria-label="Usage period" activateOnFocus>
                            {usagePeriods.map((value) => (
                                <TabsTrigger key={value} value={value}>
                                    Last {value} days
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </CardAction>
                </CardHeader>
                <CardContent>
                    {usagePeriods.map((value) => (
                        <TabsContent key={value} value={value}>
                            {plot}
                        </TabsContent>
                    ))}
                </CardContent>
                <CardFooter className="flex flex-wrap gap-x-6 gap-y-1 border-t bg-transparent py-1.5 text-xs">
                    {usageKeys.map((key) => (
                        <div key={key} className="flex items-center gap-2">
                            <span className="size-2 rounded-full" style={{ background: usageConfig[key].color }} />
                            <span className="text-muted-foreground">{usageConfig[key].label}</span>
                            <span className="font-medium tabular-nums">
                                {latest ? compactNumber.format(latest[key]) : '—'}
                            </span>
                        </div>
                    ))}
                    {!data.length && <span role="status">No usage data</span>}
                </CardFooter>
            </Card>
        </Tabs>
    );
}
