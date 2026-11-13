import { it, expect, vi } from 'vitest';
import { hydrateRoot } from 'react-dom/client';
// @vitest-environment happy-dom
import { act, StrictMode, useState } from 'react';
import { renderToString } from 'react-dom/server';
import { renderStatic, withMounted } from '../../render';
import { PageError, PageLoading } from '@/components/utils';
import { EmptyState } from '@/components/custom/empty-state';

it('retains heading semantics and keeps the server-rendered announcement silent', () => {
    // Empty results keep their place in the document outline after the rendering primitive changes.
    const output = renderStatic(<EmptyState title="No matching orders" isCompact />);

    expect(output.querySelector('h3')?.textContent).toBe('No matching orders');
    expect(output.querySelector('[role="status"]')?.textContent).toBe('');
});

it('announces changed empty results within their mounted region', async () => {
    // The local channel remains inside modal and hidden-region accessibility boundaries.
    function Results() {
        const [title, setTitle] = useState('No matching orders');

        return (
            <>
                <EmptyState title={title} />
                <button type="button" onClick={() => setTitle('No archived orders')}>
                    Archive
                </button>
            </>
        );
    }

    await withMounted(<Results />, async (output) => {
        await act(async () => output.querySelector('button')?.click());
        await vi.waitFor(() => expect(output.querySelector('[role="status"]')?.textContent).toBe('No archived orders'));
        expect(output.querySelector('h3')?.textContent).toBe('No archived orders');
    });
});

it('leaves hydrated initial content silent until the result message changes', async () => {
    const output = document.createElement('section');

    const initial = (
        <StrictMode>
            <EmptyState title="No matching orders" />
        </StrictMode>
    );

    output.innerHTML = renderToString(initial);
    document.body.append(output);
    const root = hydrateRoot(output, initial);

    try {
        await act(async () => {});
        expect(output.querySelector('[role="status"]')?.textContent).toBe('');
        await act(async () =>
            root.render(
                <StrictMode>
                    <EmptyState title="No archived orders" />
                </StrictMode>
            )
        );
        await vi.waitFor(() => expect(output.querySelector('[role="status"]')?.textContent).toBe('No archived orders'));
    } finally {
        await act(async () => root.unmount());
        output.remove();
    }
});

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

it('retains a late announcement when React replays its mounting effects', async () => {
    await withMounted(
        <StrictMode>
            <EmptyState title="No matching orders" />
        </StrictMode>,
        async (output) => {
            await vi.waitFor(() =>
                expect(output.querySelector('[role="status"]')?.textContent).toBe('No matching orders')
            );
        }
    );
});

it('suppresses hidden results and announcements already owned by an enclosing live region', async () => {
    function Results() {
        const [hidden, setHidden] = useState(true);
        const [owned, setOwned] = useState(false);
        const [title, setTitle] = useState('No matching orders');

        return (
            <>
                <div hidden={hidden} role={owned ? 'status' : undefined}>
                    <EmptyState title={title} />
                </div>
                <button type="button" onClick={() => setHidden(false)}>
                    Show results
                </button>
                <button type="button" onClick={() => setOwned(true)}>
                    Own announcements
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setOwned(true);
                        setTitle('No archived orders');
                    }}
                >
                    Archive
                </button>
            </>
        );
    }

    await withMounted(<Results />, async (output) => {
        const channel = output.querySelector('.sr-only');
        const buttons = output.querySelectorAll('button');

        expect(channel?.textContent).toBe('');
        await act(async () => buttons[0].click());
        await vi.waitFor(() => expect(channel?.textContent).toBe('No matching orders'));
        await act(async () => buttons[1].click());
        expect(channel?.textContent).toBe('');
        expect(output.querySelector('h3')?.textContent).toBe('No matching orders');
        await act(async () => buttons[2].click());
        expect(output.querySelector('h3')?.textContent).toBe('No archived orders');
        expect(channel?.textContent).toBe('');
    });
});
