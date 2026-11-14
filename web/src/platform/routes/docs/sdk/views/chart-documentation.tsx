import ViewLayout from './view-layout';
import { ChartExample, type ChartName } from './chart-example';

const plots: Record<ChartName, string> = {
    AreaChart: `<AreaChart data={data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} />
        <Area dataKey="requests" type="monotone" stroke="var(--color-requests)" fill="var(--color-requests)" fillOpacity={0.12} isAnimationActive={false} />
        <Area dataKey="responses" type="monotone" stroke="var(--color-responses)" fill="var(--color-responses)" fillOpacity={0.12} isAnimationActive={false} />`,
    BarChart: `<BarChart data={data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} />
        <Bar dataKey="requests" fill="var(--color-requests)" isAnimationActive={false} />
        <Bar dataKey="responses" fill="var(--color-responses)" isAnimationActive={false} />`,
    LineChart: `<LineChart data={data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} />
        <Line dataKey="requests" type="monotone" stroke="var(--color-requests)" dot={false} isAnimationActive={false} />
        <Line dataKey="responses" type="monotone" stroke="var(--color-responses)" dot={false} isAnimationActive={false} />`,
    RadarChart: `<RadarChart data={data} accessibilityLayer>
        <PolarGrid />
        <PolarAngleAxis dataKey="month" />
        <Radar dataKey="requests" stroke="var(--color-requests)" fill="var(--color-requests)" fillOpacity={0.15} isAnimationActive={false} />
        <Radar dataKey="responses" stroke="var(--color-responses)" fill="var(--color-responses)" fillOpacity={0.15} isAnimationActive={false} />`,
    PieChart: `<PieChart accessibilityLayer>
        <Pie data={data} dataKey="requests" nameKey="month" innerRadius="60%" paddingAngle={3} isAnimationActive={false} />`,
    RadialBarChart: `<RadialBarChart data={data} innerRadius="35%" outerRadius="90%" accessibilityLayer>
        <RadialBar dataKey="requests" background isAnimationActive={false} />`,
    Sankey: `<Sankey
        data={data}
        node={{ fill: 'var(--chart-1)' }}
        link={{ stroke: 'var(--chart-1)', strokeOpacity: 0.25 }}
        nodePadding={28}
        margin={{ top: 16, right: 16, bottom: 16, left: 16 }}
      >`
};

/** Documents native Recharts composition with shadcn chart presentation. */
export default function ChartDocumentation({ name }: { name: ChartName }) {
    const circular = name === 'PieChart' || name === 'RadialBarChart';
    const sankey = name === 'Sankey';

    // Show native data shapes and explicit series instead of a shared adapter contract.
    const code = `/** Renders a native ${name} with shadcn chart components. */
function Example() {
  const data = ${
      sankey
          ? `{
    nodes: [{ name: 'Revenue' }, { name: 'Costs' }, { name: 'Profit' }],
    links: [
      { source: 0, target: 1, value: 60 },
      { source: 0, target: 2, value: 40 },
    ],
  }`
          : `[
    { month: 'Jan', requests: 120, responses: 90, fill: 'var(--chart-1)' },
    { month: 'Feb', requests: 180, responses: 140, fill: 'var(--chart-2)' },
    { month: 'Mar', requests: 150, responses: 130, fill: 'var(--chart-3)' },
    { month: 'Apr', requests: 240, responses: 190, fill: 'var(--chart-4)' },
    { month: 'May', requests: 210, responses: 170, fill: 'var(--chart-5)' },
  ]`
  };
  const config = {
    requests: { label: 'Requests', color: 'var(--chart-1)' },
    responses: { label: 'Responses', color: 'var(--chart-2)' },
  };

  return (
    <ChartContainer config={config} className="w-full aspect-auto" style={{ height: 280 }} aria-label="${sankey ? 'Revenue allocation' : 'Monthly requests'}">
      ${plots[name]}
        <ChartTooltip content={<ChartTooltipContent${circular ? ' nameKey="month"' : ''} />} />
        ${sankey ? '' : `<ChartLegend content={<ChartLegendContent${circular ? ' nameKey="month"' : ''} />} />`}
      </${name}>
    </ChartContainer>
  );
}`;

    // Reference the installed native APIs without promising wrapper-owned behavior.
    return (
        <ViewLayout
            name={name}
            properties={[
                {
                    name: name === 'PieChart' ? 'Pie.data' : 'data',
                    type: sankey ? '{ nodes: object[]; links: object[] }' : 'object[]',
                    description: sankey
                        ? 'Native Sankey data. Links use zero-based source and target node indexes. Supply valid acyclic flows.'
                        : 'Rows in your own shape. Select fields with native dataKey props.'
                },
                { name: 'children', type: 'ReactNode', description: 'Native marks, axes, grids, tooltip, and legend.' },
                ...(!sankey
                    ? [
                          {
                              name: 'accessibilityLayer',
                              type: 'boolean',
                              description: 'Enables native Recharts keyboard and screen-reader support.'
                          },
                          {
                              name: `${name.replace(/Chart$/, '')}.dataKey`,
                              type: 'string | number | ((row) => unknown)',
                              description: 'Field or accessor used by this native chart mark.'
                          }
                      ]
                    : []),
                {
                    name: 'ChartContainer.config',
                    type: 'ChartConfig',
                    description: 'Labels and colors keyed by data field, independent of the row data.'
                },
                {
                    name: 'ChartContainer.style',
                    type: 'CSSProperties',
                    description: 'Set a height, or use className to provide a height or aspect ratio.'
                },
                { name: 'ChartContainer.aria-label', type: 'string', description: 'Accessible chart name.' },
                {
                    name: 'ChartTooltip.content',
                    type: 'ReactElement',
                    description: 'Use ChartTooltipContent for the themed tooltip.'
                },
                {
                    name: 'ChartLegend.content',
                    type: 'ReactElement',
                    description: 'Use ChartLegendContent for the themed legend.'
                }
            ]}
            example={{ title: name, preview: <ChartExample name={name} />, code }}
        />
    );
}
