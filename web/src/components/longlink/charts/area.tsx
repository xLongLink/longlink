import { useId } from 'react';
import * as data from './data';
import { renderAxes } from './axes';
import { ChartFrame } from './frame';
import * as recharts from 'recharts';
import type { CartesianChartProps, ChartCurve } from './types';
import { ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/shadcn/chart';

/** Plots numeric area series without filling gaps in missing data. */
export function AreaChart<Row extends object>({
    data: rows,
    xKey,
    series,
    axes = false,
    legend = false,
    tooltip = false,
    padding = axes ? 12 : 0,
    curve = 'monotone',
    fill = 'solid',
    xTickFormatter,
    yTickFormatter,
    ...props
}: CartesianChartProps<Row> & { curve?: ChartCurve; fill?: 'solid' | 'gradient' }) {
    const id = useId().replaceAll(':', '');
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
                margin={{ top: padding, right: padding, left: padding, bottom: padding }}
            >
                {fill === 'gradient' && (
                    <defs>
                        {series.map((item, index) => (
                            <linearGradient key={item.key} id={`area-${id}-${index}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={data.color(index)} stopOpacity={0.15} />
                                <stop offset="100%" stopColor={data.color(index)} stopOpacity={0} />
                            </linearGradient>
                        ))}
                    </defs>
                )}
                {renderAxes({ axes, xTickFormatter, yTickFormatter })}
                {series.map((item, index) => (
                    <recharts.Area
                        key={item.key}
                        dataKey={`series-${index}`}
                        name={`series-${index}`}
                        type={curve}
                        stroke={data.color(index)}
                        fill={fill === 'gradient' ? `url(#area-${id}-${index})` : data.color(index)}
                        fillOpacity={fill === 'gradient' ? 1 : 0.15}
                        activeDot={tooltip}
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
