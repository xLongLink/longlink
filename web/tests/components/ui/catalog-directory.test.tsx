// @vitest-environment happy-dom
import { act } from 'react';
import { expect, it, vi } from 'vitest';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { traceFlow } from '@/components/custom/flow';
import { UsageChart } from '@/components/custom/analytics';
import type { RevenueQuarter } from '@/components/custom/flow';
import { RevenueFlow } from '@/components/custom/revenue-flow';
import type { DirectoryModel } from '@/components/custom/models';
import { FileRequestContext } from '@/components/custom/preview';
import { CatalogDirectory } from '@/components/custom/catalog-directory';

const models: DirectoryModel[] = [
    {
        id: 'aster',
        name: 'Aster Vision',
        provider: 'Northstar',
        description: 'Visual analysis.',
        rating: 4.8,
        reviews: 13,
        context: 128000,
        input: 10,
        output: 20,
        modalities: ['text', 'image'],
        tags: ['Vision']
    },
    {
        id: 'cedar',
        name: 'Cedar Vision',
        provider: 'Solis',
        description: 'Visual extraction.',
        rating: 4.5,
        reviews: 17,
        context: 64000,
        input: 0.2,
        output: 0.5,
        modalities: ['text', 'image'],
        tags: ['Vision']
    },
    ...Array.from({ length: 10 }, (_, index) => ({
        id: `model-${index}`,
        name: `Model ${index}`,
        provider: 'Solis',
        description: 'Text analysis.',
        rating: 4,
        reviews: 7,
        context: 32000,
        input: 1,
        output: 2,
        modalities: ['text'],
        tags: ['Chat']
    }))
];

it('recovers filtering from a later page and exports every matching row in numeric price order', async () => {
    const user = userEvent.setup();
    const download = vi.fn(async (_path: string, _filename: string) => {});

    await withMounted(
        <FileRequestContext value={{ download, preview: async () => null }}>
            <CatalogDirectory models={models} exportPath="/api/models/export" />
        </FileRequestContext>,
        async (output) => {
            const secondPage = output.querySelector<HTMLButtonElement>('button[aria-label="Go to page 2"]');
            const search = output.querySelector<HTMLInputElement>('input[aria-label="Search models"]');

            if (!secondPage || !search) throw new Error('Expected directory controls');

            await act(async () => user.click(secondPage));
            expect(output.querySelector('tbody')?.textContent).not.toContain('Aster Vision');
            await act(async () => user.type(search, 'vision'));
            expect(output.querySelectorAll('tbody tr')).toHaveLength(2);
            expect(output.querySelector('tbody')?.textContent).toContain('Aster Vision');
            expect(output.querySelector('tbody')?.textContent).toContain('Cedar Vision');

            const sort = output.querySelector<HTMLButtonElement>('[aria-label="Sort models"]');

            if (!sort) throw new Error('Expected sort control');

            await act(async () => user.click(sort));

            const priceOption = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
                (option) => option.textContent === 'Lowest input price'
            );

            if (!priceOption) throw new Error('Expected price sort option');

            await act(async () => user.click(priceOption));
            expect(output.querySelector('tbody tr')?.textContent).toContain('Cedar Vision');

            const exportButton = [...output.querySelectorAll('button')].find(
                (button) => button.textContent === 'Export'
            );

            if (!exportButton) throw new Error('Expected export control');

            await act(async () => user.click(exportButton));
            expect(download).toHaveBeenCalledExactlyOnceWith('/api/models/export?ids=cedar%2Caster', 'models.csv');
            await act(async () => user.clear(search));
            await act(async () => user.click(exportButton));
            const exported = new URL(download.mock.calls[1][0], 'https://example.test');
            expect(exported.searchParams.get('ids')?.split(',')).toHaveLength(12);
            await act(async () => user.type(search, 'no matching model'));
            expect(output.querySelector('tbody')?.textContent).toContain('No models found');

            const clear = [...output.querySelectorAll('button')].find(
                (button) => button.textContent === 'Clear filters'
            );

            if (!clear) throw new Error('Expected empty-state recovery');

            await act(async () => user.click(clear));
            expect(search.value).toBe('');
            expect(output.querySelectorAll('tbody tr')).toHaveLength(10);
            expect(output.querySelector('tbody tr')?.textContent).toContain('Cedar Vision');
        }
    );
});

it('retains a bookmark across detail navigation without treating Save as navigation', async () => {
    const user = userEvent.setup();

    await withMounted(<CatalogDirectory models={models} exportPath="/api/models/export" />, async (output) => {
        const save = output.querySelector<HTMLButtonElement>('button[aria-label="Save Aster Vision"]');

        if (!save) throw new Error('Expected bookmark control');

        await act(async () => user.click(save));
        expect(output.querySelector('h1')).toBeNull();
        expect(output.querySelector('button[aria-label="Unsave Aster Vision"]')?.getAttribute('aria-pressed')).toBe(
            'true'
        );
        const model = [...output.querySelectorAll('a')].find((link) => link.textContent === 'Aster Vision');

        if (!model) throw new Error('Expected model link');

        await act(async () => user.click(model));
        expect(output.querySelector('h1')?.textContent).toBe('Aster Vision');
        expect(output.querySelector('button[aria-label="Unsave Aster Vision"]')).not.toBeNull();
        const back = [...output.querySelectorAll('button')].find((button) => button.textContent === 'Back');

        if (!back) throw new Error('Expected Back control');

        await act(async () => user.click(back));
        expect(output.querySelector('tbody')).not.toBeNull();
        expect(output.querySelector('button[aria-label="Unsave Aster Vision"]')?.getAttribute('aria-pressed')).toBe(
            'true'
        );
    });
});

it('applies the provider is-not operator rather than treating every provider rule as inclusion', async () => {
    const user = userEvent.setup();

    async function pickOption(label: string) {
        const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
            (item) => item.textContent?.trim() === label
        );

        if (!option) throw new Error(`Expected filter option: ${label}`);

        await act(async () => user.click(option));
    }

    await withMounted(<CatalogDirectory models={models} exportPath="/api/models/export" />, async (output) => {
        const add = [...output.querySelectorAll('button')].find(
            (button) => button.textContent?.trim() === 'Add filter'
        );

        if (!add) throw new Error('Expected Add filter');

        await act(async () => user.click(add));
        await pickOption('Provider');
        await pickOption('is not');
        await pickOption('Solis');
        expect(output.querySelectorAll('tbody tr')).toHaveLength(1);
        expect(output.querySelector('tbody')?.textContent).toContain('Aster Vision');
        expect(output.querySelector('tbody')?.textContent).not.toContain('Cedar Vision');
    });
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
        await withMounted(<UsageChart data={data} />, async (output) => {
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
        });
    } finally {
        bounds.mockRestore();
    }
});
