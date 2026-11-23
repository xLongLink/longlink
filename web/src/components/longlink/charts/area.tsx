import { useId } from 'react';
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
            {(series) => (
                <>
                    {fill === 'gradient' && (
                        <defs>
                            {series.map((item, index) => (
                                <linearGradient key={item.key} id={`area-${id}-${index}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={item.color} stopOpacity={0.15} />
                                    <stop offset="100%" stopColor={item.color} stopOpacity={0} />
                                </linearGradient>
                            ))}
                        </defs>
                    )}
                    {series.map((item, index) => (
                        <recharts.Area
                            key={item.key}
                            dataKey={item.id}
                            name={item.id}
                            type={curve}
                            stroke={item.color}
                            fill={fill === 'gradient' ? `url(#area-${id}-${index})` : item.color}
                            fillOpacity={fill === 'gradient' ? 1 : 0.15}
                            activeDot={props.tooltip ?? false}
                            connectNulls={false}
                            isAnimationActive={false}
                        />
                    ))}
                </>
            )}
        </CartesianChart>
    );
}
