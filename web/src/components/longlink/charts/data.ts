import type { ChartConfig } from '@/components/shadcn/chart';
import type { ChartKey, ChartSeries, ChartValueKey, SankeyNode, SankeyLink } from './types';

/** Assigns theme-owned colors without interpreting data keys as CSS. */
export function color(index: number): string {
    return `var(--chart-${(index % 5) + 1})`;
}

/** Builds safe legend identifiers and rejects values that cannot be plotted faithfully. */
export function prepareSeries<Row extends object>(
    data: readonly Row[],
    categoryKey: ChartKey<Row>,
    series: readonly ChartSeries<Row>[]
) {
    const config: ChartConfig = {};
    const rows: Record<string, string | number | null>[] = [];
    const keys = new Set<string>();
    let hasValues = false;

    for (const [index, item] of series.entries()) {
        if (keys.has(item.key)) return { config, rows, hasValues, error: 'Chart series must use distinct keys.' };
        keys.add(item.key);
        config[`series-${index}`] = { label: item.label ?? item.key, color: color(index) };
    }

    for (const row of data) {
        const category = row?.[categoryKey];

        if (typeof category !== 'string' && !(typeof category === 'number' && Number.isFinite(category))) {
            return { config, rows, hasValues, error: 'Chart categories must be text or finite numbers.' };
        }

        const point: Record<string, string | number | null> = { category };

        for (const [index, item] of series.entries()) {
            const value = row[item.key];

            if (value === null || value === undefined) {
                point[`series-${index}`] = null;
                continue;
            }
            if (typeof value !== 'number' || !Number.isFinite(value)) {
                return { config, rows, hasValues, error: 'Chart values must be finite numbers or null.' };
            }
            point[`series-${index}`] = value;
            hasValues = true;
        }
        rows.push(point);
    }

    return { config, rows, hasValues, error: undefined };
}

/** Normalizes segment names and colors without exposing arbitrary SVG styling. */
export function prepareSegments<Row extends object>(
    data: readonly Row[],
    nameKey: ChartKey<Row>,
    valueKey: ChartValueKey<Row>
) {
    const config: ChartConfig = {};
    const segments: { id: string; name: string; value: number; fill: string }[] = [];
    let total = 0;

    for (const [index, row] of data.entries()) {
        const label = row?.[nameKey];
        const value = row?.[valueKey];

        if (
            (typeof label !== 'string' && !(typeof label === 'number' && Number.isFinite(label))) ||
            typeof value !== 'number' ||
            !Number.isFinite(value) ||
            value < 0 ||
            !Number.isFinite(total + value)
        ) {
            return { config, segments, total, error: 'Chart segments need labels and finite, nonnegative values.' };
        }

        const name = `segment-${index}`;
        config[name] = { label: String(label), color: color(index) };
        segments.push({ id: name, name, value, fill: color(index) });
        total += value;
    }

    return { config, segments, total, error: undefined };
}

/** Rejects invalid endpoints and cycles before Recharts computes the flow layout. */
export function flowError(nodes: readonly SankeyNode[], links: readonly SankeyLink[]): string | undefined {
    if (nodes.some((node) => typeof node?.name !== 'string')) return 'Flow nodes need names.';
    const incoming = nodes.map(() => 0);
    const outgoing = nodes.map((): number[] => []);
    const totals = nodes.map(() => 0);

    for (const link of links) {
        if (
            !link ||
            !Number.isInteger(link.source) ||
            !Number.isInteger(link.target) ||
            link.source < 0 ||
            link.target < 0 ||
            link.source >= nodes.length ||
            link.target >= nodes.length ||
            !Number.isFinite(link.value) ||
            link.value < 0
        ) {
            return 'Flow links need valid node indexes and finite, nonnegative values.';
        }

        incoming[link.target]++;
        outgoing[link.source].push(link.target);
        totals[link.source] += link.value;
        totals[link.target] += link.value;

        if (!Number.isFinite(totals[link.source]) || !Number.isFinite(totals[link.target])) {
            return 'Flow totals must be finite.';
        }
    }

    const ready = incoming.flatMap((count, index) => (count === 0 ? [index] : []));

    for (let index = 0; index < ready.length; index++) {
        for (const target of outgoing[ready[index]]) {
            incoming[target]--;
            if (incoming[target] === 0) ready.push(target);
        }
    }

    return ready.length === nodes.length ? undefined : 'Flow links must not contain cycles.';
}
