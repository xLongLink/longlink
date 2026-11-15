import * as icons from '@/lib/icons';
// @vitest-environment happy-dom
import { act, createRef } from 'react';
import { withMounted } from '../../render';
import { Icon } from '@/components/longlink/icon';
import { it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
    vi.restoreAllMocks();
});

it('shares glyph loading while preserving decorative slots', async () => {
    // A delayed glyph must not duplicate requests or remove either action's icon slot.
    let release: () => void = () => {};

    const pending = new Promise<void>((resolve) => {
        release = resolve;
    });

    const originalLoad = icons.load;
    const load = vi.spyOn(icons, 'load').mockImplementation(async (name: string) => {
        await pending;

        return originalLoad(name);
    });

    const iconRef = createRef<SVGSVGElement>();

    try {
        await withMounted(
            <>
                <Icon icon="search" size="sm" />
                <Icon ref={iconRef} icon="search" aria-hidden={false} aria-label="Search" role="img" />
            </>,
            async (output) => {
                expect(load).toHaveBeenCalledExactlyOnceWith('search');
                expect(output.querySelectorAll('svg')).toHaveLength(2);
                expect(output.querySelector('svg path')).toBeNull();
                expect(iconRef.current).toBe(output.querySelector('[data-slot="icon"][role="img"]'));

                await act(async () => {
                    release();
                    await pending;
                });
                await vi.waitFor(() => expect(output.querySelectorAll('svg circle')).toHaveLength(2));
                expect(load).toHaveBeenCalledTimes(1);
                expect(
                    Array.from(output.querySelectorAll('svg'), (svg) => [
                        svg.dataset.size,
                        svg.getAttribute('aria-hidden')
                    ])
                ).toEqual([
                    ['sm', 'true'],
                    ['md', 'false']
                ]);
                expect(iconRef.current).toBe(output.querySelector('[data-slot="icon"][role="img"]'));
                expect(iconRef.current?.getAttribute('aria-label')).toBe('Search');
            }
        );
    } finally {
        release();
    }
});

it('keeps a decorative warning glyph after deferred loading fails', async () => {
    // A network failure must leave a stable fallback, not an unlabeled image or a broken action.
    vi.spyOn(icons, 'load').mockRejectedValue(new Error('Icon unavailable'));

    await withMounted(<Icon icon="search" size="md" />, async (output) => {
        await vi.waitFor(
            () =>
                expect(output.querySelector('svg')?.classList.contains('lucide-triangle-exclamation-point')).toBe(true),
            { timeout: 3000 }
        );
        expect(output.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
        expect(output.querySelector('svg')?.getAttribute('data-size')).toBe('md');
    });
});
