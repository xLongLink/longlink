import { ChartFrame } from './frame';
import * as recharts from 'recharts';
import { prepareSeries } from './data';
import type { ReactNode } from 'react';
import type { CartesianChartProps } from './types';
import { ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/shadcn/chart';

export function CartesianChart<Row extends object>({
    chart: Chart,
    label,
    data,
    xKey,
    series,
    axes = false,
    padding = axes ? 12 : 0,
    tooltip,
    legend,
    xTickFormatter,
    yTickFormatter,
    children,
    ...props
}: CartesianChartProps<Row> & {
    chart: typeof recharts.AreaChart | typeof recharts.LineChart | typeof recharts.BarChart;
    label: string;
    children: ReactNode;
}) {
    const prepared = prepareSeries(data, xKey, series);

    return (
        <ChartFrame
            {...props}
            label={label}
            config={prepared.config}
            empty={!prepared.hasValues}
            error={prepared.error}
        >
            <Chart
                data={prepared.rows}
                accessibilityLayer
                margin={{ top: padding, right: padding, bottom: padding, left: padding }}
            >
                {axes && <recharts.CartesianGrid vertical={false} />}
                <recharts.XAxis
                    dataKey="category"
                    hide={!axes}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={8}
                    tickFormatter={xTickFormatter}
                />
                <recharts.YAxis
                    hide={!axes}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    tickFormatter={yTickFormatter}
                />
                {children}
                {tooltip && <ChartTooltip isAnimationActive={false} content={<ChartTooltipContent />} />}
                {legend && (
                    <ChartLegend
                        content={<ChartLegendContent nameKey="value" className="flex-wrap gap-x-4 gap-y-2" />}
                    />
                )}
            </Chart>
        </ChartFrame>
    );
}
