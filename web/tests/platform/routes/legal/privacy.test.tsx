// @vitest-environment happy-dom
import { act } from 'react';
import { withMounted } from '../../../render';
import { it, expect, vi, afterEach } from 'vitest';
import Privacy from '@/platform/routes/legal/privacy';

afterEach(() => vi.restoreAllMocks());

it('moves outline navigation to the published section heading without adding a permanent tab stop', async () => {
    const originalUrl = window.location.href;
    const originalState: unknown = window.history.state;

    try {
        await withMounted(
            <Privacy />,
            async (output) => {
                const link = output.querySelector<HTMLAnchorElement>('a[href="#your-rights"]');
                const heading = output.querySelector<HTMLHeadingElement>('h2#your-rights');

                if (!link || !heading) throw new Error('Missing privacy outline destination');

                const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
                vi.spyOn(heading, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 500, 0, 0));
                heading.style.scrollMarginTop = '24px';

                const modifiedClick = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });

                await act(async () => link.dispatchEvent(modifiedClick));
                expect(modifiedClick.defaultPrevented).toBe(false);
                expect(scroll).not.toHaveBeenCalled();

                await act(async () => link.click());
                expect(window.location.hash).toBe('#your-rights');
                expect(document.activeElement).toBe(heading);
                expect(scroll).toHaveBeenCalledOnce();
                expect(scroll).toHaveBeenCalledWith({ top: 476, behavior: 'smooth' });
                expect(link.getAttribute('aria-current')).toBe('location');

                await act(async () => link.focus());
                expect(document.activeElement).toBe(link);
                expect(heading.tabIndex).toBe(-1);
            },
            '/privacy/'
        );
    } finally {
        window.history.replaceState(originalState, '', originalUrl);
    }
});
