import * as data from './data';
import { ChartFrame } from './frame';
import * as recharts from 'recharts';
import type { ChartOptions, SankeyNode, SankeyLink } from './types';
import { ChartTooltip, ChartTooltipContent } from '@/components/shadcn/chart';

/** Renders validated acyclic flows with fixed node and link presentation. */
export function Sankey({
    nodes,
    links,
    tooltip = true,
    ...props
}: Omit<ChartOptions, 'legend'> & { nodes: readonly SankeyNode[]; links: readonly SankeyLink[] }) {
    const error = data.flowError(nodes, links);
    const flow = error
        ? { nodes: [], links: [] }
        : {
              nodes: nodes.map((node) => ({ name: node.name })),
              links: links.map((link) => ({ source: link.source, target: link.target, value: link.value }))
          };

    return (
        <ChartFrame
            {...props}
            label="Flow chart"
            config={{}}
            empty={!flow.links.some((link) => link.value > 0)}
            error={error}
        >
            <recharts.Sankey
                data={flow}
                node={{ fill: data.color(0) }}
                link={{ stroke: data.color(0), strokeOpacity: 0.25 }}
                nodePadding={24}
                margin={{ top: 12, right: 12, bottom: 12, left: 12 }}
                accessibilityLayer
            >
                {tooltip && <ChartTooltip isAnimationActive={false} content={<ChartTooltipContent hideLabel />} />}
            </recharts.Sankey>
        </ChartFrame>
    );
}
