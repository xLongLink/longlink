import { act } from 'react';
// @vitest-environment happy-dom
import * as React from 'react';
import { transform } from 'sucrase';
import { expect, it, vi } from 'vitest';
import { withMounted } from '../../render';
import * as components from '@/components/longlink';
import userEvent from '@testing-library/user-event';
import { RequestContext } from '@/lib/view-capabilities';
import source from '../../../../sdk/longlink/.static/new/src/views/list.jsx?raw';
import modelSource from '../../../../sdk/longlink/.static/new/src/views/models.jsx?raw';
import geographyFixture from '../../../../sdk/longlink/.static/new/src/assets/world.json';
import analyticsFixture from '../../../../sdk/longlink/.static/new/src/assets/analytics.json';

// Exercise the shipped View against the real shared components and scoped download boundary.
const code = transform(source, {
    transforms: ['jsx', 'imports'],
    jsxRuntime: 'classic',
    jsxPragma: '__jsx',
    production: true
}).code;

const bindings = { __jsx: React.createElement, ...components };

const module = { exports: {} };

// oxlint-disable-next-line typescript/no-implied-eval -- Evaluate the bundled View with its sandbox's explicit bindings.
const evaluate = new Function('module', 'exports', ...Object.keys(bindings), `${code}\nreturn module.exports.default;`);

// SAFETY: The source is the repository-owned starter View, not an external module.
const List = evaluate(module, module.exports, ...Object.values(bindings)) as React.ComponentType;

it('normalizes file searches, restores empty results, and preserves sorting while filtering', async () => {
    const user = userEvent.setup();

    await withMounted(<List />, async (output) => {
        const search = output.querySelector<HTMLInputElement>('input[aria-label="Search files"]');

        if (!search) throw new Error('Expected file search');

        await act(async () => user.type(search, '  PNG  '));
        expect(output.querySelectorAll('tbody tr')).toHaveLength(1);
        expect(output.querySelector('tbody [aria-haspopup="dialog"]')?.textContent).toContain('example.png');
        expect(output.querySelector('tbody')?.textContent).not.toContain('garden.jpg');

        await act(async () => user.clear(search));
        await act(async () => user.type(search, 'missing-file'));
        expect(output.querySelector('tbody')?.textContent).toContain('No files found');
        expect(output.querySelector('tbody [aria-haspopup="dialog"]')).toBeNull();

        const clear = [...output.querySelectorAll('button')].find((button) => button.textContent === 'Clear search');

        if (!clear) throw new Error('Expected empty-state recovery');

        await act(async () => user.click(clear));
        expect(search.value).toBe('');
        expect(output.querySelector('tbody')?.textContent).toContain('example.png');
        expect(output.querySelector('tbody')?.textContent).toContain('garden.jpg');
        expect(output.querySelector('tbody')?.textContent).not.toContain('No files found');
        expect(output.querySelector('tbody tr')?.textContent).toContain('example.gif');

        const sort = [...output.querySelectorAll('thead button')].find((button) => button.textContent === 'File');

        if (!sort) throw new Error('Expected file sorting');

        await act(async () => user.click(sort));
        expect(output.querySelector('tbody tr')?.textContent).toContain('garden.jpg');
        await act(async () => user.type(search, 'example'));
        expect(output.querySelector('tbody tr')?.textContent).toContain('example.yaml');
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
        expect(output.querySelector('tbody [aria-haspopup="dialog"]')?.textContent).toContain('example.gif');
        expect(output.querySelector('[data-slot="data-grid-pagination"]')?.textContent).toContain('1 - 1 of 1');

        await act(async () => user.clear(search));
        expect(output.querySelector('[aria-label="Go to page 1"]')?.getAttribute('aria-current')).toBe('page');
        expect(output.querySelector('tbody')?.textContent).toContain('example.gif');
        expect(output.querySelectorAll('tbody tr')).toHaveLength(5);
    });
});

it('wires filtered file rows to scoped previews with their own asset path and title without eager loading', async () => {
    const user = userEvent.setup();
    const request = vi.fn(async (_path: string, _options?: { binary?: boolean }) => new Blob(['sample']));

    await withMounted(
        <RequestContext value={request}>
            <List />
        </RequestContext>,
        async (output) => {
            expect(request).not.toHaveBeenCalled();
            const search = output.querySelector<HTMLInputElement>('input[aria-label="Search files"]');

            if (!search) throw new Error('Expected file search');

            for (const filename of ['garden.jpg', 'example.pdf', 'example.tsx']) {
                await act(async () => user.clear(search));
                await act(async () => user.type(search, filename));
                const attachment = output.querySelector<HTMLButtonElement>('tbody [aria-haspopup="dialog"]');

                if (!attachment) throw new Error(`Expected attachment for ${filename}`);

                expect(attachment.textContent).toContain(filename);
                const calls = request.mock.calls.length;
                await act(async () => user.click(attachment));
                expect(request).toHaveBeenCalledTimes(calls + 1);
                expect(request).toHaveBeenLastCalledWith(`/assets/${filename}`, { binary: true });
                expect(document.querySelector('[role="dialog"]')?.textContent).toContain(filename);
                await act(async () => user.keyboard('{Escape}'));
            }
        }
    );
});

it('switches the shipped usage period with keyboard controls and clears stale readouts when data is empty', async () => {
    const user = userEvent.setup();

    const data = Array.from({ length: 30 }, (_, index) => ({
        date: `2026-10-${String(index + 1).padStart(2, '0')}`,
        claude: (index + 1) * 100000,
        gpt: (index + 1) * 80000,
        gemini: (index + 1) * 60000
    }));
    const analytics = { ...analyticsFixture, usage: data };
    const modelBindings = {
        ...bindings,
        useApi: (path: string) => [path === '/assets/analytics.json' ? analytics : geographyFixture]
    };
    const modelModule = { exports: {} };
    const modelCode = transform(modelSource, {
        transforms: ['jsx', 'imports'],
        jsxRuntime: 'classic',
        jsxPragma: '__jsx',
        jsxFragmentPragma: 'Fragment',
        production: true
    }).code;

    // oxlint-disable-next-line typescript/no-implied-eval -- Exercise the repository-owned starter View with scoped data bindings.
    const evaluateModels = new Function(
        'module',
        'exports',
        ...Object.keys(modelBindings),
        `${modelCode}\nreturn module.exports.default;`
    );
    const Models = evaluateModels(
        modelModule,
        modelModule.exports,
        ...Object.values(modelBindings)
    ) as React.ComponentType;

    const bounds = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
        this: HTMLElement
    ) {
        return this.classList.contains('recharts-responsive-container') ? new DOMRect(0, 0, 1040, 320) : new DOMRect();
    });

    try {
        await withMounted(<Models />, async (output) => {
            const usageCard = output
                .querySelector('[data-slot="card-header"] [role="group"][aria-label="Usage period"]')
                ?.closest('[data-slot="card"]');

            if (!usageCard) throw new Error('Expected model usage card');

            await vi.waitFor(() =>
                expect(usageCard.querySelector('[data-slot="chart"]')?.textContent).toContain('10-01')
            );
            expect(usageCard.querySelector('[data-slot="chart-legend"]')?.textContent).toContain('Claude3M');

            const option = [...usageCard.querySelectorAll<HTMLButtonElement>('button')].find(
                (item) => item.textContent === 'Last 7 days'
            );

            if (!option) throw new Error('Expected seven-day control');

            await act(async () => user.click(option));
            expect(option.getAttribute('aria-pressed')).toBe('true');
            await vi.waitFor(() =>
                expect(usageCard.querySelector('[data-slot="chart"]')?.textContent).toContain('10-24')
            );
            expect(usageCard.querySelector('[data-slot="chart"]')?.textContent).not.toContain('10-01');
            option.focus();
            await act(async () => user.keyboard('{Tab}{Enter}'));
            expect(usageCard.querySelector('button[aria-pressed="true"]')?.textContent).toBe('Last 30 days');
            await vi.waitFor(() =>
                expect(usageCard.querySelector('[data-slot="chart"]')?.textContent).toContain('10-01')
            );
            analytics.usage = [];
            await act(async () => user.click(option));
            expect(usageCard.querySelector('[role="status"]')?.textContent).toBe('No data');
            expect(usageCard.querySelector('[data-slot="chart-legend"]')?.textContent).toBe('Claude—GPT—Gemini—');
        });
    } finally {
        bounds.mockRestore();
    }
});
