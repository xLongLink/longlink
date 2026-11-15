import * as data from './data';
import { ChartFrame } from './frame';
import * as recharts from 'recharts';
import type { CartesianChartProps } from './types';
import { ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/shadcn/chart';

/** Plots grouped numeric series with theme-owned presentation. */
export function BarChart<Row extends object>({
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
            label="Bar chart"
            config={prepared.config}
            empty={!prepared.hasValues}
            error={prepared.error}
        >
            <recharts.BarChart
                data={prepared.rows}
                accessibilityLayer
                margin={{ top: 12, right: 12, left: axes ? 0 : 12, bottom: axes ? 0 : 12 }}
            >
                {axes && <recharts.CartesianGrid vertical={false} />}
                <recharts.XAxis dataKey="category" hide={!axes} axisLine={false} tickLine={false} tickMargin={8} />
                <recharts.YAxis hide={!axes} axisLine={false} tickLine={false} width={48} />
                {series.map((item, index) => (
                    <recharts.Bar
                        key={item.key}
                        dataKey={`series-${index}`}
                        name={`series-${index}`}
                        fill={data.color(index)}
                        isAnimationActive={false}
                    />
                ))}
                {tooltip && <ChartTooltip isAnimationActive={false} content={<ChartTooltipContent />} />}
                {legend && (
                    <ChartLegend
                        content={<ChartLegendContent nameKey="value" className="flex-wrap gap-x-4 gap-y-2" />}
                    />
                )}
            </recharts.BarChart>
        </ChartFrame>
    );
}
