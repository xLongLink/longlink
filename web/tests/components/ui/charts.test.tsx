// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { Box } from '@/components/longlink/layout/box';
import { Card, ChartLegend } from '@/components/longlink';
import { BarChart } from '@/components/longlink/charts/bar';
import { PieChart } from '@/components/longlink/charts/pie';
import { Sankey } from '@/components/longlink/charts/sankey';
import { AreaChart } from '@/components/longlink/charts/area';
import { LineChart } from '@/components/longlink/charts/line';
import type { ChartSeries } from '@/components/longlink/charts/types';

/** Supplies browser layout measurements while retaining the real responsive chart lifecycle. */
function measureCharts(element: HTMLDivElement | null): void {
    for (const container of element?.querySelectorAll<HTMLElement>('.recharts-responsive-container') ?? []) {
        container.getBoundingClientRect = () => new DOMRect(0, 0, 640, 280);
    }
}
import { RadialBarChart } from '@/components/longlink/charts/radial-bar';

it('keeps a footer legend aligned with chart colors when series are reordered', async () => {
    const rows = [{ month: 'Jan', requests: 12, responses: 9 }];

    function Preview() {
        const [series, setSeries] = useState<ChartSeries<(typeof rows)[number]>[]>([
            { key: 'requests', label: 'Requests' },
            { key: 'responses', label: 'Responses' }
        ]);

        return (
            <div ref={(element) => measureCharts(element)}>
                <button type="button" onClick={() => setSeries((items) => [...items].reverse())}>
                    Reverse
                </button>
                <Card footer={<ChartLegend series={series} />}>
                    <Box height={280}>
                        <BarChart data={rows} xKey="month" series={series} legend={false} />
                    </Box>
                </Card>
            </div>
        );
    }

    await withMounted(<Preview />, async (output) => {
        const legend = output.querySelector('[data-slot="card-footer"] [data-slot="chart-legend"]');
        const reverse = output.querySelector('button');

        if (!legend || !reverse) throw new Error('Expected footer legend and reorder control');
        await vi.waitFor(() => expect(output.querySelectorAll('.recharts-bar-rectangle path')).toHaveLength(2));
        expect(output.querySelector('.recharts-legend-wrapper')).toBeNull();
        expect(output.querySelector('[data-slot="chart-root"]')?.contains(legend)).toBe(false);
        expect(Array.from(legend.querySelectorAll('li'), (item) => item.textContent)).toEqual([
            'Requests',
            'Responses'
        ]);
        const user = userEvent.setup();
        await act(async () => user.click(reverse));
        await vi.waitFor(() => {
            expect(Array.from(legend.querySelectorAll('li'), (item) => item.textContent)).toEqual([
                'Responses',
                'Requests'
            ]);
            const fills = Array.from(output.querySelectorAll('.recharts-bar-rectangle path'))
                .sort((left, right) => Number(left.getAttribute('height')) - Number(right.getAttribute('height')))
                .map((bar) => bar.getAttribute('fill'));
            expect(
                Array.from(legend.querySelectorAll<HTMLElement>('li span'), (swatch) => swatch.style.backgroundColor)
            ).toEqual(fills);
        });
    });
});

it('adds or removes chart controls only when requested', async () => {
    function Preview() {
        const [details, setDetails] = useState(false);

        return (
            <div ref={(element) => measureCharts(element)}>
                <button type="button" onClick={() => setDetails((value) => !value)}>
                    Toggle details
                </button>
                <Box height={280}>
                    <AreaChart
                        data={[
                            { month: 'Jan', requests: 10 },
                            { month: 'Feb', requests: 20 },
                            { month: 'Mar', requests: 5 }
                        ]}
                        xKey="month"
                        series={[{ key: 'requests', label: 'Requests' }]}
                        curve="linear"
                        fill="gradient"
                        {...(details ? { axes: true, legend: true, tooltip: true } : {})}
                    />
                </Box>
            </div>
        );
    }

    await withMounted(<Preview />, async (output) => {
        const user = userEvent.setup();
        const toggle = output.querySelector('button');

        if (!toggle) throw new Error('Expected chart detail control');

        await vi.waitFor(() => {
            const path = output.querySelector('.recharts-area-curve')?.getAttribute('d');
            expect(path).toBeTruthy();
        });
        expect(output.querySelector('.recharts-cartesian-grid')).toBeNull();
        expect(output.querySelector('.recharts-cartesian-axis-tick')).toBeNull();
        expect(output.querySelector('.recharts-legend-wrapper')).toBeNull();
        expect(output.querySelector('.recharts-tooltip-wrapper')).toBeNull();

        await act(async () => user.click(toggle));
        await vi.waitFor(() => {
            expect(output.querySelector('.recharts-cartesian-grid')).not.toBeNull();
            expect(output.textContent).toContain('Jan');
            expect(output.querySelector('.recharts-legend-wrapper')?.textContent).toContain('Requests');
        });
        const chart = output.querySelector<SVGSVGElement>('svg[role="application"]');

        if (!chart) throw new Error('Expected keyboard-accessible chart');

        await act(async () => chart.focus());
        await act(async () => user.keyboard('{ArrowRight}'));
        await vi.waitFor(() =>
            expect(output.querySelector('.recharts-tooltip-wrapper')?.textContent).toContain('Requests')
        );

        await act(async () => user.click(toggle));
        expect(output.querySelector('.recharts-cartesian-grid')).toBeNull();
        expect(output.querySelector('.recharts-legend-wrapper')).toBeNull();
        expect(output.querySelector('.recharts-tooltip-wrapper')).toBeNull();
        expect(output.querySelector('.recharts-active-dot')).toBeNull();
    });
});

it('formats category and value labels when the shared Cartesian axes are enabled', async () => {
    await withMounted(
        <div ref={(element) => measureCharts(element)}>
            <Box height={280}>
                <BarChart
                    data={[
                        { month: 'Jan', requests: 10 },
                        { month: 'Feb', requests: 20 }
                    ]}
                    xKey="month"
                    series={[{ key: 'requests' }]}
                    axes
                    xTickFormatter={(value) => `Month ${value}`}
                    yTickFormatter={(value) => `${value} requests`}
                />
            </Box>
        </div>,
        async (output) => {
            await vi.waitFor(() => {
                const labels = Array.from(
                    output.querySelectorAll('.recharts-cartesian-axis-tick-value'),
                    (tick) => tick.textContent
                ).join(' ');
                expect(labels).toContain('Month Jan');
                expect(labels).toContain('requests');
            });
        }
    );
});

it('matches external segment legends to plotted order and clears them when data is removed', async () => {
    function Preview() {
        const [rows, setRows] = useState(
            Array.from({ length: 6 }, (_, index) => ({ 'segment.name': index % 2, value: index + 1 }))
        );

        return (
            <div ref={(element) => measureCharts(element)}>
                <button type="button" onClick={() => setRows([])}>
                    Clear
                </button>
                <Box height={280}>
                    <PieChart data={rows} nameKey="segment.name" valueKey="value" legend={false} />
                </Box>
                <ChartLegend data={rows} nameKey="segment.name" />
            </div>
        );
    }

    await withMounted(<Preview />, async (output) => {
        const clear = output.querySelector('button');

        if (!clear) throw new Error('Expected clear control');
        await vi.waitFor(() => {
            const fills = Array.from(output.querySelectorAll('.recharts-pie-sector path'), (segment) =>
                segment.getAttribute('fill')
            );
            expect(fills).toHaveLength(6);
            expect(
                Array.from(
                    output.querySelectorAll<HTMLElement>('[data-slot="chart-legend"] li span'),
                    (swatch) => swatch.style.backgroundColor
                )
            ).toEqual(fills);
        });
        expect(
            Array.from(output.querySelectorAll('[data-slot="chart-legend"] li'), (item) => item.textContent)
        ).toEqual(['0', '1', '0', '1', '0', '1']);
        const user = userEvent.setup();
        await act(async () => user.click(clear));
        expect(output.querySelector('[data-slot="chart-legend"]')).toBeNull();
        expect(output.querySelector('[role="status"]')?.textContent).toBe('No data');
    });
});

it.each([PieChart, RadialBarChart])(
    'resolves segment tooltip labels while navigating between values',
    async (Chart) => {
        await withMounted(
            <div ref={(element) => measureCharts(element)}>
                <Box height={280}>
                    <Chart
                        data={[
                            { name: 'Partner', count: 60 },
                            { name: 'Direct', count: 40 }
                        ]}
                        nameKey="name"
                        valueKey="count"
                        max={100}
                        tooltip
                    />
                </Box>
            </div>,
            async (output) => {
                await vi.waitFor(() => expect(output.querySelector('svg[role="application"]')).not.toBeNull());
                const chart = output.querySelector<SVGSVGElement>('svg[role="application"]');

                if (!chart) throw new Error('Expected keyboard-accessible segment chart');
                const user = userEvent.setup();
                await act(async () => chart.focus());
                await vi.waitFor(() => {
                    expect(output.querySelector('.recharts-tooltip-wrapper')?.textContent).toContain('Partner');
                    expect(output.querySelector('.recharts-tooltip-wrapper')?.textContent).toContain('60');
                });
                await act(async () => user.keyboard('{ArrowRight}'));
                await vi.waitFor(() => {
                    expect(output.querySelector('.recharts-tooltip-wrapper')?.textContent).toContain('Direct');
                    expect(output.querySelector('.recharts-tooltip-wrapper')?.textContent).toContain('40');
                });
            }
        );
    }
);

it('updates doughnut center content and value legends together, clearing stale totals when data disappears', async () => {
    function Preview() {
        const [rows, setRows] = useState([
            { name: 'Partner', count: 60 },
            { name: 'Direct', count: 40 }
        ]);

        return (
            <div ref={(element) => measureCharts(element)}>
                <button
                    type="button"
                    onClick={() =>
                        setRows([
                            { name: 'Direct', count: 50 },
                            { name: 'Partner', count: 150 }
                        ])
                    }
                >
                    Refresh
                </button>
                <button type="button" onClick={() => setRows([])}>
                    Clear
                </button>
                <Box height={280}>
                    <PieChart
                        data={rows}
                        nameKey="name"
                        valueKey="count"
                        center={<span>{rows.reduce((sum, row) => sum + row.count, 0)} total requests</span>}
                    />
                </Box>
                <ChartLegend
                    data={rows}
                    nameKey="name"
                    valueKey="count"
                    formatValue={(value) => `${value} requests`}
                    orientation="vertical"
                />
            </div>
        );
    }

    await withMounted(<Preview />, async (output) => {
        const user = userEvent.setup();
        const [refresh, clear] = output.querySelectorAll('button');

        if (!refresh || !clear) throw new Error('Expected chart refresh controls');

        await vi.waitFor(() =>
            expect(output.querySelector('[data-slot="chart-center"]')?.textContent).toBe('100 total requests')
        );
        expect(Array.from(output.querySelectorAll('[data-slot="chart-legend"] li'), (row) => row.textContent)).toEqual([
            'Partner60 requests',
            'Direct40 requests'
        ]);

        await act(async () => user.click(refresh));
        await vi.waitFor(() =>
            expect(output.querySelector('[data-slot="chart-center"]')?.textContent).toBe('200 total requests')
        );
        expect(Array.from(output.querySelectorAll('[data-slot="chart-legend"] li'), (row) => row.textContent)).toEqual([
            'Direct50 requests',
            'Partner150 requests'
        ]);

        await act(async () => user.click(clear));
        expect(output.querySelector('[data-slot="chart-center"]')).toBeNull();
        expect(output.querySelector('[data-slot="chart-legend"]')).toBeNull();
        expect(output.querySelector('[role="status"]')?.textContent).toBe('No data');
    });
});

it('refreshes literal row keys without accepting row styling or treating zero as missing data', async () => {
    function Preview() {
        const [value, setValue] = useState(12);

        return (
            <div ref={(element) => measureCharts(element)}>
                <button type="button" onClick={() => setValue(0)}>
                    Zero
                </button>
                <button type="button" onClick={() => setValue(Number.NaN)}>
                    Invalid
                </button>
                <button type="button" onClick={() => setValue(12)}>
                    Recover
                </button>
                <Box height={280}>
                    <BarChart
                        aria-label="Shipment volumes"
                        axes
                        legend
                        tooltip
                        data={[{ 'month.name': 'January', 'shipments.total': value, fill: '#ff0000' }]}
                        xKey="month.name"
                        series={[{ key: 'shipments.total', label: 'Shipments' }]}
                    />
                </Box>
            </div>
        );
    }

    await withMounted(<Preview />, async (output) => {
        const user = userEvent.setup();
        const [zero, invalid, recover] = output.querySelectorAll('button');

        if (!zero || !invalid || !recover) throw new Error('Expected chart refresh controls');
        await vi.waitFor(() => expect(output.querySelector('svg')).not.toBeNull());
        expect(output.textContent).toContain('January');
        expect(output.querySelector('.recharts-legend-wrapper')?.textContent).toContain('Shipments');
        expect(output.querySelector('[fill="#ff0000"]')).toBeNull();

        const chart = output.querySelector<SVGSVGElement>('svg[role="application"]');

        if (!chart) throw new Error('Expected keyboard-accessible chart');
        await act(async () => chart.focus());
        await act(async () => user.keyboard('{ArrowRight}'));
        await vi.waitFor(() => {
            expect(output.querySelector('.recharts-tooltip-wrapper')?.textContent).toContain('Shipments');
            expect(output.querySelector('.recharts-tooltip-wrapper')?.textContent).toContain('12');
        });

        await act(async () => user.click(zero));
        expect(output.querySelector('[role="status"]')).toBeNull();
        expect(output.querySelector('[role="alert"]')).toBeNull();
        expect(output.querySelector('svg')).not.toBeNull();

        await act(async () => user.click(invalid));
        expect(output.querySelector('[role="alert"]')?.textContent).toContain('finite numbers');
        expect(output.querySelector('svg')).toBeNull();

        await act(async () => user.click(recover));
        await vi.waitFor(() => expect(output.querySelector('svg')).not.toBeNull());
        expect(output.querySelector('[role="alert"]')).toBeNull();
    });
});

it('distinguishes an empty pie from a valid zero-progress radial chart and rejects an undersized scale', async () => {
    function Preview() {
        const [max, setMax] = useState(100);

        return (
            <div ref={(element) => measureCharts(element)}>
                <button type="button" onClick={() => setMax((value) => (value === 100 ? 20 : 100))}>
                    Change target
                </button>
                <Box height={200}>
                    <PieChart
                        aria-label="Empty distribution"
                        data={[{ name: 'Unstarted', value: 0 }]}
                        nameKey="name"
                        valueKey="value"
                    />
                </Box>
                <Box height={200}>
                    <RadialBarChart
                        aria-label="Progress"
                        data={[
                            { name: 'Unstarted', value: 0 },
                            { name: 'Started', value: 40 }
                        ]}
                        nameKey="name"
                        valueKey="value"
                        max={max}
                        legend
                    />
                </Box>
            </div>
        );
    }

    await withMounted(<Preview />, async (output) => {
        const user = userEvent.setup();
        const empty = output.querySelector('[aria-label="Empty distribution"]');
        const progress = output.querySelector('[aria-label="Progress"]');
        const target = output.querySelector('button');

        if (!empty || !progress || !target) throw new Error('Expected distribution and progress charts');
        expect(empty.querySelector('[role="status"]')?.textContent).toBe('No data');
        expect(empty.querySelector('svg')).toBeNull();
        await vi.waitFor(() => expect(progress.querySelector('svg')).not.toBeNull());
        expect(progress.querySelector('.recharts-legend-wrapper')?.textContent).toContain('Unstarted');

        await act(async () => user.click(target));
        expect(progress.querySelector('[role="alert"]')?.textContent).toContain('maximum');
        expect(progress.querySelector('svg')).toBeNull();

        await act(async () => user.click(target));
        await vi.waitFor(() => expect(progress.querySelector('svg')).not.toBeNull());
        expect(progress.querySelector('[role="alert"]')).toBeNull();
    });
});

it.each([AreaChart, LineChart])('keeps a gap until a missing series point is filled', async (Chart) => {
    function Preview() {
        const [missing, setMissing] = useState(true);

        return (
            <div ref={(element) => measureCharts(element)}>
                <button type="button" onClick={() => setMissing(false)}>
                    Fill point
                </button>
                <Box height={280}>
                    <Chart
                        data={[
                            { month: 'Jan', value: 10 },
                            { month: 'Feb', value: 15 },
                            { month: 'Mar', value: missing ? null : 12 },
                            { month: 'Apr', value: 0 },
                            { month: 'May', value: 20 }
                        ]}
                        xKey="month"
                        series={[{ key: 'value', label: 'Count' }]}
                    />
                </Box>
            </div>
        );
    }

    await withMounted(<Preview />, async (output) => {
        const fill = output.querySelector('button');

        if (!fill) throw new Error('Expected missing-point control');
        const selector = '.recharts-area-curve, .recharts-line-curve';
        await vi.waitFor(() => expect(output.querySelector(selector)?.getAttribute('d')?.match(/M/g)).toHaveLength(2));
        const user = userEvent.setup();
        await act(async () => user.click(fill));
        await vi.waitFor(() => expect(output.querySelector(selector)?.getAttribute('d')?.match(/M/g)).toHaveLength(1));
    });
});

it.each([
    [
        { source: 0, target: 1, value: 5 },
        { source: 1, target: 0, value: 2 }
    ],
    [{ source: 0, target: 2, value: 5 }]
])('does not lay out an invalid flow and recovers when its links are repaired', async (...broken) => {
    function Preview() {
        const [links, setLinks] = useState(broken);

        return (
            <div ref={(element) => measureCharts(element)}>
                <button type="button" onClick={() => setLinks([{ source: 0, target: 1, value: 5 }])}>
                    Repair
                </button>
                <Box height={200}>
                    <Sankey nodes={[{ name: 'Source' }, { name: 'Destination' }]} links={links} />
                </Box>
            </div>
        );
    }

    await withMounted(<Preview />, async (output) => {
        const repair = output.querySelector('button');

        if (!repair) throw new Error('Expected flow repair control');
        expect(output.querySelector('[role="alert"]')).not.toBeNull();
        expect(output.querySelector('svg')).toBeNull();
        const user = userEvent.setup();
        await act(async () => user.click(repair));
        await vi.waitFor(() => expect(output.querySelector('svg')).not.toBeNull());
        expect(output.querySelector('[role="alert"]')).toBeNull();
    });
});
