// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { ModelDirectory } from '@/components/custom/model-directory';

it('retains bookmarks across pages without opening the model when a bookmark or link is clicked', async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, 'open').mockReturnValue(null);

    try {
        await withMounted(<ModelDirectory />, async (output) => {
            const bookmark = output.querySelector<HTMLButtonElement>('button[aria-label="Save GPT-4o"]');
            const pageTwo = output.querySelector<HTMLButtonElement>('button[aria-label="Go to page 2"]');

            if (!bookmark || !pageTwo) throw new Error('Expected directory controls');

            await act(async () => user.click(bookmark));
            expect(bookmark.getAttribute('aria-pressed')).toBe('true');
            expect(open).not.toHaveBeenCalled();
            await act(async () => user.click(pageTwo));

            const pageOne = output.querySelector<HTMLButtonElement>('button[aria-label="Go to page 1"]');

            if (!pageOne) throw new Error('Expected first page control');

            await act(async () => user.click(pageOne));
            expect(output.querySelector('button[aria-label="Save GPT-4o"]')?.getAttribute('aria-pressed')).toBe('true');

            const link = output.querySelector<HTMLAnchorElement>('tbody a');
            const context = output.querySelector<HTMLTableCellElement>('tbody tr td:nth-child(3)');

            if (!link || !context) throw new Error('Expected model link and context cell');

            // Leave external navigation to the browser without issuing a network request in the test.
            link.addEventListener('click', (event) => event.preventDefault(), { once: true });
            await act(async () => user.click(link));
            expect(open).not.toHaveBeenCalled();
            await act(async () => user.click(context));
            expect(open).toHaveBeenCalledExactlyOnceWith(
                'https://openai.com/index/hello-gpt-4o/',
                '_blank',
                'noopener,noreferrer'
            );
        });
    } finally {
        open.mockRestore();
    }
});
