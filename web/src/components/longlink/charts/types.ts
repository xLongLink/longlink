import type { ComponentPropsWithoutRef } from 'react';

export type ChartKey<Row> = Extract<keyof Row, string>;

export type ChartValueKey<Row> = {
    [Key in keyof Row]-?: NonNullable<Row[Key]> extends number ? Key : never;
}[keyof Row] &
    string;

export type ChartSeries<Row> = { key: ChartValueKey<Row>; label?: string };

export type ChartOptions = Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'className' | 'style'> & {
    legend?: boolean;
    tooltip?: boolean;
};

export type CartesianChartProps<Row extends object> = ChartOptions & {
    axes?: boolean;
    data: readonly Row[];
    xKey: ChartKey<Row>;
    series: readonly ChartSeries<Row>[];
};

export type ValueChartProps<Row extends object> = ChartOptions & {
    data: readonly Row[];
    nameKey: ChartKey<Row>;
    valueKey: ChartValueKey<Row>;
};

export type SankeyNode = { name: string };

export type SankeyLink = { source: number; target: number; value: number };
