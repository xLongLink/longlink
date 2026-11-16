import { useId, useState, type ReactNode } from 'react';
import { Empty } from '@/components/longlink/display/empty';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
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

const compactNumber = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

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
