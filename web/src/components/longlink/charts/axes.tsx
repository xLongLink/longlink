import * as recharts from 'recharts';
import type { CartesianChartProps } from './types';

export function renderAxes({
    axes,
    xTickFormatter,
    yTickFormatter
}: Pick<CartesianChartProps<object>, 'axes' | 'xTickFormatter' | 'yTickFormatter'>) {
    return (
        <>
            {axes && <recharts.CartesianGrid vertical={false} />}
            <recharts.XAxis
                dataKey="category"
                hide={!axes}
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                tickFormatter={xTickFormatter}
            />
            <recharts.YAxis hide={!axes} axisLine={false} tickLine={false} width={48} tickFormatter={yTickFormatter} />
        </>
    );
}
