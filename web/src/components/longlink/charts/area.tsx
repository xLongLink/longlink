import { useId } from 'react';
import { color } from './data';
import * as recharts from 'recharts';
import { CartesianChart } from './cartesian';
import type { CartesianChartProps, ChartCurve } from './types';

export function AreaChart<Row extends object>({
    curve = 'monotone',
    fill = 'solid',
    ...props
}: CartesianChartProps<Row> & { curve?: ChartCurve; fill?: 'solid' | 'gradient' }) {
    const id = useId().replaceAll(':', '');

    return (
        <CartesianChart {...props} chart={recharts.AreaChart} label="Area chart">
            {fill === 'gradient' && (
                <defs>
                    {props.series.map((item, index) => (
                        <linearGradient key={item.key} id={`area-${id}-${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color(index)} stopOpacity={0.15} />
                            <stop offset="100%" stopColor={color(index)} stopOpacity={0} />
                        </linearGradient>
                    ))}
                </defs>
            )}
            {props.series.map((item, index) => (
                <recharts.Area
                    key={item.key}
                    dataKey={`series-${index}`}
                    name={`series-${index}`}
                    type={curve}
                    stroke={color(index)}
                    fill={fill === 'gradient' ? `url(#area-${id}-${index})` : color(index)}
                    fillOpacity={fill === 'gradient' ? 1 : 0.15}
                    activeDot={props.tooltip ?? false}
                    connectNulls={false}
                    isAnimationActive={false}
                />
            ))}
        </CartesianChart>
    );
}
