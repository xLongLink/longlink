import * as data from './data';
import { ChartFrame } from './frame';
import * as recharts from 'recharts';
import type { ValueChartProps } from './types';
import { ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/shadcn/chart';

/** Shows radial values against an explicit zero-to-max scale rather than an inferred percentage. */
export function RadialBarChart<Row extends object>({
    data: rows,
    nameKey,
    valueKey,
    max,
    legend = false,
    tooltip = false,
    ...props
}: ValueChartProps<Row> & { max: number }) {
    const prepared = data.prepareSegments(rows, nameKey, valueKey);
    const error =
        prepared.error ??
        (!Number.isFinite(max) || max <= 0 || prepared.segments.some((segment) => segment.value > max)
            ? 'Radial values must fit within a finite, positive maximum.'
            : undefined);

    return (
        <ChartFrame
            {...props}
            label="Radial bar chart"
            config={prepared.config}
            empty={rows.length === 0}
            error={error}
        >
            <recharts.RadialBarChart
                data={prepared.segments}
                innerRadius="25%"
                outerRadius="90%"
                startAngle={90}
                endAngle={-270}
                accessibilityLayer
            >
                <recharts.PolarAngleAxis type="number" domain={[0, max]} tick={false} axisLine={false} />
                <recharts.RadialBar dataKey="value" background isAnimationActive={false} />
                {tooltip && (
                    <ChartTooltip isAnimationActive={false} content={<ChartTooltipContent nameKey="id" hideLabel />} />
                )}
                {legend && (
                    <ChartLegend
                        content={<ChartLegendContent nameKey="value" className="flex-wrap gap-x-4 gap-y-2" />}
                    />
                )}
            </recharts.RadialBarChart>
        </ChartFrame>
    );
}
