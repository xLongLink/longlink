import * as data from './data';
import { renderAxes } from './axes';
import { ChartFrame } from './frame';
import * as recharts from 'recharts';
import type { CartesianChartProps } from './types';
import { ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/shadcn/chart';

/** Plots grouped numeric series with theme-owned presentation. */
export function BarChart<Row extends object>({
    data: rows,
    xKey,
    series,
    axes = false,
    legend = false,
    tooltip = false,
    padding = axes ? 12 : 0,
    xTickFormatter,
    yTickFormatter,
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
                margin={{ top: padding, right: padding, left: padding, bottom: padding }}
            >
                {renderAxes({ axes, xTickFormatter, yTickFormatter })}
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
