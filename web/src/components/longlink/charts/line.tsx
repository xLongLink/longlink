import * as recharts from 'recharts';
import { CartesianChart } from './cartesian';
import type { CartesianChartProps, ChartCurve } from './types';

export function LineChart<Row extends object>({
    curve = 'monotone',
    ...props
}: CartesianChartProps<Row> & { curve?: ChartCurve }) {
    return (
        <CartesianChart {...props} chart={recharts.LineChart} label="Line chart">
            {(series) =>
                series.map((item) => (
                    <recharts.Line
                        key={item.key}
                        dataKey={item.id}
                        name={item.id}
                        type={curve}
                        stroke={item.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={props.tooltip ?? false}
                        connectNulls={false}
                        isAnimationActive={false}
                    />
                ))
            }
        </CartesianChart>
    );
}
