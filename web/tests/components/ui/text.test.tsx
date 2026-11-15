// @vitest-environment happy-dom
import { it, expect, vi } from 'vitest';
import { Text } from '@/components/custom/text';
import { act, createRef, useState } from 'react';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';

it('keeps absent children empty and preserves nested text without adding button semantics', () => {
    const empty = renderStatic(<Text />);

    const output = renderStatic(
        <Text as="h2" className="text-5xl font-semibold tracking-tight">
            <em>Current</em> status
        </Text>
    );

    expect(empty.querySelector('span')?.textContent).toBe('');
    expect(output.querySelector('h2 em')?.textContent).toBe('Current');
    expect(output.querySelector('h2')?.textContent).toBe('Current status');
    expect(output.querySelector('button, [role="button"], [tabindex]')).toBeNull();
});

it('preserves a labelled live status and its ref while updating truncation details', async () => {
    // Layout dimensions are supplied on this node; tooltip interactions and content observation remain real.
    const user = userEvent.setup();
    const textRef = createRef<HTMLElement>();

    await withMounted(
        <>
            <span id="status-label">Publication status</span>
            <Text
                as="p"
                id="publication-status"
                role="status"
                aria-live="polite"
                aria-labelledby="status-label"
                data-publication="draft"
                className="publication-status"
                style={{ maxWidth: 80 }}
                ref={textRef}
                maxLines={1}
                hasTruncateTooltip="below"
            >
                Original detail
            </Text>
        </>,
        async (output) => {
            const paragraph = output.querySelector('p[role="status"]');

            if (!(paragraph instanceof HTMLElement)) throw new Error('Missing live status');

            Object.defineProperty(paragraph, 'offsetWidth', { configurable: true, value: 80 });
            Object.defineProperty(paragraph, 'scrollWidth', { configurable: true, value: 240 });
            await act(async () => {
                paragraph.textContent = 'Updated long detail';
            });
            await act(async () => await user.hover(paragraph));
            await vi.waitFor(() =>
                expect(document.querySelector('[data-slot="tooltip-content"]')?.textContent).toBe('Updated long detail')
            );

            expect(output.querySelector('p')).toBe(paragraph);
            expect(textRef.current).toBe(paragraph);
            expect(paragraph.id).toBe('publication-status');
            expect(paragraph.getAttribute('aria-live')).toBe('polite');
            expect(paragraph.getAttribute('aria-labelledby')).toBe('status-label');
            expect(document.getElementById('status-label')?.textContent).toBe('Publication status');
            expect(paragraph.dataset.publication).toBe('draft');
            expect(paragraph.classList.contains('publication-status')).toBe(true);
            expect(paragraph.style.maxWidth).toBe('80px');
            expect(paragraph.hasAttribute('tabindex')).toBe(false);
            expect(document.querySelector('[data-slot="tooltip-content"]')?.getAttribute('data-side')).toBe('bottom');

            await act(async () => await user.unhover(paragraph));
            Object.defineProperty(paragraph, 'scrollWidth', { configurable: true, value: 40 });
            await act(async () => {
                paragraph.textContent = 'Short';
            });
            await act(async () => await user.hover(paragraph));
            await vi.waitFor(() => expect(document.querySelector('[data-slot="tooltip-content"]')).toBeNull());
            expect(textRef.current).toBe(paragraph);
            expect(paragraph.getAttribute('aria-labelledby')).toBe('status-label');
        }
    );

    expect(textRef.current).toBeNull();
});

it('cleans up callback refs on replacement and unmount without detaching them twice', async () => {
    const user = userEvent.setup();
    const firstCleanup = vi.fn();
    const secondCleanup = vi.fn();
    const firstRef = vi.fn((_element: HTMLElement | null) => firstCleanup);
    const secondRef = vi.fn((_element: HTMLElement | null) => secondCleanup);

    function Status() {
        const [replaced, setReplaced] = useState(false);

        return (
            <>
                <Text ref={replaced ? secondRef : firstRef}>Publication status</Text>
                <button onClick={() => setReplaced(true)}>Replace ref</button>
            </>
        );
    }

    await withMounted(<Status />, async (output) => {
        const text = output.querySelector('span');
        const button = output.querySelector('button');

        if (!text || !button) throw new Error('Missing status controls');

        expect(firstRef).toHaveBeenCalledExactlyOnceWith(text);
        expect(firstCleanup).not.toHaveBeenCalled();

        await act(async () => await user.click(button));

        expect(output.querySelector('span')).toBe(text);
        expect(firstCleanup).toHaveBeenCalledOnce();
        expect(firstRef).toHaveBeenCalledExactlyOnceWith(text);
        expect(secondRef).toHaveBeenCalledExactlyOnceWith(text);
        expect(secondCleanup).not.toHaveBeenCalled();
    });

    expect(firstCleanup).toHaveBeenCalledOnce();
    expect(secondCleanup).toHaveBeenCalledOnce();
    expect(secondRef).toHaveBeenCalledOnce();
});

it('clips text without exposing a tooltip when truncation details are disabled', async () => {
    const user = userEvent.setup();
    await withMounted(
        <Text maxLines={1} hasTruncateTooltip={false}>
            Private detail
        </Text>,
        async (output) => {
            const text = output.querySelector('span');

            if (!(text instanceof HTMLElement)) throw new Error('Missing text');

            Object.defineProperty(text, 'offsetWidth', { value: 20 });
            Object.defineProperty(text, 'scrollWidth', { value: 200 });
            await act(async () => await user.hover(text));

            expect(document.querySelector('[data-slot="tooltip-content"]')).toBeNull();
            expect(text.hasAttribute('aria-describedby')).toBe(false);
        }
    );
});

it('keeps nested links keyboard accessible without adding a text tab stop', async () => {
    const user = userEvent.setup();

    await withMounted(
        <Text as="p" maxLines={1}>
            <a href="#details">Details</a>
        </Text>,
        async (output) => {
            const text = output.querySelector('p');

            if (!text) throw new Error('Missing text');

            Object.defineProperty(text, 'offsetWidth', { value: 20 });
            Object.defineProperty(text, 'scrollWidth', { value: 200 });
            await act(async () => {
                text.append(' additional truncated detail');
            });
            await act(async () => await user.tab());

            expect(document.activeElement).toBe(text.querySelector('a'));
            expect(text.hasAttribute('tabindex')).toBe(false);
            await vi.waitFor(() =>
                expect(document.querySelector('[data-slot="tooltip-content"]')?.textContent).toBe(
                    'Details additional truncated detail'
                )
            );
            await act(async () => user.keyboard('{Escape}'));
            await vi.waitFor(() => expect(document.querySelector('[data-slot="tooltip-content"]')).toBeNull());
            expect(document.activeElement).toBe(text.querySelector('a'));
        }
    );
});

it('uses vertical content geometry for multiline overflow and removes details when the content fits', async () => {
    // Supply only unrendered layout geometry; the range, observers, and tooltip stay real.
    const user = userEvent.setup();
    const createRange = document.createRange.bind(document);
    let contentHeight = 80;

    const ranges = vi.spyOn(document, 'createRange').mockImplementation(() => {
        const range = createRange();
        Object.defineProperty(range, 'getBoundingClientRect', { value: () => new DOMRect(0, 0, 80, contentHeight) });

        return range;
    });

    try {
        await withMounted(
            <Text as="p" maxLines={2}>
                Initial content
            </Text>,
            async (output) => {
                const paragraph = output.querySelector('p');

                if (!paragraph) throw new Error('Missing paragraph');

                Object.defineProperty(paragraph, 'offsetWidth', { value: 100 });
                Object.defineProperty(paragraph, 'scrollWidth', { value: 80 });
                Object.defineProperty(paragraph, 'offsetHeight', { value: 40 });
                Object.defineProperty(paragraph, 'scrollHeight', { value: 40 });
                await act(async () => {
                    paragraph.textContent = 'Full detail extending beyond two lines';
                });
                await act(async () => {
                    await user.hover(paragraph);
                    await new Promise((resolve) => setTimeout(resolve, 250));
                });

                expect(document.querySelector('[data-slot="tooltip-content"]')?.textContent).toBe(
                    'Full detail extending beyond two lines'
                );

                contentHeight = 40;
                await act(async () => {
                    paragraph.textContent = 'Two lines that fit';
                });
                await vi.waitFor(() => expect(document.querySelector('[data-slot="tooltip-content"]')).toBeNull());
                expect(output.querySelector('p')).toBe(paragraph);
                expect(paragraph.hasAttribute('aria-describedby')).toBe(false);
            }
        );
    } finally {
        ranges.mockRestore();
    }
});
