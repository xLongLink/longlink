import { useState } from 'react';
import ViewLayout from './ViewLayout';
import { Plot } from '@/components/ui/Plot';
import { Stack } from '@astryxdesign/core/Stack';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';

/** Documents the data-driven Plot contract shared by SDK Views. */
export default function PlotPage() {
    return (
        <ViewLayout
            name="Plot"
            isLongLinkSpecific
            introduction="Displays responsive line, grouped bar, area, and scatter plots using the current theme. Supply data, an x field, and labeled series; Plot provides axes, a legend, and pointer tooltips without adding a card. Small datasets include a screen-reader data table; provide an equivalent Table or summary for larger datasets so essential values never depend on hover."
            properties={[
                { name: 'label', type: 'string', description: 'Required visible title and accessible plot name.' },
                {
                    name: 'controls',
                    type: 'ReactNode',
                    description: 'Optional compact controls aligned with the plot heading, including empty states.',
                },
                {
                    name: 'description',
                    type: 'string',
                    description: 'Supporting context and accessible description, such as units and reporting period.',
                },
                {
                    name: 'type',
                    type: '"line" | "bar" | "area" | "scatter"',
                    description: 'Mark type. Defaults to line. Multiple bar series are grouped, not stacked.',
                },
                {
                    name: 'data',
                    type: 'readonly Record<string, unknown>[]',
                    description:
                        'Rows in display order. Series values must be finite numbers, null, or omitted. Missing values produce gaps, never zero. Empty or entirely missing observations show No data to plot. Invalid configuration or data is reported through the View error boundary. Use useApi for scoped Solution data; Plot does not fetch data.',
                },
                {
                    name: 'xKey',
                    type: 'string',
                    description:
                        'Field containing non-empty strings or finite numbers, consistently typed across rows. Scatter requires numeric x values. Bar treats numeric x values as category labels and requires unique categories; aggregate repeated categories before plotting. Dates can be supplied as category labels or numeric timestamps; no automatic date parsing or sorting is performed.',
                },
                {
                    name: 'series',
                    type: 'readonly { key: string; label: string; color?: "blue" | "purple" | "green" | "orange" | "pink" }[]',
                    description:
                        'At least one series. Keys must be unique, distinct from xKey, and present in non-empty data. Labels identify series in the legend and tooltip. Colors follow the theme.',
                },
                {
                    name: 'height',
                    type: 'number',
                    description:
                        'Positive finite plot height in pixels. Defaults to 300. Width follows its container; axis labels adapt to the available space.',
                },
                { name: 'hasLegend', type: 'boolean', description: 'Shows the series legend. Defaults to true.' },
                {
                    name: 'curve',
                    type: '"linear" | "monotone"',
                    description:
                        'Line/area interpolation. Defaults to linear; monotone creates smooth curves without overshooting observations.',
                },
                { name: 'hasDots', type: 'boolean', description: 'Point markers on line plots. Defaults to true.' },
                {
                    name: 'yDomain',
                    type: 'readonly [number, number]',
                    description:
                        'Explicit finite vertical endpoints; they must differ. Descending endpoints put rank 1 at the top. Omit for automatic scaling.',
                },
            ]}
            example={{
                title: 'Plot types',
                preview: <PlotExample />,
                code: `/** Compares completed tasks across reporting periods. */
export default function Tasks() {
  const data = [
    { month: 1, completed: 18, planned: 24 },
    { month: 2, completed: 27, planned: 30 },
    { month: 3, completed: 25, planned: 28 },
    { month: 4, completed: 38, planned: 36 },
    { month: 5, completed: 42, planned: 44 },
  ];

  return (
    <Card padding={5}>
      <Plot
        label="Completed tasks"
        description="Tasks per month"
        type="bar"
        data={data}
        xKey="month"
        series={[
          { key: 'completed', label: 'Completed' },
          { key: 'planned', label: 'Planned' },
        ]}
      />
    </Card>
  );
}`,
            }}
        />
    );
}

/** Exercises all supported mark types with one dataset and no custom chart styling. */
export function PlotExample() {
    const [type, setType] = useState('line');

    // Numeric reporting periods work as continuous positions or bar category labels.
    const data = [
        { month: 1, completed: 18, planned: 24 },
        { month: 2, completed: 27, planned: 30 },
        { month: 3, completed: 25, planned: 28 },
        { month: 4, completed: 38, planned: 36 },
        { month: 5, completed: 42, planned: 44 },
    ];

    return (
        <Stack gap={4}>
            <SegmentedControl label="Plot type" value={type} onChange={setType} size="sm">
                <SegmentedControlItem value="line" label="Line" />
                <SegmentedControlItem value="bar" label="Bar" />
                <SegmentedControlItem value="area" label="Area" />
                <SegmentedControlItem value="scatter" label="Scatter" />
            </SegmentedControl>
            <Plot
                label="Completed tasks"
                description="Tasks per month · Illustrative data"
                type={type === 'bar' || type === 'area' || type === 'scatter' ? type : 'line'}
                data={data}
                xKey="month"
                series={[
                    { key: 'completed', label: 'Completed' },
                    { key: 'planned', label: 'Planned' },
                ]}
            />
        </Stack>
    );
}
