import * as data from './data';
import { ChartFrame } from './frame';
import * as recharts from 'recharts';
import type { ValueChartProps } from './types';
import { ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/shadcn/chart';

/** Shows nonnegative contributions without letting data supply its own colors. */
export function PieChart<Row extends object>({
    data: rows,
    nameKey,
    valueKey,
    legend = true,
    tooltip = true,
    ...props
}: ValueChartProps<Row>) {
    const prepared = data.prepareSegments(rows, nameKey, valueKey);

    return (
        <ChartFrame
            {...props}
            label="Pie chart"
            config={prepared.config}
            empty={prepared.total === 0}
            error={prepared.error}
        >
            <recharts.PieChart accessibilityLayer>
                <recharts.Pie
                    data={prepared.segments}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="55%"
                    outerRadius="85%"
                    paddingAngle={2}
                    isAnimationActive={false}
                />
                {tooltip && (
                    <ChartTooltip isAnimationActive={false} content={<ChartTooltipContent nameKey="id" hideLabel />} />
                )}
                {legend && (
                    <ChartLegend
                        content={<ChartLegendContent nameKey="value" className="flex-wrap gap-x-4 gap-y-2" />}
                    />
                )}
            </recharts.PieChart>
        </ChartFrame>
    );
}
