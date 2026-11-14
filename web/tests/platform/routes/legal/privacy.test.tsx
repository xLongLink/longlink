// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../../render';
import Privacy from '@/platform/routes/legal/privacy';

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

                const scroll = vi.fn();
                Object.defineProperty(heading, 'scrollIntoView', { configurable: true, value: scroll });

                const modifiedClick = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });

                await act(async () => link.dispatchEvent(modifiedClick));
                expect(modifiedClick.defaultPrevented).toBe(false);
                expect(scroll).not.toHaveBeenCalled();

                await act(async () => link.click());
                expect(window.location.hash).toBe('#your-rights');
                expect(document.activeElement).toBe(heading);
                expect(scroll).toHaveBeenCalledOnce();
                expect(link.getAttribute('aria-current')).toBe('location');

                await act(async () => link.focus());
                expect(heading.hasAttribute('tabindex')).toBe(false);
            },
            '/privacy/'
        );
    } finally {
        window.history.replaceState(originalState, '', originalUrl);
    }
});
