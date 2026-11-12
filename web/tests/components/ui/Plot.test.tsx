// @vitest-environment happy-dom
import { act } from 'react';
import { Plot } from '@/components/ui/Plot';
import { renderStatic, withMounted } from '../../render';
import { it, expect, beforeEach, afterEach, vi } from 'vitest';

const observations = new Map<Element, { callback: ResizeObserverCallback; observer: ResizeObserver }>();

/** Delivers layout measurements that happy-dom cannot calculate, leaving chart layout and rendering real. */
function resize(width: number) {
    for (const [target, { callback, observer }] of observations) {
        callback(
            [
                {
                    target,
                    contentRect: new DOMRect(0, 0, width, 300),
                    borderBoxSize: [],
                    contentBoxSize: [],
                    devicePixelContentBoxSize: [],
                },
            ],
            observer
        );
    }
}

beforeEach(() => {
    // Replace only the unavailable measurement boundary, not chart scales, marks, or interaction.
    vi.stubGlobal(
        'ResizeObserver',
        class implements ResizeObserver {
            private readonly callback: ResizeObserverCallback;
            private readonly targets = new Set<Element>();

            constructor(callback: ResizeObserverCallback) {
                this.callback = callback;
            }

            observe(target: Element) {
                this.targets.add(target);
                observations.set(target, { callback: this.callback, observer: this });
                resize(640);
            }

            unobserve(target: Element) {
                this.targets.delete(target);
                observations.delete(target);
            }

            disconnect() {
                for (const target of this.targets) observations.delete(target);
                this.targets.clear();
            }
        }
    );
});

afterEach(() => {
    observations.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

it('renders numeric bar categories as grouped bars without changing the source data', async () => {
    // Numeric years must not select a continuous scale that makes bar marks disappear.
    const data = Object.freeze([
        Object.freeze({ year: 2025, completed: 12, planned: 18, internal: 'not plotted' }),
        Object.freeze({ year: 2026, completed: -6, planned: 0, internal: 'not plotted' }),
    ]);

    await withMounted(
        <Plot
            label="Annual tasks"
            type="bar"
            data={data}
            xKey="year"
            series={[
                { key: 'completed', label: 'Completed' },
                { key: 'planned', label: 'Planned' },
            ]}
        />,
        async (output) => {
            const svg = output.querySelector('svg[role="img"][aria-label="Annual tasks"]');
            const groups = svg?.querySelectorAll('g[clip-path] > g');
            const bars = svg?.querySelectorAll('g[clip-path] path');

            expect(groups).toHaveLength(2);
            expect(bars).toHaveLength(4);
            expect(groups?.[0].querySelector('path')?.getAttribute('d')).not.toBe(
                groups?.[1].querySelector('path')?.getAttribute('d')
            );
            expect(svg?.outerHTML).not.toMatch(/NaN|Infinity/);
            expect(output.querySelector('[role="list"]')?.textContent).toContain('Completed');
            expect(output.querySelector('[role="list"]')?.textContent).toContain('Planned');
            expect(output.querySelector('table')?.textContent).toContain('-6');
            expect(output.querySelector('table')?.textContent).not.toContain('internal');
            expect(output.querySelector('table')?.textContent).not.toContain('not plotted');
            expect(data[0].year).toBe(2025);
            expect(data[1].planned).toBe(0);
        }
    );
});

it('preserves line gaps and zero observations while resizing the plotted geometry', async () => {
    // A missing observation must split the line rather than invent a zero or bridge the gap.
    await withMounted(
        <Plot
            label="Daily activity"
            description="Tasks per day"
            data={[
                { day: 'Mon', tasks: 0 },
                { day: 'Tue', tasks: 8 },
                { day: 'Wed', tasks: null },
                { day: 'Thu', tasks: 12 },
                { day: 'Fri', tasks: 4 },
            ]}
            xKey="day"
            series={[{ key: 'tasks', label: 'Tasks' }]}
        />,
        async (output) => {
            const svg = output.querySelector('svg[aria-label="Daily activity"]');
            const line = svg?.querySelector('g[clip-path] path');
            const original = line?.getAttribute('d');

            expect(original?.match(/M/g)).toHaveLength(2);
            expect(svg?.querySelectorAll('g[clip-path] circle')).toHaveLength(4);
            expect(output.querySelector('table tbody tr td')?.textContent).toBe('0');
            expect(svg?.getAttribute('aria-describedby')).toBeTruthy();
            expect(svg?.querySelector('desc')?.textContent).toBe('Tasks per day');
            await act(async () => resize(320));

            expect(line?.getAttribute('d')).not.toBe(original);
            expect(line?.getAttribute('d')?.match(/M/g)).toHaveLength(2);
            expect(svg?.querySelectorAll('g[clip-path] circle')).toHaveLength(4);
            expect(svg?.outerHTML).not.toMatch(/NaN|Infinity/);
        }
    );
});

it('renders areas as bounded fills and scatter observations at their numeric x positions', async () => {
    // Area and scatter must render different marks; coincident scatter x values must not become categories.
    await withMounted(
        <>
            <Plot
                label="Workload area"
                type="area"
                data={[
                    { day: 1, work: 0 },
                    { day: 2, work: 8 },
                ]}
                xKey="day"
                series={[{ key: 'work', label: 'Work' }]}
            />
            <Plot
                label="Latency samples"
                type="scatter"
                data={[
                    { size: 10, latency: 8 },
                    { size: 10, latency: 15 },
                    { size: 20, latency: null },
                ]}
                xKey="size"
                series={[{ key: 'latency', label: 'Latency' }]}
            />
        </>,
        async (output) => {
            const area = output.querySelector('svg[aria-label="Workload area"] g[clip-path] path');
            const scatter = output.querySelectorAll('svg[aria-label="Latency samples"] g[clip-path] circle');

            expect(area?.getAttribute('d')).toMatch(/Z$/);
            expect(area?.getAttribute('fill')).not.toBe('none');
            expect(scatter).toHaveLength(2);
            expect(scatter[0].getAttribute('cx')).toBe(scatter[1].getAttribute('cx'));
            expect(scatter[0].getAttribute('cy')).not.toBe(scatter[1].getAttribute('cy'));
            expect(output.innerHTML).not.toMatch(/NaN|Infinity/);
        }
    );
});

it('shows labeled tooltip values without making the accessible data depend on hover', async () => {
    // Hover details must use the selected row and retain a non-hover route to its zero and nonzero values.
    await withMounted(
        <Plot
            label="Monthly comparison"
            data={[
                { month: 'Jan', completed: 0, planned: 10 },
                { month: 'Feb', completed: 8, planned: 12 },
            ]}
            xKey="month"
            series={[
                { key: 'completed', label: 'Completed' },
                { key: 'planned', label: 'Planned' },
            ]}
        />,
        async (output) => {
            // happy-dom's legacy SVGPoint lacks matrixTransform; its DOMPoint supplies the same coordinate contract.
            const svg = output.querySelector<SVGSVGElement>('svg[aria-label="Monthly comparison"]');

            if (!svg) throw new Error('Expected the plot SVG');
            vi.spyOn(svg, 'createSVGPoint').mockImplementation(() => new DOMPoint());

            const capture = output.querySelector<SVGRectElement>('svg g > rect[fill="transparent"]');
            expect(capture).not.toBeNull();
            await act(async () =>
                capture?.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 0, clientY: 100 }))
            );

            const tooltip = output.querySelector('[role="tooltip"]');
            expect(tooltip?.textContent).toContain('Jan');
            expect(tooltip?.textContent).toContain('Completed');
            expect(tooltip?.textContent).toContain('Planned');
            expect(tooltip?.textContent).toContain('0');
            expect(tooltip?.textContent).toContain('10');
            await act(async () => capture?.dispatchEvent(new PointerEvent('pointerout', { bubbles: true })));
            expect(tooltip?.textContent).toBe('');
            expect(
                [...output.querySelectorAll('table tbody tr:first-child td')].map((cell) => cell.textContent)
            ).toEqual(['0', '10']);
        }
    );
});

it('keeps the plot context but does not draw invented observations for empty or entirely missing data', () => {
    // A dataset without observations must not look like an all-zero report.
    for (const data of [
        [],
        [
            { month: 'Jan', tasks: null },
            { month: 'Feb', tasks: undefined },
        ],
    ]) {
        const output = renderStatic(
            <Plot
                label="Monthly tasks"
                description="Completed work"
                data={data}
                xKey="month"
                series={[{ key: 'tasks', label: 'Tasks' }]}
            />
        );

        expect(output.textContent).toContain('Monthly tasks');
        expect(output.textContent).toContain('Completed work');
        expect(output.textContent).toContain('No data to plot');
        expect(output.querySelector('svg[role="img"]')).toBeNull();
    }
});

it.each(['12', false, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid numeric observations instead of quietly plotting %s',
    (tasks) => {
        // Data returned with the wrong numeric representation must be reported, not coerced or dropped.
        expect(() =>
            renderStatic(
                <Plot
                    label="Tasks"
                    data={[{ month: 'Jan', tasks }]}
                    xKey="month"
                    series={[{ key: 'tasks', label: 'Tasks' }]}
                />
            )
        ).toThrow();
    }
);

it('reports incompatible x values and missing or ambiguous field mappings', () => {
    // Invalid field mappings must not turn into a plausible empty or overlapping plot.
    const data = [{ month: 'Jan', tasks: 8 }];
    expect(() =>
        renderStatic(
            <Plot
                label="Tasks"
                type="bar"
                data={[...data, { month: 'Jan', tasks: 12 }]}
                xKey="month"
                series={[{ key: 'tasks', label: 'Tasks' }]}
            />
        )
    ).toThrow('Bar plot categories must be unique');
    expect(() =>
        renderStatic(
            <Plot label="Tasks" type="scatter" data={data} xKey="month" series={[{ key: 'tasks', label: 'Tasks' }]} />
        )
    ).toThrow();
    expect(() =>
        renderStatic(
            <Plot
                label="Tasks"
                data={[
                    { month: 'Jan', tasks: 8 },
                    { month: 2, tasks: 12 },
                ]}
                xKey="month"
                series={[{ key: 'tasks', label: 'Tasks' }]}
            />
        )
    ).toThrow();
    expect(() =>
        renderStatic(<Plot label="Tasks" data={data} xKey="month" series={[{ key: 'month', label: 'Invalid' }]} />)
    ).toThrow('Plot series must have unique keys distinct from xKey.');
    expect(() =>
        renderStatic(
            <Plot
                label="Tasks"
                data={data}
                xKey="month"
                series={[
                    { key: 'tasks', label: 'Tasks' },
                    { key: 'tasks', label: 'Duplicate' },
                ]}
            />
        )
    ).toThrow('Plot series must have unique keys distinct from xKey.');
    expect(() =>
        renderStatic(
            <Plot<Record<string, string | number | null>>
                label="Tasks"
                data={data}
                xKey="month"
                series={[{ key: 'missing', label: 'Missing' }]}
            />
        )
    ).toThrow('Plot series field "missing" was not found in the data.');
    expect(() =>
        renderStatic(
            <Plot
                label="Tasks"
                data={data}
                xKey="month"
                series={[{ key: 'tasks', label: 'Tasks' }]}
                height={Number.POSITIVE_INFINITY}
            />
        )
    ).toThrow();
});

it('exposes Plot to authored JSX in the real isolated runtime and updates its data and mark type', async () => {
    // A source-only SDK View must render Plot without importing packages or acquiring new host capabilities.
    vi.resetModules();
    const previousSession = window.__VIEW_SESSION__;
    const previousAccent = document.documentElement.getAttribute('data-accent');
    window.__VIEW_SESSION__ = 'plot-view-session';
    const mount = document.createElement('div');
    mount.id = 'view';
    document.body.append(mount);
    const channel = new MessageChannel();

    try {
        await import('@/views/runtime');
        window.dispatchEvent(
            new MessageEvent('message', {
                source: window,
                ports: [channel.port1],
                data: {
                    session: 'plot-view-session',
                    source: `export default function Statistics() {
                    const [updated, setUpdated] = useState(false);
                    return <Stack>
                        <Plot label="SDK statistics" type={updated ? 'bar' : 'line'} data={updated ? [{ month: 'Jan', tasks: 12 }, { month: 'Feb', tasks: 21 }] : [{ month: 'Jan', tasks: 5 }, { month: 'Feb', tasks: 9 }]} xKey="month" series={[{ key: 'tasks', label: 'Completed tasks' }]} />
                        <Button label="Update statistics" onClick={() => setUpdated(true)} />
                    </Stack>;
                }`,
                    params: {},
                    navigationBaseUrl: 'https://platform.example/',
                    appearance: { theme: 'dark', accent: 'neutral' },
                },
            })
        );

        await vi.waitFor(() => expect(mount.querySelector('svg[aria-label="SDK statistics"]')).not.toBeNull());
        expect(mount.querySelectorAll('g[clip-path] circle')).toHaveLength(2);

        const update = [...mount.querySelectorAll<HTMLButtonElement>('button')].find(
            (button) => button.textContent === 'Update statistics'
        );

        expect(update).toBeDefined();
        await act(async () => update?.click());

        await vi.waitFor(() => expect(mount.querySelectorAll('g[clip-path] path')).toHaveLength(2));
        expect(mount.querySelectorAll('g[clip-path] circle')).toHaveLength(0);
        expect([...mount.querySelectorAll('table tbody td')].map((cell) => cell.textContent)).toEqual(['12', '21']);
        expect(mount.textContent).not.toContain('View could not be loaded');
    } finally {
        window.dispatchEvent(new Event('pagehide'));
        channel.port1.close();
        channel.port2.close();
        mount.remove();
        window.__VIEW_SESSION__ = previousSession;

        if (previousAccent === null) document.documentElement.removeAttribute('data-accent');
        else document.documentElement.setAttribute('data-accent', previousAccent);
        vi.resetModules();
    }
});
