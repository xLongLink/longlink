import * as data from './data';
import { ChartFrame } from './frame';
import * as recharts from 'recharts';
import type { ReactNode } from 'react';
import type { ValueChartProps } from './types';
import { ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/shadcn/chart';

/** Shows nonnegative contributions without letting data supply its own colors. */
export function PieChart<Row extends object>({
    data: rows,
    nameKey,
    valueKey,
    legend = false,
    tooltip = false,
    center,
    ...props
}: ValueChartProps<Row> & { center?: ReactNode }) {
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
                >
                    {center != null && (
                        <recharts.Label
                            content={({ viewBox }) => {
                                if (!viewBox || !('cx' in viewBox) || !('innerRadius' in viewBox)) return null;

                                const { cx, cy, innerRadius } = viewBox;

                                if (typeof cx !== 'number' || typeof cy !== 'number' || typeof innerRadius !== 'number')
                                    return null;

                                return (
                                    <foreignObject
                                        data-slot="chart-center"
                                        x={cx - innerRadius}
                                        y={cy - innerRadius}
                                        width={innerRadius * 2}
                                        height={innerRadius * 2}
                                        pointerEvents="none"
                                    >
                                        <div className="flex size-full flex-col items-center justify-center text-center">
                                            {center}
                                        </div>
                                    </foreignObject>
                                );
                            }}
                        />
                    )}
                </recharts.Pie>
                {tooltip && (
                    <ChartTooltip
                        isAnimationActive={false}
                        content={<ChartTooltipContent nameKey="name" hideLabel />}
                    />
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
