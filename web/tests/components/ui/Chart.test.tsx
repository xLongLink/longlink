// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { act, useState } from 'react';
import { withMounted } from '../../render';
import { SankeyChart } from '@/components/ui/Chart';
import userEvent from '@testing-library/user-event';
import { sankeyDataSchema } from '@/components/ui/charts';

it('rejects cyclic or invalid flow links but accepts converging acyclic flows', () => {
    const nodes = [{ name: 'Sales' }, { name: 'Services' }, { name: 'Revenue' }, { name: 'Profit' }];

    const links = [
        { source: 0, target: 2, value: 60 },
        { source: 1, target: 2, value: 40 },
        { source: 2, target: 3, value: 100 },
    ];

    expect(sankeyDataSchema.safeParse({ nodes, links }).success).toBe(true);
    expect(
        sankeyDataSchema.safeParse({
            nodes,
            links: [...links, { source: 3, target: 0, value: 10 }],
        }).success
    ).toBe(false);
    expect(
        sankeyDataSchema.safeParse({
            nodes,
            links: [{ source: 0, target: 4, value: 10 }],
        }).success
    ).toBe(false);
    expect(
        sankeyDataSchema.safeParse({
            nodes,
            links: [{ source: 0, target: 0, value: 10 }],
        }).success
    ).toBe(false);
});

it('recovers from invalid flow data when the next result contains valid links', async () => {
    const user = userEvent.setup();

    function Results() {
        const [valid, setValid] = useState(false);

        return (
            <>
                <button type="button" onClick={() => setValid(true)}>
                    Reload flow
                </button>
                <SankeyChart
                    label="Revenue allocation"
                    nodes={[{ name: 'Revenue' }, { name: 'Profit' }]}
                    links={valid ? [{ source: 0, target: 1, value: 40 }] : [{ source: 0, target: 0, value: 40 }]}
                />
            </>
        );
    }

    await withMounted(<Results />, async (output) => {
        const reload = output.querySelector('button');

        if (!reload) throw new Error('Expected reload control');

        expect(output.textContent).toContain('Invalid chart data');
        expect(output.querySelector('[data-chart]')).toBeNull();
        await act(async () => user.click(reload));
        expect(output.textContent).not.toContain('Invalid chart data');
        expect(output.querySelector('[role="region"]')?.getAttribute('aria-label')).toBe('Revenue allocation');
        expect(output.querySelector('[data-chart]')).not.toBeNull();
    });
});
