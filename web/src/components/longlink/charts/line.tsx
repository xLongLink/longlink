import * as data from './data';
import { ChartFrame } from './frame';
import * as recharts from 'recharts';
import type { CartesianChartProps } from './types';
import { ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/shadcn/chart';

/** Plots numeric line series while preserving zero values and missing-point gaps. */
export function LineChart<Row extends object>({
    data: rows,
    xKey,
    series,
    axes = true,
    legend = true,
    tooltip = true,
    ...props
}: CartesianChartProps<Row>) {
    const prepared = data.prepareSeries(rows, xKey, series);

    return (
        <ChartFrame
            {...props}
            label="Line chart"
            config={prepared.config}
            empty={!prepared.hasValues}
            error={prepared.error}
        >
            <recharts.LineChart
                data={prepared.rows}
                accessibilityLayer
                margin={{ top: 12, right: 12, left: axes ? 0 : 12, bottom: axes ? 0 : 12 }}
            >
                {axes && <recharts.CartesianGrid vertical={false} />}
                <recharts.XAxis dataKey="category" hide={!axes} axisLine={false} tickLine={false} tickMargin={8} />
                <recharts.YAxis hide={!axes} axisLine={false} tickLine={false} width={48} />
                {series.map((item, index) => (
                    <recharts.Line
                        key={item.key}
                        dataKey={`series-${index}`}
                        name={`series-${index}`}
                        type="monotone"
                        stroke={data.color(index)}
                        strokeWidth={2}
                        dot={false}
                        connectNulls={false}
                        isAnimationActive={false}
                    />
                ))}
                {tooltip && <ChartTooltip isAnimationActive={false} content={<ChartTooltipContent />} />}
                {legend && (
                    <ChartLegend
                        content={<ChartLegendContent nameKey="value" className="flex-wrap gap-x-4 gap-y-2" />}
                    />
                )}
            </recharts.LineChart>
        </ChartFrame>
    );
}
