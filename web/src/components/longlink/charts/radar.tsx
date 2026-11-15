import * as data from './data';
import { ChartFrame } from './frame';
import * as recharts from 'recharts';
import type { ChartOptions, ChartKey, ChartSeries } from './types';
import { ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/shadcn/chart';

/** Compares numeric series across named categories on shared polar axes. */
export function RadarChart<Row extends object>({
    data: rows,
    categoryKey,
    series,
    legend = true,
    tooltip = true,
    ...props
}: ChartOptions & { data: readonly Row[]; categoryKey: ChartKey<Row>; series: readonly ChartSeries<Row>[] }) {
    const prepared = data.prepareSeries(rows, categoryKey, series);

    return (
        <ChartFrame
            {...props}
            label="Radar chart"
            config={prepared.config}
            empty={!prepared.hasValues}
            error={prepared.error}
        >
            <recharts.RadarChart data={prepared.rows} accessibilityLayer outerRadius="75%">
                <recharts.PolarGrid />
                <recharts.PolarAngleAxis dataKey="category" />
                <recharts.PolarRadiusAxis axisLine={false} tick={false} />
                {series.map((item, index) => (
                    <recharts.Radar
                        key={item.key}
                        dataKey={`series-${index}`}
                        name={`series-${index}`}
                        stroke={data.color(index)}
                        fill={data.color(index)}
                        fillOpacity={0.15}
                        isAnimationActive={false}
                    />
                ))}
                {tooltip && <ChartTooltip isAnimationActive={false} content={<ChartTooltipContent />} />}
                {legend && (
                    <ChartLegend
                        content={<ChartLegendContent nameKey="value" className="flex-wrap gap-x-4 gap-y-2" />}
                    />
                )}
            </recharts.RadarChart>
        </ChartFrame>
    );
}
