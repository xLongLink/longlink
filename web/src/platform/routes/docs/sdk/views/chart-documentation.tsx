import ViewLayout from './view-layout';
import { ChartExample, type ChartName } from './chart-example';

/** Documents the owned chart APIs and Box-controlled sizing from the SDK catalog. */
export default function ChartDocumentation({ name }: { name: ChartName }) {
    const cartesian = name === 'AreaChart' || name === 'BarChart' || name === 'LineChart';
    const sankey = name === 'Sankey';
    const radar = name === 'RadarChart';

    const data = sankey
        ? `const nodes = [{ name: 'Revenue' }, { name: 'Costs' }, { name: 'Profit' }];
  const links = [
    { source: 0, target: 1, value: 60 },
    { source: 0, target: 2, value: 40 },
  ];`
        : `const data = [
    { month: 'Jan', requests: 120, responses: 90 },
    { month: 'Feb', requests: 180, responses: 140 },
    { month: 'Mar', requests: 150, responses: 130 },
    { month: 'Apr', requests: 240, responses: 190 },
    { month: 'May', requests: 210, responses: 170 },
  ];${
      cartesian || radar
          ? `
  /** @type {ChartSeries<(typeof data)[number]>[]} */
  const series = [
    { key: 'requests', label: 'Requests' },
    { key: 'responses', label: 'Responses' },
  ];`
          : ''
  }`;

    const props = sankey
        ? 'nodes={nodes} links={links} tooltip aria-label="Revenue allocation"'
        : cartesian
          ? 'data={data} xKey="month" series={series} axes tooltip aria-label="Monthly requests and responses"'
          : radar
            ? 'data={data} categoryKey="month" series={series} axes tooltip aria-label="Monthly requests and responses"'
            : `data={data} nameKey="month" valueKey="requests"${name === 'RadialBarChart' ? ' max={300}' : ''} tooltip aria-label="Monthly requests"`;

    return (
        <ViewLayout
            name={name}
            relatedComponents={sankey ? undefined : ['ChartLegend']}
            example={{
                title: name,
                preview: <ChartExample name={name} />,
                code: `function Example() {
  ${data}

  return (
    ${
        sankey
            ? `<Box height={280}>
      <${name} ${props} />
    </Box>`
            : `<Box width="100%">
      <Card footer={<ChartLegend ${cartesian || radar ? 'series={series}' : 'data={data} nameKey="month"'} />}>
        <Box height={280}>
          <${name} ${props} legend={false} />
        </Box>
      </Card>
    </Box>`
    }
  );
}`
            }}
        />
    );
}
