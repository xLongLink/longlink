// @vitest-environment happy-dom
import { act } from 'react';
import * as icons from '@/lib/icons';
import { it, expect, vi } from 'vitest';
import { Icon } from '@/components/ui/Icon';
import { renderStatic, withMounted } from '../../render';
import { IconRequestContext } from '@/components/ui/contexts';

it('renders bundled aliases without requesting an external glyph', () => {
    // Act
    const output = renderStatic(<Icon icon="search" size="md" />);

    // Assert
    expect(output.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(output.querySelector('svg path')).not.toBeNull();
});

it('shares deferred glyph loading while preserving decorative slots and explicit alias bypass', async () => {
    // A delayed glyph must not duplicate requests or remove either action's icon slot.
    let release: () => void = () => {};

    const pending = new Promise<void>((resolve) => {
        release = resolve;
    });

    const load = vi.fn(async (name: string) => {
        await pending;

        return icons.load(name);
    });

    try {
        await withMounted(
            <IconRequestContext value={load}>
                <Icon icon="lucide:search" size="sm" />
                <Icon icon="lucide:search" size="lg" />
            </IconRequestContext>,
            async (output) => {
                expect(load).toHaveBeenCalledExactlyOnceWith('search');
                expect(output.querySelectorAll('svg')).toHaveLength(2);
                expect(output.querySelector('svg path')).toBeNull();

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
                    ['lg', 'true']
                ]);
            }
        );
    } finally {
        release();
    }
});

it('keeps a decorative warning glyph after deferred loading fails', async () => {
    // A network failure must leave a stable fallback, not an unlabeled image or a broken action.
    const load = vi.fn(async () => {
        throw new Error('Icon unavailable');
    });

    await withMounted(
        <IconRequestContext value={load}>
            <Icon icon="lucide:search" size="md" />
        </IconRequestContext>,
        async (output) => {
            await vi.waitFor(
                () => expect(output.querySelector('svg')?.classList.contains('lucide-alert-triangle')).toBe(true),
                { timeout: 3000 }
            );
            expect(output.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
            expect(output.querySelector('svg')?.getAttribute('data-size')).toBe('md');
        }
    );
});
