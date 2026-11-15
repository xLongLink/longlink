import * as data from './data';
import { ChartFrame } from './frame';
import * as recharts from 'recharts';
import type { CartesianChartProps } from './types';
import { ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/shadcn/chart';

/** Plots numeric area series without filling gaps in missing data. */
export function AreaChart<Row extends object>({
    data: rows,
    xKey,
    series,
    legend = true,
    tooltip = true,
    ...props
}: CartesianChartProps<Row>) {
    const prepared = data.prepareSeries(rows, xKey, series);

    return (
        <ChartFrame
            {...props}
            label="Area chart"
            config={prepared.config}
            empty={!prepared.hasValues}
            error={prepared.error}
        >
            <recharts.AreaChart
                data={prepared.rows}
                accessibilityLayer
                margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
            >
                <recharts.CartesianGrid vertical={false} />
                <recharts.XAxis dataKey="category" axisLine={false} tickLine={false} tickMargin={8} />
                <recharts.YAxis axisLine={false} tickLine={false} width={48} />
                {series.map((item, index) => (
                    <recharts.Area
                        key={item.key}
                        dataKey={`series-${index}`}
                        name={`series-${index}`}
                        type="monotone"
                        stroke={data.color(index)}
                        fill={data.color(index)}
                        fillOpacity={0.15}
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
            </recharts.AreaChart>
        </ChartFrame>
    );
}
