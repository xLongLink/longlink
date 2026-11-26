// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { Box } from '@/components/longlink/layout/box';
import { BarChart } from '@/components/longlink/charts/bar';
import { PieChart } from '@/components/longlink/charts/pie';
import { Sankey } from '@/components/longlink/charts/sankey';
import { AreaChart } from '@/components/longlink/charts/area';
import { RadialBarChart } from '@/components/longlink/charts/radial-bar';

/** Supplies browser layout measurements while retaining the real responsive chart lifecycle. */
function measureCharts(element: HTMLDivElement | null): void {
    for (const container of element?.querySelectorAll<HTMLElement>('.recharts-responsive-container') ?? []) {
        container.getBoundingClientRect = () => new DOMRect(0, 0, 640, 280);
    }
}
it('keeps reordered area values, legend labels, and unique gradients associated with their series', async () => {
    // Arrange
    function Preview() {
        const [reversed, setReversed] = useState(false);
        const series = [
            { key: 'orders.total' as const, label: 'Orders' },
            { key: 'returns.total' as const, label: 'Returns' }
        ];
        const data = [
            { 'month.name': 'January', 'orders.total': 12, 'returns.total': 3 },
            { 'month.name': 'February', 'orders.total': 18, 'returns.total': 5 }
        ];

        return (
            <div ref={(element) => measureCharts(element)}>
                <button type="button" onClick={() => setReversed((value) => !value)}>
                    Reorder
                </button>
                <Box height={280}>
                    <AreaChart
                        aria-label="Orders and returns"
                        data={data}
                        xKey="month.name"
                        series={reversed ? series.toReversed() : series}
                        fill="gradient"
                        tooltip
                        legend
                    />
                </Box>
                <Box height={280}>
                    <AreaChart data={data} xKey="month.name" series={series} fill="gradient" />
                </Box>
            </div>
        );
    }

    // Act
    await withMounted(<Preview />, async (output) => {
        const user = userEvent.setup();
        const container = output.querySelector('[aria-label="Orders and returns"]');
        const reorder = output.querySelector('button');

        if (!container || !reorder) throw new Error('Expected area chart and reorder control');
        await vi.waitFor(() => expect(output.querySelectorAll('.recharts-area-area')).toHaveLength(4));
        const chart = container.querySelector<SVGSVGElement>('svg[role="application"]');

        if (!chart) throw new Error('Expected keyboard-accessible area chart');
        await act(async () => chart.focus());
        await act(async () => user.keyboard('{ArrowRight}'));

        for (const reversed of [false, true]) {
            if (reversed) {
                await act(async () => user.click(reorder));
                await act(async () => chart.focus());
                await act(async () => user.keyboard('{ArrowLeft}{ArrowRight}'));
            }
            // Assert
            await vi.waitFor(() => {
                const tooltip = container.querySelector('.recharts-tooltip-wrapper')?.textContent ?? '';
                expect(tooltip).toContain('Orders18');
                expect(tooltip).toContain('Returns5');
            });
            const legend = container.querySelector('.recharts-legend-wrapper')?.textContent ?? '';
            expect(legend).toContain('Orders');
            expect(legend).toContain('Returns');
            const gradients = [...output.querySelectorAll('linearGradient')];
            expect(new Set(gradients.map((gradient) => gradient.id)).size).toBe(gradients.length);

            for (const area of output.querySelectorAll('.recharts-area')) {
                const fill = area.querySelector('.recharts-area-area')?.getAttribute('fill');
                const stroke = area.querySelector('.recharts-area-curve')?.getAttribute('stroke');
                const gradient = gradients.find((item) => fill === `url(#${item.id})`);
                expect(gradient).toBeDefined();
                expect(gradient?.querySelector('stop')?.getAttribute('stop-color')).toBe(stroke);
            }
        }
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
        await act(async () => chart.focus());
        await act(async () => user.keyboard('{Enter}'));
        await vi.waitFor(() => {
            const tooltip = output.querySelector('.recharts-tooltip-wrapper');
            expect(tooltip?.textContent).toContain('Shipments0');
            expect(tooltip?.textContent).not.toContain('12');
        });

        await act(async () => user.click(invalid));
        expect(output.querySelector('[role="alert"]')?.textContent).toContain('finite numbers');
        expect(output.querySelector('svg')).toBeNull();

        await act(async () => user.click(recover));
        await vi.waitFor(() => expect(output.querySelector('svg')).not.toBeNull());
        expect(output.querySelector('[role="alert"]')).toBeNull();
        const recoveredChart = output.querySelector<SVGSVGElement>('svg[role="application"]');

        if (!recoveredChart) throw new Error('Expected recovered keyboard-accessible chart');
        await act(async () => recoveredChart.focus());
        await act(async () => user.keyboard('{ArrowRight}'));
        await vi.waitFor(() =>
            expect(output.querySelector('.recharts-tooltip-wrapper')?.textContent).toContain('Shipments12')
        );
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
