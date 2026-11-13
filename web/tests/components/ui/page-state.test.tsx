// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { PageError, PageLoading } from '@/components/utils';

it('announces loading and failure transitions without repeating the hydrated initial message', async () => {
    const output = document.createElement('section');
    const initial = <PageLoading label="Preparing View" />;

    output.innerHTML = renderToString(initial);
    document.body.append(output);
    const root = hydrateRoot(output, initial);

    try {
        await act(async () => {});
        expect(output.querySelector('[role="status"]')?.textContent).toBe('');
        await act(async () => root.render(<PageLoading label="Loading View" />));
        await vi.waitFor(() => expect(output.querySelector('[role="status"]')?.textContent).toBe('Loading View'));
        const labelId = output.querySelector('[role="progressbar"]')?.getAttribute('aria-labelledby');
        expect(output.querySelector(`[id="${labelId}"]`)?.textContent).toBe('Loading View');
        await act(async () =>
            root.render(<PageError title="Unable to load this View" description="Runtime assets are unavailable." />)
        );
        await vi.waitFor(() =>
            expect(output.querySelector('[role="status"]')?.textContent).toBe(
                'Unable to load this View Runtime assets are unavailable.'
            )
        );
        expect(output.querySelector('[role="progressbar"]')).toBeNull();
        await act(async () =>
            root.render(
                <PageError
                    title="Unable to load this View"
                    description="The secure connection could not be established."
                />
            )
        );
        await vi.waitFor(() =>
            expect(output.querySelector('[role="status"]')?.textContent).toBe(
                'Unable to load this View The secure connection could not be established.'
            )
        );
        expect(output.querySelector('h1')?.textContent).toBe('Unable to load this View');
        expect(output.querySelector('p')?.textContent).toBe('The secure connection could not be established.');
        expect(output.textContent).not.toContain('Runtime assets are unavailable.');
    } finally {
        await act(async () => root.unmount());
        output.remove();
    }
});
