// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { act, useState } from 'react';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { Text } from '@/components/longlink/display/text';

it('updates and clears truncation without replacing the text element', async () => {
    const user = userEvent.setup();

    function Detail() {
        const [maxLines, setMaxLines] = useState(1);

        return (
            <>
                <Text maxLines={maxLines} size="sm" tone="muted" weight="medium" align="end">
                    Long publication details
                </Text>
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
