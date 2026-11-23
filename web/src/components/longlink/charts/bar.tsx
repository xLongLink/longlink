import * as recharts from 'recharts';
import { CartesianChart } from './cartesian';
import type { CartesianChartProps } from './types';

export function BarChart<Row extends object>(props: CartesianChartProps<Row>) {
    return (
        <CartesianChart {...props} chart={recharts.BarChart} label="Bar chart">
            {(series) =>
                series.map((item) => (
                    <recharts.Bar
                        key={item.key}
                        dataKey={item.id}
                        name={item.id}
                        fill={item.color}
                        isAnimationActive={false}
                    />
                ))
            }
        </CartesianChart>
    );
}
