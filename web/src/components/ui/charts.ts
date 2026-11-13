export type ChartSeries = {
    key: string;
    label: string;
};

export type ChartRow = Record<string, string | number>;

export type ChartProps = {
    label: string;
    data: ChartRow[];
    categoryKey: string;
    series: ChartSeries[];
    height?: number;
};

export type SankeyChartProps = {
    label: string;
    nodes: { name: string }[];
    links: { source: number; target: number; value: number }[];
    height?: number;
};

export const sankeyDataSchema = z
    .object({
        nodes: z.array(z.object({ name: z.string() })).min(1),
        links: z
            .array(
                z.object({
                    source: z.number().int().nonnegative(),
                    target: z.number().int().nonnegative(),
                    value: z.number().positive(),
                })
            )
            .min(1),
    })
    .superRefine(({ nodes, links }, context) => {
        // Reject invalid references before building the adjacency list.
        if (links.some((link) => link.source >= nodes.length || link.target >= nodes.length)) {
            context.addIssue({ code: 'custom', message: 'Links must reference existing nodes.' });

            return;
        }

        // Recharts requires an acyclic graph to calculate node depths.
        const incoming = nodes.map(() => 0);
        const outgoing = nodes.map(() => new Array<number>());

        for (const link of links) {
            incoming[link.target]++;
            outgoing[link.source].push(link.target);
        }

        const pending = nodes.flatMap((_, index) => (incoming[index] === 0 ? [index] : []));

        for (let index = 0; index < pending.length; index++) {
            for (const target of outgoing[pending[index]]) {
                incoming[target]--;

                if (incoming[target] === 0) pending.push(target);
            }
        }

        if (pending.length !== nodes.length) {
            context.addIssue({ code: 'custom', message: 'Flow charts cannot contain cycles.' });
        }
    });

import { z } from 'zod';
