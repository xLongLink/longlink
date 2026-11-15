// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { act, useState } from 'react';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';
import { Text } from '@/components/longlink/display/text';

it('keeps absent children empty and preserves nested text without adding button semantics', () => {
    const empty = renderStatic(<Text />);

    const output = renderStatic(
        <Text className="text-5xl font-semibold tracking-tight">
            <em>Current</em> status
        </Text>
    );

    expect(empty.querySelector('span')?.textContent).toBe('');
    expect(output.querySelector('span em')?.textContent).toBe('Current');
    expect(output.querySelector('span')?.textContent).toBe('Current status');
    expect(output.querySelector('button, [role="button"], [tabindex]')).toBeNull();
});

it('preserves a labelled live status when its content changes', async () => {
    const user = userEvent.setup();

    function Status() {
        const [detail, setDetail] = useState('Original detail');

        return (
            <>
                <span id="status-label">Publication status</span>
                <Text
                    id="publication-status"
                    role="status"
                    aria-live="polite"
                    aria-labelledby="status-label"
                    data-publication="draft"
                    className="publication-status"
                    style={{ maxWidth: 80 }}
                    maxLines={1}
                >
                    {detail}
                </Text>
                <button onClick={() => setDetail('Updated long detail')}>Update status</button>
            </>
        );
    }

    await withMounted(<Status />, async (output) => {
        const text = output.querySelector('span[role="status"]');
        const update = output.querySelector('button');

        if (!(text instanceof HTMLElement) || !update) throw new Error('Missing live status controls');
        await act(async () => user.click(update));

        expect(output.querySelector('[data-slot="text"]')).toBe(text);
        expect(text.textContent).toBe('Updated long detail');
        expect(text.id).toBe('publication-status');
        expect(text.getAttribute('aria-live')).toBe('polite');
        expect(text.getAttribute('aria-labelledby')).toBe('status-label');
        expect(document.getElementById('status-label')?.textContent).toBe('Publication status');
        expect(text.dataset.publication).toBe('draft');
        expect(text.classList.contains('publication-status')).toBe(true);
        expect(text.style.maxWidth).toBe('80px');
        expect(text.hasAttribute('tabindex')).toBe(false);
    });
});

it('updates and clears truncation without replacing the text element', async () => {
    const user = userEvent.setup();

    function Detail() {
        const [maxLines, setMaxLines] = useState(1);

        return (
            <>
                <Text maxLines={maxLines}>Long publication details</Text>
                <button onClick={() => setMaxLines(maxLines === 1 ? 2 : 0)}>Expand details</button>
            </>
        );
    }

    await withMounted(<Detail />, async (output) => {
        const text = output.querySelector('span');
        const expand = output.querySelector('button');

        if (!text || !expand) throw new Error('Missing detail controls');
        expect(text.classList.contains('truncate')).toBe(true);
        await act(async () => user.click(expand));

        expect(output.querySelector('span')).toBe(text);
        expect(text.classList.contains('truncate')).toBe(false);
        expect(text.classList.contains('line-clamp-1')).toBe(true);
        await act(async () => user.click(expand));

        expect(output.querySelector('span')).toBe(text);
        expect(text.classList.contains('line-clamp-1')).toBe(false);
        expect(text.textContent).toBe('Long publication details');
    });
});

it('keeps nested links keyboard accessible without adding a text tab stop', async () => {
    const user = userEvent.setup();

    await withMounted(
        <Text maxLines={1}>
            <a href="#details">Details</a>
        </Text>,
        async (output) => {
            const text = output.querySelector('[data-slot="text"]');

            if (!(text instanceof HTMLElement)) throw new Error('Missing text');

            await act(async () => await user.tab());

            expect(document.activeElement).toBe(text.querySelector('a'));
            expect(text.hasAttribute('tabindex')).toBe(false);
        }
    );
});
