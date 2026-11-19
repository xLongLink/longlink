import { color } from './data';
import * as recharts from 'recharts';
import { CartesianChart } from './cartesian';
import type { CartesianChartProps, ChartCurve } from './types';

export function LineChart<Row extends object>({
    curve = 'monotone',
    ...props
}: CartesianChartProps<Row> & { curve?: ChartCurve }) {
    return (
        <CartesianChart {...props} chart={recharts.LineChart} label="Line chart">
            {props.series.map((item, index) => (
                <recharts.Line
                    key={item.key}
                    dataKey={`series-${index}`}
                    name={`series-${index}`}
                    type={curve}
                    stroke={color(index)}
                    strokeWidth={2}
                    dot={false}
                    activeDot={props.tooltip ?? false}
                    connectNulls={false}
                    isAnimationActive={false}
                />
            ))}
        </CartesianChart>
    );
}
