import { act } from 'react';
// @vitest-environment happy-dom
import * as React from 'react';
import { transform } from 'sucrase';
import { expect, it, vi } from 'vitest';
import { withMounted } from '../../render';
import * as components from '@/views/components';
import userEvent from '@testing-library/user-event';
import { traceFlow } from '@/components/custom/flow';
import { UsageChart } from '@/components/custom/analytics';
import type { RevenueQuarter } from '@/components/custom/flow';
import { RevenueFlow } from '@/components/custom/revenue-flow';
import { FileRequestContext } from '@/components/custom/preview';
import source from '../../../../sdk/longlink/.static/new/src/views/list.jsx?raw';

// Exercise the shipped View against the real shared components and scoped download boundary.
const code = transform(source, {
    transforms: ['jsx', 'imports'],
    jsxRuntime: 'classic',
    jsxPragma: '__jsx',
    production: true
}).code;

const bindings = {
    __jsx: React.createElement,
    useState: React.useState,
    useEffect: React.useEffect,
    useMemo: React.useMemo,
    useRef: React.useRef,
    ...components
};

const module = { exports: {} };

// oxlint-disable-next-line typescript/no-implied-eval -- Evaluate the bundled View with its sandbox's explicit bindings.
const evaluate = new Function('module', 'exports', ...Object.keys(bindings), `${code}\nreturn module.exports.default;`);

// SAFETY: The source is the repository-owned starter View, not an external module.
const List = evaluate(module, module.exports, ...Object.values(bindings)) as React.ComponentType;

it('normalizes file searches and restores results after an empty search', async () => {
    const user = userEvent.setup();

    await withMounted(<List />, async (output) => {
        const search = output.querySelector<HTMLInputElement>('input[aria-label="Search files"]');

        if (!search) throw new Error('Expected file search');

        await act(async () => user.type(search, '  PNG  '));
        expect(output.querySelectorAll('tbody tr')).toHaveLength(1);
        expect(output.querySelector('tbody a')?.textContent).toContain('example.png');
        expect(output.querySelector('tbody')?.textContent).not.toContain('garden.jpg');

        await act(async () => user.clear(search));
        await act(async () => user.type(search, 'missing-file'));
        expect(output.querySelector('tbody')?.textContent).toContain('No files found');
        expect(output.querySelector('tbody a')).toBeNull();

        const clear = [...output.querySelectorAll('button')].find((button) => button.textContent === 'Clear search');

        if (!clear) throw new Error('Expected empty-state recovery');

        await act(async () => user.click(clear));
        expect(search.value).toBe('');
        expect(output.querySelector('tbody')?.textContent).toContain('example.png');
        expect(output.querySelector('tbody')?.textContent).toContain('garden.jpg');
        expect(output.querySelector('tbody')?.textContent).not.toContain('No files found');
    });
});

it('returns to the first page when a search narrows results from a later file page', async () => {
    const user = userEvent.setup();

    await withMounted(<List />, async (output) => {
        const size = output.querySelector<HTMLButtonElement>('[aria-label="Rows per page"]');

        if (!size) throw new Error('Expected page size control');

        await act(async () => user.click(size));

        const five = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
            (option) => option.textContent === '5'
        );

        if (!five) throw new Error('Expected five-row page option');

        await act(async () => user.click(five));
        const secondPage = output.querySelector<HTMLButtonElement>('button[aria-label="Go to page 2"]');

        if (!secondPage) throw new Error('Expected second file page');

        await act(async () => user.click(secondPage));
        expect(
            output.querySelector('[aria-label="Go to page 2"]')?.getAttribute('aria-current'),
            output.querySelector('[data-slot="data-grid-pagination"]')?.textContent
        ).toBe('page');
        expect(output.querySelector('tbody')?.textContent).not.toContain('example.gif');

        const search = output.querySelector<HTMLInputElement>('input[aria-label="Search files"]');

        if (!search) throw new Error('Expected file search');

        await act(async () => user.type(search, '.gif'));
        expect(output.querySelectorAll('tbody tr')).toHaveLength(1);
        expect(output.querySelector('tbody a')?.textContent).toContain('example.gif');
        expect(output.querySelector('[data-slot="data-grid-pagination"]')?.textContent).toContain('1 - 1 of 1');

        await act(async () => user.clear(search));
        expect(output.querySelector('[aria-label="Go to page 1"]')?.getAttribute('aria-current')).toBe('page');
        expect(output.querySelector('tbody')?.textContent).toContain('example.gif');
        expect(output.querySelectorAll('tbody tr')).toHaveLength(5);
    });
});

it('wires filtered file rows to scoped previews with their own asset path and title without eager loading', async () => {
    const user = userEvent.setup();
    const preview = vi.fn(async (_path: string, _title?: string) => null);
    const download = vi.fn(async (_path: string, _filename: string) => {});

    await withMounted(
        <FileRequestContext value={{ preview, download }}>
            <List />
        </FileRequestContext>,
        async (output) => {
            expect(preview).not.toHaveBeenCalled();
            const search = output.querySelector<HTMLInputElement>('input[aria-label="Search files"]');

            if (!search) throw new Error('Expected file search');

            for (const filename of ['garden.jpg', 'example.pdf', 'example.tsx']) {
                await act(async () => user.clear(search));
                await act(async () => user.type(search, filename));
                const attachment = output.querySelector<HTMLAnchorElement>('tbody a');

                if (!attachment) throw new Error(`Expected attachment for ${filename}`);

                expect(attachment.textContent).toContain(filename);
                expect(attachment.getAttribute('aria-haspopup')).toBe('dialog');
                const calls = preview.mock.calls.length;
                await act(async () => user.click(attachment));
                expect(preview).toHaveBeenCalledTimes(calls + 1);
                expect(preview).toHaveBeenLastCalledWith(`/assets/${filename}`, filename);
            }

            expect(download).not.toHaveBeenCalled();
        }
    );
});

it('traces directed ancestors and descendants without including a sibling branch', () => {
    const traced = traceFlow(
        {
            nodes: [
                { name: 'Source', category: 'revenue' },
                { name: 'Revenue', category: 'revenue' },
                { name: 'Profit', category: 'profit' },
                { name: 'Costs', category: 'expense' },
                { name: 'Net', category: 'profit' }
            ],
            links: [
                { source: 0, target: 1, value: 100 },
                { source: 1, target: 2, value: 60 },
                { source: 1, target: 3, value: 40 },
                { source: 2, target: 4, value: 60 }
            ]
        },
        [2]
    );

    expect(traced).toEqual(new Set([0, 1, 3]));
    expect(traced.has(2)).toBe(false);
});

it('clears a keyboard-selected Sankey trace when the quarter changes', async () => {
    const user = userEvent.setup();

    const quarters: RevenueQuarter[] = ['Current', 'Previous'].map((label, index) => ({
        label,
        revenue: index ? 80000 : 100000,
        grossProfit: index ? 40000 : 60000,
        operatingIncome: index ? 32000 : 60000,
        netIncome: index ? 24000 : 60000,
        data: {
            nodes: [
                { name: 'Revenue', category: 'revenue' },
                { name: 'Profit', category: 'profit' },
                { name: 'Costs', category: 'expense' }
            ],
            links: [
                { source: 0, target: 1, value: index ? 40000 : 60000 },
                { source: 0, target: 2, value: 40000 }
            ]
        }
    }));

    // Supply the layout boundary that happy-dom cannot calculate.
    const bounds = vi
        .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
        .mockReturnValue(new DOMRect(0, 0, 1040, 520));

    try {
        await withMounted(<RevenueFlow quarters={quarters} />, async (output) => {
            const profit = output.querySelector<SVGElement>('[role="button"][aria-label^="Profit,"]');

            if (!profit) throw new Error('Expected keyboard-accessible Sankey node');

            await act(async () => profit.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
            expect(output.querySelector('[role="status"]')?.textContent).toBe('Tracing Profit');
            const quarter = output.querySelector<HTMLButtonElement>('[aria-label="Revenue quarter"]');

            if (!quarter) throw new Error('Expected quarter selection');

            await act(async () => user.click(quarter));

            const previous = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
                (option) => option.textContent === 'Previous'
            );

            if (!previous) throw new Error('Expected previous quarter');

            await act(async () => user.click(previous));
            expect(output.querySelector('[role="status"]')?.textContent).toBe('All revenue connections');
            expect(output.querySelector('[role="button"][aria-pressed="true"]')).toBeNull();
            expect(output.querySelector('[aria-label="Revenue quarter"]')?.textContent).toContain('Previous');

            const margin = [...output.querySelectorAll('p')].find(
                (paragraph) => paragraph.textContent === 'Gross Margin'
            );

            expect(margin?.parentElement?.textContent).toContain('50.0%');
            const expenses = [...output.querySelectorAll('button')].find((button) => button.textContent === 'Costs');

            if (!expenses) throw new Error('Expected expense category');

            await act(async () => user.click(expenses));
            expect(output.querySelector('[role="status"]')?.textContent).toBe('Costs connections');
            expect(output.querySelectorAll('path[stroke-opacity="0.035"]')).toHaveLength(1);
            const clear = [...output.querySelectorAll('button')].find((button) => button.textContent === 'All');

            if (!clear) throw new Error('Expected trace reset');

            await act(async () => user.click(clear));
            expect(output.querySelectorAll('path[stroke-opacity="0.035"]')).toHaveLength(0);
            expect(output.querySelector('[role="status"]')?.textContent).toBe('All revenue connections');
        });
    } finally {
        bounds.mockRestore();
    }
});

it('changes the plotted model usage period and displays its human-readable selection', async () => {
    const user = userEvent.setup();

    const data = Array.from({ length: 30 }, (_, index) => ({
        date: `2026-10-${String(index + 1).padStart(2, '0')}`,
        claude: (index + 1) * 100000,
        gpt: (index + 1) * 80000,
        gemini: (index + 1) * 60000
    }));

    const bounds = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
        this: HTMLElement
    ) {
        return this.classList.contains('recharts-responsive-container') ? new DOMRect(0, 0, 1040, 320) : new DOMRect();
    });

    try {
        await withMounted(
            <UsageChart
                data={data}
                config={{
                    claude: { label: 'Claude', color: 'var(--chart-1)' },
                    gpt: { label: 'GPT', color: 'var(--chart-2)' },
                    gemini: { label: 'Gemini', color: 'var(--chart-3)' }
                }}
                periods={[
                    { value: 7, label: 'Last 7 days' },
                    { value: 30, label: 'Last 30 days' }
                ]}
                title="Model usage"
                label="Model usage over time"
            />,
            async (output) => {
                expect(output.querySelector('[data-slot="chart"]')?.textContent).toContain('10-02');

                const option = [...output.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
                    (item) => item.textContent === 'Last 7 days'
                );

                if (!option) throw new Error('Expected seven-day tab');

                await act(async () => user.click(option));
                expect(option.getAttribute('aria-selected')).toBe('true');
                expect(output.querySelector('[data-slot="chart"]')?.textContent).toContain('10-24');
                expect(output.querySelector('[data-slot="chart"]')?.textContent).not.toContain('10-02');
                option.focus();
                await act(async () => user.keyboard('{ArrowRight}'));
                expect(output.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe('Last 30 days');
                expect(output.querySelector('[data-slot="chart"]')?.textContent).toContain('10-02');
            }
        );
    } finally {
        bounds.mockRestore();
    }
});
