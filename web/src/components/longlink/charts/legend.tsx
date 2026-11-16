import { color } from './data';
import type { ChartKey, ChartValueKey } from './types';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

/** Renders chart labels independently of chart layout using the same ordered theme colors. */
export function ChartLegend<Row extends object>({
    series,
    data,
    nameKey,
    valueKey,
    formatValue,
    orientation = 'horizontal',
    ...props
}: Omit<ComponentPropsWithoutRef<'ul'>, 'children' | 'className' | 'style'> & {
    orientation?: 'horizontal' | 'vertical';
} & (
        | {
              series: readonly { key: string; label?: string }[];
              data?: never;
              nameKey?: never;
              valueKey?: never;
              formatValue?: never;
          }
        | {
              series?: never;
              data: readonly Row[];
              nameKey: ChartKey<Row>;
              valueKey?: ChartValueKey<Row>;
              formatValue?: (value: number) => ReactNode;
          }
    )) {
    const labels = series ? series.map((item) => item.label ?? item.key) : data.map((row) => row?.[nameKey]);
    const values = !series && valueKey !== undefined ? data.map((row) => row?.[valueKey]) : undefined;

    if (
        !labels.length ||
        labels.some((label) => typeof label !== 'string' && !(typeof label === 'number' && Number.isFinite(label))) ||
        values?.some((value) => typeof value !== 'number' || !Number.isFinite(value))
    ) {
        return null;
    }

    return (
        <ul
            {...props}
            data-slot="chart-legend"
            className={
                orientation === 'vertical'
                    ? 'flex w-full flex-col divide-y text-xs'
                    : 'flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs'
            }
            style={undefined}
        >
            {labels.map((label, index) => {
                const value = values?.[index];

                return (
                    <li
                        key={series?.[index].key ?? `${index}:${String(label)}`}
                        className={
                            orientation === 'vertical' ? 'flex items-center gap-2 py-3' : 'flex items-center gap-1.5'
                        }
                    >
                        <span
                            aria-hidden="true"
                            className="h-2 w-2 shrink-0 rounded-[2px]"
                            style={{ backgroundColor: color(index) }}
                        />
                        {typeof value === 'number' ? (
                            <>
                                <span className="min-w-0 flex-1">{String(label)}</span>
                                <span className="font-medium tabular-nums">
                                    {formatValue ? formatValue(value) : value}
                                </span>
                            </>
                        ) : (
                            String(label)
                        )}
                    </li>
                );
            })}
        </ul>
    );
}
