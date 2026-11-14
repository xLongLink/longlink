export type FlowNode = { name: string; category: 'revenue' | 'profit' | 'expense' };

export type FlowLink = { source: number; target: number; value: number };

export type FlowData = { nodes: FlowNode[]; links: FlowLink[] };

export type RevenueQuarter = {
    label: string;
    revenue: number;
    grossProfit: number;
    operatingIncome: number;
    netIncome: number;
    data: FlowData;
};

/** Traces only directed ancestors and descendants, not siblings through a shared parent. */
export function traceFlow(data: FlowData, seeds: number[]): Set<number> {
    const traced = new Set<number>();

    for (const direction of ['source', 'target'] as const) {
        const visited = new Set(seeds);
        const queue = [...seeds];

        while (queue.length) {
            const current = queue.shift();

            data.links.forEach((link, index) => {
                if (link[direction] !== current) return;

                traced.add(index);
                const next = link[direction === 'source' ? 'target' : 'source'];

                if (!visited.has(next)) {
                    visited.add(next);
                    queue.push(next);
                }
            });
        }
    }

    return traced;
}

export function formatFlowValue(value: number): string {
    return `$${(value / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k`;
}
