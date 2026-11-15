import { color } from './data';
import type { ChartKey } from './types';
import type { ComponentPropsWithoutRef } from 'react';

/** Renders chart labels independently of chart layout using the same ordered theme colors. */
export function ChartLegend<Row extends object>({
    series,
    data,
    nameKey,
    ...props
}: Omit<ComponentPropsWithoutRef<'ul'>, 'children' | 'className' | 'style'> &
    (
        | { series: readonly { key: string; label?: string }[]; data?: never; nameKey?: never }
        | { series?: never; data: readonly Row[]; nameKey: ChartKey<Row> }
    )) {
    const labels = series ? series.map((item) => item.label ?? item.key) : data.map((row) => row?.[nameKey]);

    if (
        !labels.length ||
        labels.some((label) => typeof label !== 'string' && !(typeof label === 'number' && Number.isFinite(label)))
    ) {
        return null;
    }

    return (
        <ul
            {...props}
            data-slot="chart-legend"
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs"
            style={undefined}
        >
            {labels.map((label, index) => (
                <li key={series?.[index].key ?? `${index}:${String(label)}`} className="flex items-center gap-1.5">
                    <span
                        aria-hidden="true"
                        className="h-2 w-2 shrink-0 rounded-[2px]"
                        style={{ backgroundColor: color(index) }}
                    />
                    {String(label)}
                </li>
            ))}
        </ul>
    );
}
