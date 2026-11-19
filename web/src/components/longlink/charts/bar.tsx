import { color } from './data';
import * as recharts from 'recharts';
import { CartesianChart } from './cartesian';
import type { CartesianChartProps } from './types';

export function BarChart<Row extends object>(props: CartesianChartProps<Row>) {
    return (
        <CartesianChart {...props} chart={recharts.BarChart} label="Bar chart">
            {props.series.map((item, index) => (
                <recharts.Bar
                    key={item.key}
                    dataKey={`series-${index}`}
                    name={`series-${index}`}
                    fill={color(index)}
                    isAnimationActive={false}
                />
            ))}
        </CartesianChart>
    );
}
