import { z } from 'zod';
import type { ReactNode } from 'react';
import * as charts from '@astryxdesign/charts';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { StackItem } from '@astryxdesign/core/Stack';
import { EmptyState } from '@/components/ui/EmptyState';

type PlotProps<T extends Record<string, unknown>> = {
    /** Visible title and accessible name of the plot. */
    label: string;
    /** Supporting context, such as units and the reporting period. */
    description?: string;
    controls?: ReactNode;
    type?: 'line' | 'bar' | 'area' | 'scatter';
    data: readonly T[];
    xKey: Extract<keyof T, string>;
    series: readonly {
        key: Extract<keyof T, string>;
        label: string;
        color?: 'blue' | 'purple' | 'green' | 'orange' | 'pink';
    }[];
    height?: number;
    hasLegend?: boolean;
    curve?: 'linear' | 'monotone';
    hasDots?: boolean;
    yDomain?: readonly [number, number];
};

const configuration = z.object({
    label: z.string().trim().min(1),
    description: z.string().optional(),
    type: z.enum(['line', 'bar', 'area', 'scatter']).default('line'),
    xKey: z.string().min(1),
    series: z
        .array(
            z.object({
                key: z.string().min(1),
                label: z.string().trim().min(1),
                color: z.enum(['blue', 'purple', 'green', 'orange', 'pink']).optional(),
            })
        )
        .min(1),
    height: z.number().positive().default(300),
    hasLegend: z.boolean().default(true),
    curve: z.enum(['linear', 'monotone']).default('linear'),
    hasDots: z.boolean().default(true),
    yDomain: z
        .tuple([z.number(), z.number()])
        .refine(([first, last]) => first !== last, 'Plot domain endpoints must differ.')
        .optional(),
});

/** Renders themed plots from validated fields, preserving missing observations instead of replacing them with zero. */
export function Plot<T extends Record<string, unknown>>(props: PlotProps<T>) {
    // Validate the public configuration before constructing chart-library definitions.
    const config = configuration.parse(props);
    const keys = config.series.map((series) => series.key);

    if (new Set(keys).size !== keys.length || keys.includes(config.xKey)) {
        throw new Error('Plot series must have unique keys distinct from xKey.');
    }

    // Keep only plotted fields; never coerce numeric strings, booleans, or missing observations to zero.
    const fields = Object.fromEntries(config.series.map((series) => [series.key, z.number().nullish()]));
    const numericRows = z.array(z.object({ ...fields, [config.xKey]: z.number() }));
    const categoryRows = z.array(z.object({ ...fields, [config.xKey]: z.string().min(1) }));
    const rows = (config.type === 'scatter' ? numericRows : z.union([numericRows, categoryRows])).parse(props.data);

    // Repeated bar categories would otherwise paint overlapping observations at the same position.
    if (config.type === 'bar' && new Set(rows.map((row) => row[config.xKey])).size !== rows.length) {
        throw new Error('Bar plot categories must be unique; aggregate repeated categories before plotting.');
    }

    // Distinguish a misspelled series field from a dataset whose observations are explicitly missing.
    for (const key of keys) {
        if (rows.length > 0 && !rows.some((row) => Object.hasOwn(row, key))) {
            throw new Error(`Plot series field "${key}" was not found in the data.`);
        }
    }

    // Keep the plot's context visible when no series has an observation to draw.
    const header = (
        <Stack direction="horizontal" justify="between" align="start" gap={3}>
            <StackItem size="fill">
                <Stack gap={0}>
                    <Text as="h2" type="large" weight="medium" wordBreak="break-word">
                        {config.label}
                    </Text>
                    {config.description && <Text type="supporting">{config.description}</Text>}
                </Stack>
            </StackItem>
            {props.controls && <StackItem>{props.controls}</StackItem>}
        </Stack>
    );

    if (!rows.some((row) => keys.some((key) => row[key] != null))) {
        return (
            <Stack gap={2} role="group" aria-label={config.label}>
                {header}
                <EmptyState title="No data to plot" isCompact />
            </Stack>
        );
    }

    // Bar x values are categories even when their labels are numeric, such as reporting years.
    const data =
        config.type === 'bar' ? rows.map((row) => ({ ...row, [config.xKey]: String(row[config.xKey]) })) : rows;

    // Each chart owns fresh mark definitions because Astryx annotates them during layout.
    const series = config.series.map(({ key, label, color }) => {
        const options = { label, color: color ? `var(--color-series-${color})` : undefined };

        switch (config.type) {
            case 'bar':
                return charts.bar(key, { ...options, group: 'series' });
            case 'area':
                return charts.area(key, { ...options, curve: config.curve });
            case 'scatter':
                return charts.dot(key, options);
            case 'line':
                return charts.line(key, { ...options, curve: config.curve, dots: config.hasDots });
        }
    });

    return (
        <Stack gap={3}>
            {header}
            <charts.Chart
                data={data}
                xKey={config.xKey}
                series={series}
                title={config.label}
                subtitle={config.description}
                height={config.height}
                yDomain={config.yDomain}
                legend={config.hasLegend}
                tooltip
                className="min-w-0 [--color-border-emphasized:var(--color-border)] [&>div:first-child]:hidden! [&_svg[role=img]]:rounded-(--radius-container) [&_svg[role=img]]:bg-(--color-background-plot)"
                grid={<charts.ChartGrid horizontal />}
                axes={
                    <>
                        <charts.ChartAxis position="bottom" showAxisLine={false} />
                        <charts.ChartAxis position="left" />
                    </>
                }
            />
        </Stack>
    );
}
